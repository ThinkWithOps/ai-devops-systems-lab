import os
import shutil
import zipfile
from pathlib import Path

import boto3
import yaml
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import box

console = Console()


def load_config(config_path: str = "config.yaml") -> dict:
    path = Path(config_path)
    if not path.exists():
        path = Path(__file__).parent.parent / config_path
    with open(path, "r") as f:
        return yaml.safe_load(f)


def print_banner():
    console.print(
        Panel.fit(
            "[bold cyan]DevOps RAG System[/bold cyan]\n[dim]Groq + ChromaDB + S3 — No Frameworks[/dim]",
            border_style="cyan",
            padding=(1, 4),
        )
    )


def print_sources(sources: list[tuple[str, str, float]]):
    if not sources:
        return

    table = Table(
        title="Sources Used",
        box=box.ROUNDED,
        border_style="dim",
        show_lines=True,
    )
    table.add_column("#", style="dim", width=3)
    table.add_column("Source File", style="cyan")
    table.add_column("Score", style="green", width=8)
    table.add_column("Preview", style="white", max_width=60)

    for i, (chunk_text, source_file, score) in enumerate(sources, 1):
        preview = chunk_text[:120].replace("\n", " ").strip()
        if len(chunk_text) > 120:
            preview += "..."
        table.add_row(str(i), source_file, f"{score:.3f}", preview)

    console.print(table)


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    if len(text) <= chunk_size:
        return [text.strip()] if text.strip() else []

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = end - overlap

    return chunks


# ── S3 sync helpers ───────────────────────────────────────────────────────────

def get_s3_bucket() -> str:
    """Get S3 bucket name from env var."""
    bucket = os.getenv("CHROMA_S3_BUCKET", "")
    if not bucket:
        raise ValueError("CHROMA_S3_BUCKET environment variable not set.")
    return bucket


def upload_chroma_to_s3(local_dir: str = "./chroma_db", s3_prefix: str = "chroma_db/"):
    """Zip the local chroma_db directory and upload to S3."""
    bucket = get_s3_bucket()
    local_path = Path(local_dir)

    if not local_path.exists():
        console.print(f"[red]ChromaDB directory not found: {local_dir}[/red]")
        return

    zip_path = Path("/tmp/chroma_db.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in local_path.rglob("*"):
            if file.is_file():
                zf.write(file, file.relative_to(local_path.parent))

    s3 = boto3.client("s3")
    s3_key = f"{s3_prefix}chroma_db.zip"
    s3.upload_file(str(zip_path), bucket, s3_key)
    console.print(f"[green]Uploaded ChromaDB to s3://{bucket}/{s3_key}[/green]")


def download_chroma_from_s3(local_dir: str = "./chroma_db", s3_prefix: str = "chroma_db/"):
    """Download and unzip chroma_db from S3 to local directory."""
    bucket = get_s3_bucket()
    s3_key = f"{s3_prefix}chroma_db.zip"
    zip_path = Path("/tmp/chroma_db.zip")
    local_path = Path(local_dir)

    s3 = boto3.client("s3")
    try:
        s3.download_file(bucket, s3_key, str(zip_path))
    except s3.exceptions.ClientError as e:
        if e.response["Error"]["Code"] == "404":
            console.print("[yellow]No ChromaDB found in S3 yet. Run ingest first.[/yellow]")
            return False
        raise

    # Remove existing local chroma_db before extracting
    if local_path.exists():
        shutil.rmtree(local_path)

    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(local_path.parent)

    console.print(f"[green]Downloaded ChromaDB from s3://{bucket}/{s3_key}[/green]")
    return True
