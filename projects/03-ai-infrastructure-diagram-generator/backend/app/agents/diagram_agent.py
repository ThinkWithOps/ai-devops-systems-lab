"""
LangChain-based orchestration agent for AI Infrastructure Diagram Generator.

Pipeline:
  1. Parse       — extract resources from Terraform HCL
  2. Enrich      — infer connections and group by provider
  3. Generate    — produce Graphviz + Mermaid outputs
  4. Summarize   — AWS Bedrock (primary) → Groq (fallback) → static text
  5. Store       — AWS DynamoDB (primary) + S3 diagram upload (primary),
                   ChromaDB (fallback)

LLM priority:
  - Bedrock Claude Haiku when AWS_BEDROCK_ENABLED=true
  - Groq llama3-8b-8192 when GROQ_API_KEY is set (fast, free, no local install)
  - Static template summary as last resort (never fails)
"""
import uuid
import asyncio
import os
from datetime import datetime
from typing import List, AsyncGenerator

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.config import get_settings
from app.schemas.diagram import (
    AgentStep,
    DiagramResult,
    DiagramStyle,
    ParsedResource,
)
from app.services.terraform_parser import parse_terraform
from app.services.diagram_generator import generate_graphviz_diagram, generate_mermaid_diagram
from app.services.vector_store import store_diagram_result
from app.services.aws_bedrock import generate_summary_bedrock, bedrock_available
from app.services.aws_s3 import upload_diagram_to_s3, s3_available
from app.services.aws_dynamodb import store_diagram_dynamo, dynamodb_available

settings = get_settings()

SUMMARY_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a senior cloud architect. Given a list of infrastructure resources parsed from Terraform, "
        "write a concise 3–5 sentence architecture summary. Explain: what the infrastructure does, "
        "how the key components connect, the likely deployment pattern, and any notable design decisions. "
        "Be specific about providers and resource types. Do not hallucinate resources not in the list."
    ),
    (
        "human",
        "Resources:\n{resource_list}\n\nTitle: {title}\n\nWrite the architecture summary:"
    ),
])


def _get_local_llm():
    if settings.groq_api_key:
        from langchain_groq import ChatGroq
        return ChatGroq(model=settings.groq_model, api_key=settings.groq_api_key, temperature=0.2)
    if settings.openai_api_key:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model="gpt-4o-mini", api_key=settings.openai_api_key, temperature=0.2)
    raise RuntimeError("No LLM configured. Set GROQ_API_KEY or OPENAI_API_KEY.")


async def run_diagram_agent(
    terraform_code: str,
    diagram_style: DiagramStyle,
    title: str,
    include_ai_summary: bool,
) -> AsyncGenerator[AgentStep, None]:
    """
    Async generator that yields AgentStep events as the pipeline executes.
    Final DiagramResult is emitted as a sentinel step with step='__result__'.
    """
    diagram_id = str(uuid.uuid4())[:12]
    steps: List[AgentStep] = []

    async def emit(step_name: str, status: str, detail: str = "") -> AgentStep:
        step = AgentStep(step=step_name, status=status, detail=detail)
        steps.append(step)
        return step

    # ── Step 1: Parse ──────────────────────────────────────────────────────────
    yield await emit("Parsing Terraform HCL", "running")
    await asyncio.sleep(0.05)

    resources: List[ParsedResource] = []
    try:
        resources = parse_terraform(terraform_code)
        yield await emit(
            "Parsing Terraform HCL",
            "complete",
            f"Found {len(resources)} resources across "
            f"{len(set(r.provider for r in resources))} providers",
        )
    except Exception as e:
        yield await emit("Parsing Terraform HCL", "error", str(e))
        return

    # ── Step 2: Infer connections ──────────────────────────────────────────────
    yield await emit("Inferring resource connections", "running")
    await asyncio.sleep(0.05)
    total_connections = sum(len(r.connections) for r in resources)
    yield await emit(
        "Inferring resource connections",
        "complete",
        f"Detected {total_connections} cross-resource references",
    )

    # ── Step 3: Generate diagram ───────────────────────────────────────────────
    yield await emit(f"Generating {diagram_style} diagram", "running")
    await asyncio.sleep(0.05)

    local_image_path = None
    image_url = None
    dot_source = None
    mermaid_code = None

    try:
        if diagram_style == DiagramStyle.graphviz:
            local_path_no_ext, dot_source = generate_graphviz_diagram(
                resources, title, settings.output_dir
            )
            # local_path_no_ext already has .png appended by graphviz render
            # image_url starts as the local serving path
            image_url = local_path_no_ext
            # Store the actual filesystem path for S3 upload
            local_image_path = os.path.join(
                settings.output_dir, f"{diagram_id}.png"
            )
        else:
            mermaid_code = generate_mermaid_diagram(resources, title)

        yield await emit(f"Generating {diagram_style} diagram", "complete", "Diagram rendered")
    except Exception as e:
        yield await emit(f"Generating {diagram_style} diagram", "error", str(e))

    # ── Step 4: Upload to S3 (primary) or serve locally ───────────────────────
    if local_image_path and os.path.exists(local_image_path) and s3_available():
        yield await emit("Uploading diagram to S3", "running")
        try:
            image_url = await asyncio.to_thread(
                upload_diagram_to_s3, local_image_path, diagram_id
            )
            yield await emit(
                "Uploading diagram to S3",
                "complete",
                f"Stored at s3://{settings.aws_s3_bucket}/diagrams/{diagram_id}.png",
            )
        except Exception as e:
            yield await emit("Uploading diagram to S3", "error", f"S3 upload failed, using local: {e}")
    elif local_image_path:
        yield await emit("Diagram storage", "complete", "Serving from local filesystem")

    # ── Step 5: AI Summary — Bedrock (primary) or Ollama (fallback) ───────────
    ai_summary = None
    if include_ai_summary and resources:
        resource_list = "\n".join(
            f"- {r.provider.upper()} {r.resource_type} \"{r.resource_name}\""
            for r in resources
        )

        if bedrock_available():
            yield await emit("Generating AI summary (AWS Bedrock)", "running")
            try:
                ai_summary = await asyncio.to_thread(
                    generate_summary_bedrock, resource_list, title
                )
                yield await emit(
                    "Generating AI summary (AWS Bedrock)",
                    "complete",
                    "Claude Haiku summary ready",
                )
            except Exception as e:
                yield await emit("Generating AI summary (AWS Bedrock)", "error", str(e))
                ai_summary = await _local_summary(resource_list, title, steps, emit)
        else:
            ai_summary = await _local_summary(resource_list, title, steps, emit)

    # ── Step 6: Persist — DynamoDB (primary) or ChromaDB (fallback) ───────────
    providers = list(set(r.provider for r in resources))

    if dynamodb_available():
        yield await emit("Persisting to DynamoDB", "running")
        try:
            await asyncio.to_thread(
                store_diagram_dynamo,
                diagram_id=diagram_id,
                title=title,
                resource_count=len(resources),
                providers=providers,
                ai_summary=ai_summary or "",
                image_url=image_url or "",
            )
            yield await emit("Persisting to DynamoDB", "complete", f"Stored ID {diagram_id}")
        except Exception as e:
            yield await emit("Persisting to DynamoDB", "error", str(e))
            await _store_chroma(diagram_id, title, resources, ai_summary or "", steps, emit)
    else:
        await _store_chroma(diagram_id, title, resources, ai_summary or "", steps, emit)

    # ── Build and emit final result ────────────────────────────────────────────
    result = DiagramResult(
        diagram_id=diagram_id,
        title=title,
        image_url=image_url,
        mermaid_code=mermaid_code,
        dot_source=dot_source,
        ai_summary=ai_summary,
        resources=resources,
        agent_steps=steps,
        resource_count=len(resources),
        connection_count=total_connections,
        providers=providers,
    )
    yield await emit("__result__", "complete", result.model_dump_json())


async def _local_summary(resource_list: str, title: str, steps, emit) -> str:
    step_name = "Generating AI summary (Groq)"
    await emit(step_name, "running")
    try:
        llm = _get_local_llm()
        chain = SUMMARY_PROMPT | llm | StrOutputParser()
        summary = await asyncio.to_thread(chain.invoke, {"resource_list": resource_list, "title": title})
        await emit(step_name, "complete", f"Groq {settings.groq_model} summary ready")
        return summary
    except Exception as e:
        await emit(step_name, "error", f"LLM unavailable: {e}")
        return _static_summary_text(resource_list, title)


async def _store_chroma(diagram_id, title, resources, ai_summary, steps, emit):
    step_name = "Persisting to ChromaDB"
    await emit(step_name, "running")
    try:
        await asyncio.to_thread(
            store_diagram_result,
            diagram_id=diagram_id,
            title=title,
            resources=resources,
            ai_summary=ai_summary,
        )
        await emit(step_name, "complete", f"Stored ID {diagram_id}")
    except Exception as e:
        await emit(step_name, "error", str(e))


def _static_summary_text(resource_list: str, title: str) -> str:
    lines = [l for l in resource_list.split("\n") if l.strip()]
    return (
        f"This {title} infrastructure includes {len(lines)} resources. "
        "Review the diagram for topology and connection details."
    )
