"""
ingest_sample.py — Ingest a sample public GitHub repository for demo purposes.

Usage:
    cd projects/02-ai-github-repo-explainer
    python vectorstore/ingest_sample.py

This will call the FastAPI backend's /api/repos/ingest endpoint and stream
progress to stdout. Make sure the backend is running first:
    docker-compose up -d backend chromadb
    # or: cd backend && uvicorn app.main:app --reload

Default demo repo: https://github.com/tiangolo/fastapi
"""

import json
import sys
import requests

BACKEND_URL = "http://localhost:8000"

DEMO_REPOS = [
    "https://github.com/tiangolo/fastapi",
    "https://github.com/pallets/flask",
]


def ingest_repo(repo_url: str) -> None:
    print(f"\n{'='*60}")
    print(f"Ingesting: {repo_url}")
    print(f"{'='*60}")

    try:
        with requests.post(
            f"{BACKEND_URL}/api/repos/ingest",
            json={"repo_url": repo_url},
            stream=True,
            timeout=300,
        ) as resp:
            resp.raise_for_status()

            for line in resp.iter_lines():
                if not line:
                    continue

                line_str = line.decode("utf-8") if isinstance(line, bytes) else line

                if not line_str.startswith("data: "):
                    continue

                data_str = line_str[6:].strip()
                if not data_str or data_str == "[DONE]":
                    continue

                try:
                    event = json.loads(data_str)
                    event_type = event.get("type", "")
                    message = event.get("message", "")
                    progress = event.get("progress", 0)

                    # Draw a simple progress bar
                    bar_len = 30
                    filled = int(bar_len * progress / 100)
                    bar = "█" * filled + "░" * (bar_len - filled)

                    print(f"[{bar}] {progress:3d}% — {message}")

                    if event_type == "complete":
                        print(f"\nSuccess! {event.get('chunk_count', 0)} chunks indexed from {event.get('file_count', 0)} files")
                        break
                    elif event_type == "error":
                        print(f"\nError: {message}", file=sys.stderr)
                        break

                except json.JSONDecodeError:
                    pass

    except requests.exceptions.ConnectionError:
        print(f"Error: Cannot connect to backend at {BACKEND_URL}", file=sys.stderr)
        print("Make sure the backend is running: docker-compose up -d backend chromadb", file=sys.stderr)
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Ingest a GitHub repo into ChromaDB")
    parser.add_argument(
        "--repo",
        default=DEMO_REPOS[0],
        help=f"GitHub repo URL to ingest (default: {DEMO_REPOS[0]})",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Ingest all demo repos",
    )
    args = parser.parse_args()

    if args.all:
        for repo_url in DEMO_REPOS:
            ingest_repo(repo_url)
    else:
        ingest_repo(args.repo)

    print("\nDone! Open http://localhost:3000/chat to start asking questions.")


if __name__ == "__main__":
    main()
