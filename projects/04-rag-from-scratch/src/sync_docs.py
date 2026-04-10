"""
sync_docs.py — Watch the local docs/ folder and auto-upload new/changed files to S3.

When a .md or .txt file is added or modified in docs/, it is automatically
uploaded to s3://<CHROMA_S3_BUCKET>/docs/ which triggers the Lambda ingest function.

Usage:
    python src/sync_docs.py
    python src/sync_docs.py --docs-dir /path/to/docs
"""

import argparse
import hashlib
import os
import time
from pathlib import Path

import boto3
from rich.console import Console
from rich.panel import Panel

from utils import load_config, get_s3_bucket

console = Console()

WATCH_EXTENSIONS = {".md", ".txt"}
POLL_INTERVAL = 2  # seconds between checks


def file_checksum(path: Path) -> str:
    """MD5 checksum of a file — used to detect actual content changes."""
    h = hashlib.md5()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()


def upload_file(path: Path, bucket: str, s3_prefix: str):
    """Upload a single file to S3."""
    s3_key = f"{s3_prefix}{path.name}"
    s3 = boto3.client("s3")
    s3.upload_file(str(path), bucket, s3_key)
    console.print(f"[green]Uploaded:[/green] {path.name} → s3://{bucket}/{s3_key}")


def sync_all(docs_dir: Path, bucket: str, s3_prefix: str) -> dict[str, str]:
    """Upload all existing docs and return their checksums."""
    checksums = {}
    files = [f for f in docs_dir.iterdir() if f.suffix in WATCH_EXTENSIONS and f.is_file()]

    if not files:
        console.print(f"[dim]No .md or .txt files found in {docs_dir}[/dim]")
        return checksums

    console.print(f"\n[bold]Syncing {len(files)} existing file(s) to S3...[/bold]")
    for f in files:
        upload_file(f, bucket, s3_prefix)
        checksums[str(f)] = file_checksum(f)

    return checksums


def watch(docs_dir: str = "docs", config_path: str = "config.yaml"):
    config = load_config(config_path)
    s3_prefix = config["s3"]["docs_prefix"]

    try:
        bucket = get_s3_bucket()
    except ValueError as e:
        console.print(f"[red]{e}[/red]")
        console.print("[yellow]Set CHROMA_S3_BUCKET in your .env file.[/yellow]")
        return

    docs_path = Path(docs_dir)
    if not docs_path.exists():
        console.print(f"[red]Docs directory not found: {docs_dir}[/red]")
        return

    console.print(
        Panel.fit(
            f"[bold cyan]Watching:[/bold cyan] {docs_path.resolve()}\n"
            f"[bold cyan]Uploading to:[/bold cyan] s3://{bucket}/{s3_prefix}\n"
            f"[dim]Drop any .md or .txt file into {docs_dir}/ — it uploads automatically[/dim]",
            border_style="cyan",
            padding=(1, 2),
        )
    )

    # Initial sync — upload all existing files
    checksums = sync_all(docs_path, bucket, s3_prefix)

    console.print("\n[bold green]Watching for changes... (Ctrl+C to stop)[/bold green]\n")

    try:
        while True:
            time.sleep(POLL_INTERVAL)

            for file_path in docs_path.iterdir():
                if file_path.suffix not in WATCH_EXTENSIONS or not file_path.is_file():
                    continue

                key = str(file_path)
                current_checksum = file_checksum(file_path)

                if key not in checksums:
                    console.print(f"[cyan]New file detected:[/cyan] {file_path.name}")
                    upload_file(file_path, bucket, s3_prefix)
                    checksums[key] = current_checksum

                elif checksums[key] != current_checksum:
                    console.print(f"[yellow]File changed:[/yellow] {file_path.name}")
                    upload_file(file_path, bucket, s3_prefix)
                    checksums[key] = current_checksum

    except KeyboardInterrupt:
        console.print("\n[dim]Stopped watching.[/dim]")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Watch docs/ and auto-upload to S3")
    parser.add_argument("--docs-dir", default="docs", help="Local docs folder to watch")
    parser.add_argument("--config", default="config.yaml", help="Path to config.yaml")
    args = parser.parse_args()

    watch(docs_dir=args.docs_dir, config_path=args.config)
