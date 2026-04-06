from typing import Optional
from pydantic import BaseModel


class ChatRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    tool_calls: list[str] = []
    conversation_id: str


class StreamEvent(BaseModel):
    type: str  # "tool_call" | "tool_result" | "token" | "done" | "error"
    content: str
    metadata: Optional[dict] = None
