import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, repos, chat

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI GitHub Repo Explainer API starting up...")
    # Initialize ChromaDB collection on startup
    try:
        from app.services.vector_service import VectorService
        vs = VectorService()
        vs.get_or_create_collection()
        logger.info("ChromaDB collection initialized")
    except Exception as e:
        logger.warning(f"ChromaDB init warning (non-fatal): {e}")
    yield
    logger.info("AI GitHub Repo Explainer API shutting down...")


app = FastAPI(
    title="AI GitHub Repo Explainer API",
    description="Backend API — ingest any GitHub repo, chat with it via LangChain + ChromaDB",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(repos.router, prefix="/api", tags=["repos"])
app.include_router(chat.router, prefix="/api", tags=["chat"])


@app.get("/")
async def root():
    return {
        "message": "AI GitHub Repo Explainer API",
        "version": "0.1.0",
        "docs": "/docs",
    }
