from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, chat, github, logs

app = FastAPI(
    title="AI DevOps Copilot API",
    description="Backend API for the AI DevOps Copilot system",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(github.router, prefix="/api", tags=["github"])
app.include_router(logs.router, prefix="/api", tags=["logs"])


@app.get("/")
async def root():
    return {"message": "AI DevOps Copilot API", "version": "0.1.0", "docs": "/docs"}
