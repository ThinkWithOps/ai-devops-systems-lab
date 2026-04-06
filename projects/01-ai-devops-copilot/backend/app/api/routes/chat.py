import json
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas.chat import ChatRequest
from app.agents.copilot_agent import CopilotAgent

router = APIRouter()
_agent: CopilotAgent | None = None


def get_agent() -> CopilotAgent:
    global _agent
    if _agent is None:
        _agent = CopilotAgent()
    return _agent


async def event_stream(query: str, conversation_id: str) -> AsyncGenerator[str, None]:
    agent = get_agent()
    async for event in agent.astream_response(query):
        data = json.dumps(event)
        yield f"data: {data}\n\n"
    yield "data: {\"type\": \"done\", \"content\": \"\", \"metadata\": {}}\n\n"


@router.post("/chat")
async def chat(request: ChatRequest):
    import uuid
    conversation_id = request.conversation_id or str(uuid.uuid4())

    return StreamingResponse(
        event_stream(request.query, conversation_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
