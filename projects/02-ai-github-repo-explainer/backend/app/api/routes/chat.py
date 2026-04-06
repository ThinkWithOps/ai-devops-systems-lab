import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas.chat import ChatRequest
from app.agents.repo_agent import RepoAgent

router = APIRouter()
logger = logging.getLogger(__name__)

_agent: RepoAgent | None = None


def get_agent() -> RepoAgent:
    global _agent
    if _agent is None:
        _agent = RepoAgent()
    return _agent


async def event_stream(query: str, repo_name: str | None) -> AsyncGenerator[str, None]:
    agent = get_agent()
    async for event in agent.astream_response(query, repo_name=repo_name):
        data = json.dumps(event)
        yield f"data: {data}\n\n"
    yield 'data: {"type": "done", "content": "", "metadata": {}}\n\n'


@router.post("/chat")
async def chat(request: ChatRequest):
    """Chat about an ingested GitHub repository. Streams SSE events."""
    return StreamingResponse(
        event_stream(request.query, request.repo_name),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
