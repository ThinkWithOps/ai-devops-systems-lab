import logging
from fastapi import APIRouter
from app.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
async def health():
    settings = get_settings()

    # Check LLM provider
    llm_provider = "groq" if settings.groq_api_key else "ollama"
    llm_ok = False
    try:
        if settings.groq_api_key:
            llm_ok = True  # Assume Groq is available if key is set
        else:
            import httpx
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{settings.ollama_base_url}/api/tags")
                llm_ok = resp.status_code == 200
    except Exception:
        llm_ok = False

    # Check ChromaDB
    chroma_ok = False
    try:
        from app.services.vector_service import VectorService
        vs = VectorService()
        vs.get_or_create_collection()
        chroma_ok = True
    except Exception:
        chroma_ok = False

    return {
        "status": "ok",
        "version": "0.1.0",
        "llm_provider": llm_provider,
        "services": {
            "llm": llm_ok,
            "chromadb": chroma_ok,
        },
    }
