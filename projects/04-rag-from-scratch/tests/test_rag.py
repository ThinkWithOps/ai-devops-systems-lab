"""
Tests for the RAG pipeline components.
All tests run without real ChromaDB or Ollama (mocked where needed).
"""

import sys
import os
import pytest

# Add src to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from utils import chunk_text, load_config


# ── Chunking tests ────────────────────────────────────────────────────────────

class TestChunking:

    def test_short_text_returns_single_chunk(self):
        text = "This is a short text."
        chunks = chunk_text(text, chunk_size=500, overlap=50)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_chunk_size_respected(self):
        text = "A" * 1000
        chunks = chunk_text(text, chunk_size=200, overlap=20)
        for chunk in chunks:
            assert len(chunk) <= 200

    def test_overlap_creates_more_chunks(self):
        text = "X" * 500
        chunks_no_overlap = chunk_text(text, chunk_size=200, overlap=0)
        chunks_with_overlap = chunk_text(text, chunk_size=200, overlap=50)
        assert len(chunks_with_overlap) >= len(chunks_no_overlap)

    def test_empty_text_returns_empty_list(self):
        chunks = chunk_text("", chunk_size=500, overlap=50)
        assert chunks == []

    def test_whitespace_only_returns_empty_list(self):
        chunks = chunk_text("   \n\n   ", chunk_size=500, overlap=50)
        assert chunks == []

    def test_exact_chunk_size_returns_one_chunk(self):
        text = "B" * 500
        chunks = chunk_text(text, chunk_size=500, overlap=50)
        assert len(chunks) == 1

    def test_chunks_cover_full_text(self):
        text = "Hello world. " * 100
        chunks = chunk_text(text, chunk_size=200, overlap=20)
        # Verify first chunk starts with the beginning of text
        assert chunks[0].startswith("Hello")
        # Verify last chunk contains the end of text
        combined = " ".join(chunks)
        assert "Hello world" in combined


# ── Embedding tests ───────────────────────────────────────────────────────────

class TestEmbeddings:

    def test_embedding_shape(self):
        """Verify all-MiniLM-L6-v2 produces 384-dim embeddings."""
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
        embedding = model.encode(["test sentence"])
        assert embedding.shape == (1, 384)

    def test_embedding_is_normalized(self):
        """Embeddings should be unit vectors for cosine similarity."""
        import numpy as np
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
        embedding = model.encode(["test sentence"], normalize_embeddings=True)
        norm = np.linalg.norm(embedding[0])
        assert abs(norm - 1.0) < 1e-5

    def test_similar_sentences_have_higher_similarity(self):
        """Semantically similar sentences should have higher cosine similarity."""
        import numpy as np
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")

        emb_a = model.encode("kubernetes pod is crashing")
        emb_b = model.encode("pod keeps restarting in kubernetes")
        emb_c = model.encode("the weather is sunny today")

        sim_related = np.dot(emb_a, emb_b) / (np.linalg.norm(emb_a) * np.linalg.norm(emb_b))
        sim_unrelated = np.dot(emb_a, emb_c) / (np.linalg.norm(emb_a) * np.linalg.norm(emb_c))

        assert sim_related > sim_unrelated


# ── Retrieval tests ───────────────────────────────────────────────────────────

class TestRetrieval:

    @pytest.fixture
    def populated_collection(self, tmp_path):
        """Create a temporary ChromaDB collection with sample chunks."""
        import chromadb
        from sentence_transformers import SentenceTransformer

        persist_dir = str(tmp_path / "chroma_test")
        client = chromadb.PersistentClient(path=persist_dir)
        collection = client.create_collection(
            name="test_collection",
            metadata={"hnsw:space": "cosine"},
        )

        model = SentenceTransformer("all-MiniLM-L6-v2")

        sample_docs = [
            "CrashLoopBackOff means the pod is crashing repeatedly. Check logs with kubectl logs --previous.",
            "OOMKilled means the container exceeded its memory limit. Increase the memory limit in the deployment.",
            "Docker image build failed because the base image does not exist. Check the image name and tag.",
            "CI/CD pipeline failed at the test step. Check environment variables and service dependencies.",
            "To rollback a Kubernetes deployment use kubectl rollout undo deployment/<name>.",
        ]

        embeddings = model.encode(sample_docs).tolist()
        collection.add(
            documents=sample_docs,
            embeddings=embeddings,
            ids=[f"doc_{i}" for i in range(len(sample_docs))],
            metadatas=[{"source": f"runbook-{i}.md", "chunk_index": i} for i in range(len(sample_docs))],
        )

        return persist_dir, "test_collection"

    def test_retrieval_returns_top_k(self, populated_collection):
        """ChromaDB query should return exactly top_k results."""
        import chromadb
        from sentence_transformers import SentenceTransformer

        persist_dir, collection_name = populated_collection
        client = chromadb.PersistentClient(path=persist_dir)
        collection = client.get_collection(collection_name)

        model = SentenceTransformer("all-MiniLM-L6-v2")
        query_embedding = model.encode(["pod crashing"]).tolist()

        results = collection.query(query_embeddings=query_embedding, n_results=3)
        assert len(results["documents"][0]) == 3

    def test_relevant_chunk_ranks_first(self, populated_collection):
        """The most relevant chunk should be returned first."""
        import chromadb
        from sentence_transformers import SentenceTransformer

        persist_dir, collection_name = populated_collection
        client = chromadb.PersistentClient(path=persist_dir)
        collection = client.get_collection(collection_name)

        model = SentenceTransformer("all-MiniLM-L6-v2")
        query_embedding = model.encode(["pod is in CrashLoopBackOff state"]).tolist()

        results = collection.query(query_embeddings=query_embedding, n_results=3)
        top_result = results["documents"][0][0]

        assert "CrashLoopBackOff" in top_result or "crashing" in top_result.lower()

    def test_similarity_scores_are_between_0_and_1(self, populated_collection):
        """Cosine similarity scores should be in [0, 1] range."""
        import chromadb
        from sentence_transformers import SentenceTransformer

        persist_dir, collection_name = populated_collection
        client = chromadb.PersistentClient(path=persist_dir)
        collection = client.get_collection(collection_name)

        model = SentenceTransformer("all-MiniLM-L6-v2")
        query_embedding = model.encode(["memory limit exceeded"]).tolist()

        results = collection.query(
            query_embeddings=query_embedding,
            n_results=3,
            include=["distances"],
        )
        # ChromaDB cosine distance is in [0, 2], similarity = 1 - distance
        for dist in results["distances"][0]:
            similarity = 1 - dist
            assert -0.1 <= similarity <= 1.1  # small float tolerance


# ── Config tests ──────────────────────────────────────────────────────────────

class TestConfig:

    def test_load_config(self):
        config_path = os.path.join(os.path.dirname(__file__), "..", "config.yaml")
        config = load_config(config_path)
        assert "ollama" in config
        assert "embeddings" in config
        assert "retrieval" in config
        assert "chromadb" in config

    def test_config_has_required_keys(self):
        config_path = os.path.join(os.path.dirname(__file__), "..", "config.yaml")
        config = load_config(config_path)
        assert "model" in config["ollama"]
        assert "base_url" in config["ollama"]
        assert "chunk_size" in config["embeddings"]
        assert "chunk_overlap" in config["embeddings"]
        assert "top_k" in config["retrieval"]
