"""
retriever.py — Query ChromaDB for the most relevant chunks using cosine similarity.
Downloads chroma_db from S3 if not available locally.
"""

import os
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer
from rich.console import Console

from utils import load_config, print_sources, download_chroma_from_s3

console = Console()


def retrieve(
    query: str,
    config_path: str = "config.yaml",
    show_sources: bool = True,
) -> list[tuple[str, str, float]]:
    """Find the most relevant chunks for a query.

    Args:
        query: user question string
        config_path: path to config.yaml
        show_sources: whether to print the source table

    Returns:
        list of (chunk_text, source_file, similarity_score)
    """
    config = load_config(config_path)

    embedding_model_name = config["embeddings"]["model"]
    top_k = config["retrieval"]["top_k"]
    persist_dir = os.getenv("CHROMA_PERSIST_DIR", config["chromadb"]["persist_directory"])
    collection_name = config["chromadb"]["collection_name"]

    # If ChromaDB not found locally, try downloading from S3
    if not Path(persist_dir).exists():
        console.print("[yellow]ChromaDB not found locally — attempting download from S3...[/yellow]")
        if not download_chroma_from_s3(local_dir=persist_dir):
            console.print(
                "[red]ChromaDB not found locally or in S3. Run [bold]python src/ingest.py[/bold] first.[/red]"
            )
            return []

    client = chromadb.PersistentClient(path=persist_dir)

    try:
        collection = client.get_collection(name=collection_name)
    except Exception:
        console.print(
            f"[red]Collection '{collection_name}' not found. Run [bold]python src/ingest.py[/bold] first.[/red]"
        )
        return []

    model = SentenceTransformer(embedding_model_name)
    query_embedding = model.encode([query])[0].tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    chunks = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    sources = [
        (chunk, meta["source"], 1 - dist)
        for chunk, meta, dist in zip(chunks, metadatas, distances)
    ]

    if show_sources:
        console.print("\n[bold]Retrieved chunks:[/bold]")
        print_sources(sources)

    return sources


if __name__ == "__main__":
    import sys
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "What is CrashLoopBackOff?"
    results = retrieve(query)
    if not results:
        console.print("[yellow]No results found.[/yellow]")
