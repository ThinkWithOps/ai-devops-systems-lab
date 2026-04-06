from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import json

from app.schemas.diagram import GenerateRequest, DiagramResult
from app.agents.diagram_agent import run_diagram_agent

router = APIRouter()


@router.post("/generate", response_model=DiagramResult)
async def generate_diagram(request: GenerateRequest):
    """Generate a diagram from Terraform code. Returns final DiagramResult."""
    final_result = None
    async for step in run_diagram_agent(
        terraform_code=request.terraform_code,
        diagram_style=request.diagram_style,
        title=request.diagram_title or "Infrastructure Architecture",
        include_ai_summary=request.include_ai_summary,
    ):
        if step.step == "__result__":
            final_result = DiagramResult.model_validate_json(step.detail)

    if not final_result:
        raise HTTPException(status_code=500, detail="Agent failed to produce a result")
    return final_result


@router.post("/generate/stream")
async def generate_diagram_stream(request: GenerateRequest):
    """Stream agent step events as NDJSON, then emit the final result."""
    async def event_stream():
        async for step in run_diagram_agent(
            terraform_code=request.terraform_code,
            diagram_style=request.diagram_style,
            title=request.diagram_title or "Infrastructure Architecture",
            include_ai_summary=request.include_ai_summary,
        ):
            yield json.dumps(step.model_dump(mode="json"), default=str) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")
