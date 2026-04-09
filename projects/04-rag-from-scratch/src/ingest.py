"""
ingest.py — Load docs, chunk text, generate embeddings, store in ChromaDB.

Usage:
    python src/ingest.py
    python src/ingest.py --docs-dir /path/to/docs
"""

import argparse
import sys
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn

from utils import load_config, chunk_text, print_banner

console = Console()


def load_documents(docs_dir: str) -> list[tuple[str, str]]:
    """Load all .md and .txt files from docs directory.

    Returns:
        list of (filename, content) tuples
    """
    docs_path = Path(docs_dir)
    if not docs_path.exists():
        console.print(f"[red]Docs directory not found: {docs_dir}[/red]")
        sys.exit(1)

    documents = []
    for ext in ["*.md", "*.txt"]:
        for file_path in sorted(docs_path.glob(ext)):
            content = file_path.read_text(encoding="utf-8")
            documents.append((file_path.name, content))
            console.print(f"  [dim]Loaded:[/dim] {file_path.name} ({len(content)} chars)")

    return documents


def ingest(docs_dir: str = "docs", config_path: str = "config.yaml"):
    print_banner()
    config = load_config(config_path)

    chunk_size = config["embeddings"]["chunk_size"]
    chunk_overlap = config["embeddings"]["chunk_overlap"]
    embedding_model_name = config["embeddings"]["model"]
    persist_dir = config["chromadb"]["persist_directory"]
    collection_name = config["chromadb"]["collection_name"]

    console.print(f"\n[bold]Loading documents from [cyan]{docs_dir}[/cyan]...[/bold]")
    documents = load_documents(docs_dir)

    if not documents:
        console.print("[red]No documents found. Add .md or .txt files to the docs/ folder.[/red]")
        sys.exit(1)

    console.print(f"\n[bold]Chunking {len(documents)} document(s)...[/bold]")
    all_chunks = []
    all_ids = []
    all_metadata = []

    for filename, content in documents:
        chunks = chunk_text(content, chunk_size, chunk_overlap)
        for i, chunk in enumerate(chunks):
            all_chunks.append(chunk)
            all_ids.append(f"{filename}__chunk_{i}")
            all_metadata.append({"source": filename, "chunk_index": i})

    console.print(f"  [green]Total chunks:[/green] {len(all_chunks)}")

    console.print(f"\n[bold]Loading embedding model [cyan]{embedding_model_name}[/cyan]...[/bold]")
    model = SentenceTransformer(embedding_model_name)

    console.print(f"\n[bold]Generating embeddings for {len(all_chunks)} chunks...[/bold]")
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Embedding chunks...", total=len(all_chunks))
        embeddings = []
        batch_size = 32
        for i in range(0, len(all_chunks), batch_size):
            batch = all_chunks[i : i + batch_size]
            batch_embeddings = model.encode(batch, show_progress_bar=False)
            embeddings.extend(batch_embeddings.tolist())
            progress.advance(task, len(batch))

    console.print(f"\n[bold]Storing in ChromaDB at [cyan]{persist_dir}[/cyan]...[/bold]")
    client = chromadb.PersistentClient(path=persist_dir)

    # Clear existing collection to avoid duplicates on re-ingest
    try:
        client.delete_collection(collection_name)
        console.print(f"  [dim]Cleared existing collection '{collection_name}'[/dim]")
    except Exception:
        pass

    collection = client.create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    # ChromaDB add in batches (max 5000 per call)
    batch_size = 500
    for i in range(0, len(all_chunks), batch_size):
        collection.add(
            documents=all_chunks[i : i + batch_size],
            embeddings=embeddings[i : i + batch_size],
            ids=all_ids[i : i + batch_size],
            metadatas=all_metadata[i : i + batch_size],
        )

    console.print(
        f"\n[bold green]Ingested {len(all_chunks)} chunks from {len(documents)} document(s)[/bold green]"
    )
    console.print(f"[dim]Collection '{collection_name}' ready for queries.[/dim]\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest documents into ChromaDB")
    parser.add_argument("--docs-dir", default="docs", help="Path to docs folder")
    parser.add_argument("--config", default="config.yaml", help="Path to config.yaml")
    args = parser.parse_args()

    ingest(docs_dir=args.docs_dir, config_path=args.config)
