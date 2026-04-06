import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.repo import IngestRequest
from app.services.ingestion_service import IngestionService
from app.services.vector_service import VectorService
from app.services.github_service import GitHubService

router = APIRouter()
logger = logging.getLogger(__name__)


async def ingest_event_stream(repo_url: str) -> AsyncGenerator[str, None]:
    """Stream ingestion progress as SSE events."""
    service = IngestionService()
    try:
        async for event in service.ingest(repo_url):
            data = json.dumps(event)
            yield f"data: {data}\n\n"
    except Exception as e:
        error_event = json.dumps({"type": "error", "message": str(e), "progress": 0})
        yield f"data: {error_event}\n\n"
    finally:
        yield 'data: {"type": "done", "message": "Stream closed", "progress": 100}\n\n'


@router.post("/repos/ingest")
async def ingest_repo(request: IngestRequest):
    """Ingest a GitHub repository into ChromaDB. Streams SSE progress events."""
    if not request.repo_url.startswith("https://github.com/"):
        raise HTTPException(status_code=400, detail="URL must be a valid GitHub repo URL (https://github.com/owner/repo)")

    return StreamingResponse(
        ingest_event_stream(request.repo_url),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/repos")
async def list_repos():
    """List all ingested repositories from ChromaDB."""
    try:
        vs = VectorService()
        repos = vs.list_repos()
        return {"repos": repos}
    except Exception as e:
        logger.error(f"Failed to list repos: {e}")
        return {"repos": []}


@router.delete("/repos/{repo_name:path}")
async def delete_repo(repo_name: str):
    """Delete a repository and all its indexed content from ChromaDB."""
    try:
        vs = VectorService()
        vs.delete_repo(repo_name)
        return {"status": "deleted", "repo_name": repo_name}
    except Exception as e:
        logger.error(f"Failed to delete repo {repo_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/repos/{owner}/{repo}/tree")
async def get_repo_tree(owner: str, repo: str):
    """Get the file tree for a GitHub repository."""
    try:
        github = GitHubService()
        tree = await github.fetch_repo_tree(owner, repo)
        return {"owner": owner, "repo": repo, "tree": tree}
    except Exception as e:
        logger.error(f"Failed to fetch tree for {owner}/{repo}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
