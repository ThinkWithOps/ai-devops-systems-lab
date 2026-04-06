import httpx
from fastapi import APIRouter
from app.config import get_settings

router = APIRouter()


async def check_groq(api_key: str) -> bool:
    if not api_key:
        return False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            return resp.status_code == 200
    except Exception:
        return False


async def check_ollama(base_url: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{base_url}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False


async def check_chromadb(host: str, port: int) -> bool:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"http://{host}:{port}/api/v1/heartbeat")
            return resp.status_code == 200
    except Exception:
        return False


@router.get("/health")
async def health_check():
    settings = get_settings()
    chroma_ok = await check_chromadb(settings.chroma_host, settings.chroma_port)

    if settings.groq_api_key:
        llm_ok = await check_groq(settings.groq_api_key)
        llm_provider = "groq"
    else:
        llm_ok = await check_ollama(settings.ollama_base_url)
        llm_provider = "ollama"

    return {
        "status": "ok",
        "version": "0.1.0",
        "llm_provider": llm_provider,
        "services": {
            "llm": llm_ok,
            "chromadb": chroma_ok,
        },
    }
