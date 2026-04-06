import uuid
from typing import Any
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.config import get_settings


class VectorService:
    def __init__(self):
        self.settings = get_settings()
        self.client = self._create_client()
        self._init_collections()

    def _create_client(self) -> chromadb.ClientAPI:
        try:
            client = chromadb.HttpClient(
                host=self.settings.chroma_host,
                port=self.settings.chroma_port,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            # Test connection
            client.heartbeat()
            return client
        except Exception:
            # Fallback to in-process ephemeral client
            return chromadb.Client(ChromaSettings(anonymized_telemetry=False))

    def _init_collections(self):
        try:
            self.docs_collection = self.client.get_or_create_collection(
                name="devops_docs",
                metadata={"hnsw:space": "cosine"},
            )
            self.logs_collection = self.client.get_or_create_collection(
                name="logs",
                metadata={"hnsw:space": "cosine"},
            )
        except Exception as e:
            print(f"[VectorService] Warning: could not init collections: {e}")
            self.docs_collection = None
            self.logs_collection = None

    def search_docs(self, query: str, n_results: int = 5) -> list[dict[str, Any]]:
        if self.docs_collection is None:
            return []
        try:
            results = self.docs_collection.query(
                query_texts=[query],
                n_results=min(n_results, max(self.docs_collection.count(), 1)),
            )
            return self._format_results(results)
        except Exception as e:
            print(f"[VectorService] search_docs error: {e}")
            return []

    def search_logs(self, query: str, n_results: int = 10) -> list[dict[str, Any]]:
        if self.logs_collection is None:
            return []
        try:
            count = self.logs_collection.count()
            if count == 0:
                return []
            results = self.logs_collection.query(
                query_texts=[query],
                n_results=min(n_results, count),
            )
            return self._format_results(results)
        except Exception as e:
            print(f"[VectorService] search_logs error: {e}")
            return []

    def ingest_docs(self, docs: list[dict[str, Any]]) -> None:
        if self.docs_collection is None:
            return
        ids = [d.get("id", str(uuid.uuid4())) for d in docs]
        documents = [d.get("document", "") for d in docs]
        metadatas = [d.get("metadata", {}) for d in docs]
        self.docs_collection.upsert(ids=ids, documents=documents, metadatas=metadatas)

    def ingest_logs(self, logs: list[dict[str, Any]]) -> None:
        if self.logs_collection is None:
            return
        ids = [str(uuid.uuid4()) for _ in logs]
        documents = [
            f"[{l.get('severity', 'INFO')}] {l.get('service', 'unknown')}: {l.get('message', '')}"
            for l in logs
        ]
        metadatas = [
            {
                "timestamp": l.get("timestamp", ""),
                "severity": l.get("severity", "INFO"),
                "service": l.get("service", "unknown"),
                "message": l.get("message", ""),
            }
            for l in logs
        ]
        self.logs_collection.upsert(ids=ids, documents=documents, metadatas=metadatas)

    def _format_results(self, results: dict) -> list[dict[str, Any]]:
        formatted = []
        if not results or not results.get("documents"):
            return formatted
        documents = results["documents"][0] if results["documents"] else []
        metadatas = results.get("metadatas", [[]])[0] or []
        distances = results.get("distances", [[]])[0] or []
        for i, doc in enumerate(documents):
            entry = {
                "document": doc,
                "metadata": metadatas[i] if i < len(metadatas) else {},
                "score": 1.0 - (distances[i] if i < len(distances) else 0.0),
            }
            formatted.append(entry)
        return formatted
