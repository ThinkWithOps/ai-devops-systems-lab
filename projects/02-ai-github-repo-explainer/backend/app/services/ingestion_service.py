import asyncio
import logging
from datetime import datetime, timezone
from typing import AsyncGenerator

from app.services.github_service import GitHubService
from app.services.vector_service import VectorService

logger = logging.getLogger(__name__)

LINES_PER_CHUNK = 100
OVERLAP_LINES = 10


def chunk_text(text: str, file_path: str) -> list[dict]:
    """Split file content into overlapping line-based chunks."""
    lines = text.splitlines()
    if not lines:
        return []

    chunks = []
    chunk_index = 0
    start = 0

    while start < len(lines):
        end = min(start + LINES_PER_CHUNK, len(lines))
        chunk_lines = lines[start:end]
        chunk_text_str = "\n".join(chunk_lines).strip()

        if chunk_text_str:
            # Prepend file path as context header for the chunk
            header = f"# File: {file_path}\n"
            chunks.append({
                "text": header + chunk_text_str,
                "file_path": file_path,
                "chunk_index": chunk_index,
            })
            chunk_index += 1

        if end >= len(lines):
            break
        start = end - OVERLAP_LINES  # Overlap for context continuity

    return chunks


class IngestionService:
    def __init__(self):
        self.github = GitHubService()
        self.vector = VectorService()

    async def ingest(self, repo_url: str) -> AsyncGenerator[dict, None]:
        """
        Full ingestion pipeline. Yields SSE-compatible progress dicts:
        {"type": "progress", "step": str, "message": str, "progress": int}
        Final event:
        {"type": "complete", "step": "done", "message": str, "progress": 100, "repo_name": str, "chunk_count": int}
        """
        yield {"type": "progress", "step": "parsing", "message": "Parsing repository URL...", "progress": 2}

        try:
            owner, repo = self.github.parse_repo_url(repo_url)
        except ValueError as e:
            yield {"type": "error", "step": "parsing", "message": str(e), "progress": 0}
            return

        repo_name = f"{owner}/{repo}"

        # Step 1: Fetch metadata
        yield {"type": "progress", "step": "fetching_metadata", "message": f"Fetching metadata for {repo_name}...", "progress": 8}
        try:
            metadata = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.github.fetch_repo_metadata(owner, repo)
            )
            yield {
                "type": "progress",
                "step": "metadata_fetched",
                "message": f"Repository: {metadata.get('description') or 'No description'}",
                "progress": 15,
                "metadata": metadata,
            }
        except Exception as e:
            yield {"type": "error", "step": "fetching_metadata", "message": f"Failed to fetch metadata: {e}", "progress": 0}
            return

        # Step 2: Fetch file tree
        yield {"type": "progress", "step": "fetching_tree", "message": "Fetching repository file tree...", "progress": 20}
        try:
            tree = await self.github.fetch_repo_tree(owner, repo)
            yield {
                "type": "progress",
                "step": "tree_fetched",
                "message": f"Found {len(tree)} files in repository",
                "progress": 30,
            }
        except Exception as e:
            yield {"type": "error", "step": "fetching_tree", "message": f"Failed to fetch file tree: {e}", "progress": 0}
            return

        # Step 3: Select files and fetch contents
        selected_files = self.github.select_files_to_fetch(tree)
        total_files = len(selected_files)
        yield {
            "type": "progress",
            "step": "fetching_files",
            "message": f"Fetching content of {total_files} key files...",
            "progress": 35,
        }

        file_contents: list[dict] = []
        failed = 0

        for i, file_item in enumerate(selected_files):
            path = file_item["path"]
            progress = 35 + int((i / max(total_files, 1)) * 30)  # 35 → 65

            if i % 5 == 0:
                yield {
                    "type": "progress",
                    "step": "fetching_files",
                    "message": f"Fetching {i + 1}/{total_files}: {path}",
                    "progress": progress,
                }

            content = await asyncio.get_event_loop().run_in_executor(
                None, lambda p=path: self.github.fetch_file_content(owner, repo, p)
            )

            if content:
                file_contents.append({"path": path, "content": content})
            else:
                failed += 1

        fetched_count = len(file_contents)
        yield {
            "type": "progress",
            "step": "files_fetched",
            "message": f"Fetched {fetched_count} files ({failed} skipped)",
            "progress": 65,
        }

        if not file_contents:
            yield {
                "type": "error",
                "step": "files_fetched",
                "message": "No file content could be fetched. Check that the repository is public or your GITHUB_TOKEN is valid.",
                "progress": 0,
            }
            return

        # Step 4: Chunk content
        yield {"type": "progress", "step": "chunking", "message": "Chunking file content...", "progress": 70}
        all_chunks: list[dict] = []
        for file_item in file_contents:
            chunks = chunk_text(file_item["content"], file_item["path"])
            all_chunks.extend(chunks)

        yield {
            "type": "progress",
            "step": "chunking_done",
            "message": f"Created {len(all_chunks)} chunks from {fetched_count} files",
            "progress": 75,
        }

        # Step 5: Embed and store in ChromaDB
        yield {
            "type": "progress",
            "step": "embedding",
            "message": f"Embedding {len(all_chunks)} chunks with sentence-transformers...",
            "progress": 78,
        }
        try:
            stored = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.vector.ingest_repo(repo_name, all_chunks)
            )
            yield {
                "type": "progress",
                "step": "storing",
                "message": f"Stored {stored} chunks in ChromaDB",
                "progress": 95,
            }
        except Exception as e:
            yield {"type": "error", "step": "embedding", "message": f"Failed to embed/store: {e}", "progress": 0}
            return

        # Done
        indexed_at = datetime.now(timezone.utc).isoformat()
        yield {
            "type": "complete",
            "step": "done",
            "message": f"Successfully indexed {repo_name} — {stored} chunks ready for chat",
            "progress": 100,
            "repo_name": repo_name,
            "chunk_count": stored,
            "file_count": fetched_count,
            "indexed_at": indexed_at,
            "metadata": metadata,
        }
