# AI GitHub Repo Explainer

> "ChatGPT for any GitHub repository" — paste any GitHub URL, and the AI explains the entire codebase

**YouTube Series: 30 AI + DevOps Portfolio Projects | Project 02**

---

## Problem Statement

Every developer has faced the challenge of onboarding into an unfamiliar codebase. Reading through hundreds of files, tracing function calls, understanding architecture decisions — it can take days or weeks. This project solves that by letting you **chat with any GitHub repository** using AI.

Paste `https://github.com/tiangolo/fastapi` and ask:
- "What does this repo do?"
- "How is routing implemented?"
- "What's the main entry point?"
- "How are dependencies injected?"

The AI fetches the source code, indexes it into a vector database, and answers your questions with specific file references and code snippets.

---

## Architecture

```
Browser → Next.js 14 Frontend → FastAPI Backend → LangChain Agent
                                                        ↓
                                          [search_repo] → ChromaDB
                                          [get_repo_metadata] → GitHub REST API

Ingestion Pipeline:
GitHub URL → fetch tree → fetch 50 key files → chunk (100 lines)
          → embed (all-MiniLM-L6-v2) → store → ChromaDB
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 + React 18 + Tailwind CSS | Dark SaaS dashboard UI |
| Backend | FastAPI + Python 3.11 | REST API + SSE streaming |
| AI Agent | LangChain `create_tool_calling_agent` | Orchestrate tool calls |
| LLM | Groq llama-3.1-8b-instant | Fast inference (~180 tok/s) |
| LLM Fallback | Ollama llama3 | Fully local, zero cost |
| Embeddings | sentence-transformers all-MiniLM-L6-v2 | Free, local, 384-dim |
| Vector DB | ChromaDB | Cosine similarity search |
| GitHub | REST API v3 | File tree + content fetch |
| Streaming | SSE (Server-Sent Events) | Real-time tokens + progress |
| Deploy | Docker Compose | One-command startup |

---

## Key Features

- **Universal repo ingestion**: Any public GitHub repo — paste URL, click Analyze
- **Smart file selection**: Prioritizes README, main files, source code (up to 50 files)
- **Chunked indexing**: 100-line chunks with 10-line overlap for context preservation
- **Semantic search**: Cosine similarity via ChromaDB + all-MiniLM-L6-v2
- **Tool-calling agent**: search_repo + get_repo_metadata tools
- **Real-time streaming**: SSE for both ingestion progress and chat responses
- **Repo-scoped chat**: Filter vector search to a specific repository
- **Delete and re-index**: Remove stale repos and re-ingest updated ones

---

## Component Responsibilities

| Component | File | Responsibility |
|-----------|------|---------------|
| RepoAgent | `backend/app/agents/repo_agent.py` | LangChain agent, asyncio Queue streaming |
| SearchRepoTool | `backend/app/agents/tools/search_tool.py` | ChromaDB semantic search |
| GetRepoMetadataTool | `backend/app/agents/tools/github_tool.py` | GitHub API metadata |
| GitHubService | `backend/app/services/github_service.py` | File tree, content fetch, URL parsing |
| VectorService | `backend/app/services/vector_service.py` | ChromaDB CRUD, embeddings |
| IngestionService | `backend/app/services/ingestion_service.py` | Full pipeline, SSE progress |
| RepoExplorer | `frontend/components/dashboard/RepoExplorer.tsx` | URL input, progress UI, file tree |
| ChatPanel | `frontend/components/dashboard/ChatPanel.tsx` | Chat UI with repo selector |

---

## System Workflow

1. **User visits /explore** and pastes a GitHub URL
2. **Backend** validates URL, fetches metadata and recursive file tree via GitHub REST API
3. **Ingestion pipeline** selects up to 50 key files, fetches their content (max 50KB each)
4. **Chunker** splits files into 100-line chunks with 10-line overlap, prepends file path as header
5. **sentence-transformers** encodes all chunks locally (all-MiniLM-L6-v2, free, CPU-compatible)
6. **ChromaDB** stores chunks with `{repo_name, file_path, chunk_index}` metadata
7. **User goes to /chat**, selects the indexed repo from the dropdown
8. **User asks a question** — backend invokes RepoAgent with `[Repo context: owner/repo]\n\n{query}`
9. **LangChain agent** calls `search_repo` tool → ChromaDB returns 5 relevant chunks
10. **Agent** may also call `get_repo_metadata` for stats questions
11. **Tokens stream** via asyncio Queue → SSE → frontend renders in real time

---

## Installation

### Option 1: Docker Compose (Recommended)

```bash
# Clone and navigate to project
cd projects/02-ai-github-repo-explainer

# Copy and configure environment
cp .env.example .env
# Edit .env: set GROQ_API_KEY (required) and GITHUB_TOKEN (recommended)

# Start all services
docker-compose up --build

# Services:
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000/docs
# ChromaDB:  http://localhost:8001
```

### Option 2: Local Development

**Prerequisites:** Python 3.11+, Node.js 20+, Docker (for ChromaDB)

```bash
# Start ChromaDB
docker run -d -p 8001:8000 -v chroma-data:/chroma/chroma \
  -e IS_PERSISTENT=TRUE chromadb/chroma:0.5.5

# Backend
cd backend
pip install -r requirements.txt
cp ../.env.example .env   # configure GROQ_API_KEY etc.
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

### Ingest a Sample Repo

```bash
# With backend running, ingest the FastAPI repo as a demo
python vectorstore/ingest_sample.py

# Or ingest multiple demo repos
python vectorstore/ingest_sample.py --all
```

---

## Demo Scenario

1. Open `http://localhost:3000`
2. Go to **Explore** → paste `https://github.com/tiangolo/fastapi` → click **Analyze**
3. Watch the progress bar: fetching metadata → tree → 48 files → 342 chunks → indexed
4. Go to **Chat** → select `tiangolo/fastapi` from the repo dropdown
5. Ask:
   - *"What does this repo do?"* — agent calls search_repo + get_repo_metadata
   - *"How is dependency injection implemented?"* — references `fastapi/dependencies.py`
   - *"What's the entry point for a FastAPI application?"* — references `fastapi/applications.py`
   - *"How many stars does this repo have?"* — calls get_repo_metadata for live stats

---

## Project Structure

```
02-ai-github-repo-explainer/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── repo_agent.py          # LangChain agent + streaming
│   │   │   └── tools/
│   │   │       ├── search_tool.py     # ChromaDB search
│   │   │       └── github_tool.py     # GitHub metadata
│   │   ├── api/routes/
│   │   │   ├── health.py
│   │   │   ├── repos.py               # ingest, list, delete, tree
│   │   │   └── chat.py
│   │   ├── services/
│   │   │   ├── github_service.py      # REST API client
│   │   │   ├── vector_service.py      # ChromaDB CRUD
│   │   │   └── ingestion_service.py   # Full pipeline
│   │   ├── schemas/
│   │   │   ├── repo.py
│   │   │   └── chat.py
│   │   ├── config.py
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── page.tsx                   # Dashboard
│   │   ├── explore/page.tsx           # Repo ingestion
│   │   ├── chat/page.tsx              # Chat interface
│   │   ├── agents/page.tsx            # Agent history
│   │   ├── logs/page.tsx              # Log viewer
│   │   ├── architecture/page.tsx      # System diagram
│   │   ├── metrics/page.tsx           # Charts
│   │   └── settings/page.tsx          # Config
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── LiveLogStrip.tsx
│   │   └── dashboard/
│   │       ├── KPICard.tsx
│   │       ├── ChatPanel.tsx          # SSE chat with repo selector
│   │       ├── RepoExplorer.tsx       # Ingestion UI
│   │       ├── AgentActivityFeed.tsx
│   │       ├── ArchitectureViewer.tsx
│   │       └── MetricsChart.tsx
│   ├── lib/api.ts                     # API client
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
├── vectorstore/
│   └── ingest_sample.py               # Demo ingestion script
├── docs/
│   └── architecture.md
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `GitHub API rate limit exceeded` | Set `GITHUB_TOKEN` in `.env` (5000 req/hr vs 60) |
| `No results found for query` | Repo not indexed yet — go to /explore and ingest it |
| `ChromaDB connection failed` | Check `docker-compose up chromadb` is running |
| `Groq rate limit` | Wait 30s or switch to Ollama (remove GROQ_API_KEY) |
| `sentence-transformers slow first run` | Model downloads on first use (~90MB). Normal after that. |
| `File skipped (too large)` | Files over 50KB are excluded. Adjust `MAX_FILE_SIZE_BYTES` in `github_service.py` |
| Frontend shows `Connecting...` | Backend not running. Check `docker-compose logs backend` |

---

## Learning Outcomes

By studying this project, you will understand:

1. **LangChain tool-calling agents** — `create_tool_calling_agent`, `AgentExecutor`, `BaseTool`
2. **Async SSE streaming** — asyncio Queue pattern for real-time token streaming
3. **Vector database operations** — ChromaDB collection management, cosine similarity search, metadata filtering
4. **Local embeddings** — sentence-transformers integration with ChromaDB
5. **GitHub REST API** — recursive tree fetch, base64 file content, rate limit handling
6. **Chunking strategies** — line-based chunking with overlap for code files
7. **FastAPI streaming responses** — `StreamingResponse` with `text/event-stream`
8. **Next.js SSE consumption** — fetch API with ReadableStream for SSE
9. **Docker Compose networking** — service-to-service communication, named networks

---

## How the AI Understands Code

The AI doesn't "understand" code in a traditional sense. Here's what actually happens:

1. **Files are chunked** into 100-line segments, each with a file path header
2. **all-MiniLM-L6-v2** converts each chunk into a 384-dimensional vector capturing semantic meaning
3. **ChromaDB** stores these vectors and enables cosine similarity search
4. When you ask "how is auth implemented?", the query is vectorized and the **closest matching chunks** are retrieved
5. These chunks (actual source code) are injected into the LLM's context window
6. **Groq llama-3.1-8b** synthesizes an answer from the source code, citing specific files

This is Retrieval-Augmented Generation (RAG) applied to GitHub repositories.

---

## License

MIT — part of the AI + DevOps Systems Lab YouTube series.
