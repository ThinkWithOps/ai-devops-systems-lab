import logging
from typing import Optional

from app.config import get_settings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "github_repos"


class VectorService:
    def __init__(self):
        self.settings = get_settings()
        self._client = None
        self._collection = None
        self._embedding_fn = None

    def _get_embedding_function(self):
        """Lazy-load sentence-transformers embedding function for ChromaDB."""
        if self._embedding_fn is None:
            from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
            self._embedding_fn = SentenceTransformerEmbeddingFunction(
                model_name="all-MiniLM-L6-v2"
            )
        return self._embedding_fn

    def _get_client(self):
        """Get or create ChromaDB client. Tries HttpClient first, falls back to EphemeralClient."""
        if self._client is None:
            try:
                import chromadb
                self._client = chromadb.HttpClient(
                    host=self.settings.chroma_host,
                    port=self.settings.chroma_port,
                )
                # Test connection
                self._client.heartbeat()
                logger.info(f"Connected to ChromaDB at {self.settings.chroma_host}:{self.settings.chroma_port}")
            except Exception as e:
                logger.warning(f"ChromaDB HttpClient failed ({e}), using EphemeralClient")
                import chromadb
                self._client = chromadb.EphemeralClient()
        return self._client

    def get_or_create_collection(self):
        """Get or create the 'github_repos' collection."""
        if self._collection is None:
            client = self._get_client()
            self._collection = client.get_or_create_collection(
                name=COLLECTION_NAME,
                embedding_function=self._get_embedding_function(),
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    def ingest_repo(self, repo_name: str, chunks: list[dict]) -> int:
        """
        Store chunks in ChromaDB.
        Each chunk: {"text": str, "file_path": str, "chunk_index": int}
        Returns number of chunks stored.
        """
        if not chunks:
            return 0

        collection = self.get_or_create_collection()

        # Delete existing chunks for this repo before re-ingesting
        self.delete_repo(repo_name)

        # Build ids, docs, metadatas
        ids = []
        documents = []
        metadatas = []

        for chunk in chunks:
            chunk_id = f"{repo_name}::{chunk['file_path']}::{chunk['chunk_index']}"
            # ChromaDB ids must be unique strings — sanitize colons
            chunk_id = chunk_id.replace(" ", "_")
            ids.append(chunk_id)
            documents.append(chunk["text"])
            metadatas.append({
                "repo_name": repo_name,
                "file_path": chunk["file_path"],
                "chunk_index": chunk["chunk_index"],
            })

        # ChromaDB upsert in batches of 100
        batch_size = 100
        stored = 0
        for i in range(0, len(ids), batch_size):
            batch_ids = ids[i:i + batch_size]
            batch_docs = documents[i:i + batch_size]
            batch_meta = metadatas[i:i + batch_size]
            collection.upsert(ids=batch_ids, documents=batch_docs, metadatas=batch_meta)
            stored += len(batch_ids)

        logger.info(f"Stored {stored} chunks for repo '{repo_name}'")
        return stored

    def search(self, query: str, repo_name: Optional[str] = None, n_results: int = 5) -> list[dict]:
        """Search ChromaDB for relevant chunks. Optionally filter by repo_name."""
        collection = self.get_or_create_collection()

        where = None
        if repo_name:
            where = {"repo_name": {"$eq": repo_name}}

        try:
            results = collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:
            logger.error(f"ChromaDB search error: {e}")
            return []

        output = []
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for doc, meta, dist in zip(docs, metas, distances):
            output.append({
                "text": doc,
                "file_path": meta.get("file_path", ""),
                "repo_name": meta.get("repo_name", ""),
                "chunk_index": meta.get("chunk_index", 0),
                "relevance_score": round(1.0 - dist, 4),
            })

        return output

    def list_repos(self) -> list[dict]:
        """Return list of unique repos indexed in ChromaDB, with chunk counts."""
        collection = self.get_or_create_collection()

        try:
            # Get all metadatas (no limit to cover all repos, but limit to 1000 for safety)
            results = collection.get(include=["metadatas"], limit=10000)
            metas = results.get("metadatas", [])

            repo_counts: dict[str, int] = {}
            for meta in metas:
                name = meta.get("repo_name", "unknown")
                repo_counts[name] = repo_counts.get(name, 0) + 1

            return [
                {"repo_name": name, "chunk_count": count}
                for name, count in sorted(repo_counts.items())
            ]
        except Exception as e:
            logger.error(f"Failed to list repos: {e}")
            return []

    def delete_repo(self, repo_name: str) -> int:
        """Delete all chunks for a given repo. Returns number of deleted chunks."""
        collection = self.get_or_create_collection()
        try:
            # Get IDs for this repo
            results = collection.get(
                where={"repo_name": {"$eq": repo_name}},
                include=["metadatas"],
                limit=100000,
            )
            ids = results.get("ids", [])
            if ids:
                collection.delete(ids=ids)
                logger.info(f"Deleted {len(ids)} chunks for repo '{repo_name}'")
            return len(ids)
        except Exception as e:
            logger.error(f"Failed to delete repo '{repo_name}': {e}")
            return 0
