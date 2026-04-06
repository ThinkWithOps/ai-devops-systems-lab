# Architecture Documentation — AI GitHub Repo Explainer

## Overview

The AI GitHub Repo Explainer is a full-stack AI platform that allows users to ingest any public GitHub repository into a vector database (ChromaDB) and then chat with an AI agent to understand the codebase. It uses LangChain's `create_tool_calling_agent` pattern with Groq LLM (llama-3.1-8b-instant) and sentence-transformers for local embeddings.

---

## High-Level Architecture

```
Browser (User)
    │
    ▼
Next.js 14 Frontend (port 3000)
    │  POST /api/repos/ingest  →  SSE progress stream
    │  POST /api/chat          →  SSE token stream
    │  GET  /api/repos         →  list of indexed repos
    ▼
FastAPI Backend (port 8000)
    │
    ├── IngestionService
    │       │  fetch_repo_metadata() ──→ GitHub REST API
    │       │  fetch_repo_tree()     ──→ GitHub REST API
    │       │  fetch_file_content()  ──→ GitHub REST API
    │       │  chunk_text()          ──→ line-based chunker
    │       └──ingest_repo()         ──→ ChromaDB (via sentence-transformers)
    │
    └── RepoAgent (LangChain)
            │  create_tool_calling_agent
            │
            ├── search_repo tool        ──→ ChromaDB cosine similarity search
            └── get_repo_metadata tool  ──→ GitHub REST API
```

---

## Component Details

### Frontend (Next.js 14)

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/` | KPI cards, recent activity, quick start |
| Explore | `/explore` | Repo URL input, ingestion progress, repo list |
| Chat | `/chat` | SSE chat interface with repo selector |
| Agents | `/agents` | Agent activity history |
| Logs | `/logs` | System log viewer |
| Architecture | `/architecture` | This diagram |
| Metrics | `/metrics` | Query volume, response times, tool usage |
| Settings | `/settings` | Service status, config reference |

Key frontend patterns:
- SSE streaming for both ingestion progress and chat responses
- `listRepos()` polls ChromaDB metadata for dynamic repo selector
- `useSearchParams()` enables direct links: `/chat?repo=owner/repo`

### Backend (FastAPI)

**Routes:**
- `POST /api/repos/ingest` — triggers IngestionService, returns SSE stream
- `GET /api/repos` — lists repos from ChromaDB
- `DELETE /api/repos/{repo_name}` — deletes repo chunks from ChromaDB
- `GET /api/repos/{owner}/{repo}/tree` — proxies GitHub file tree
- `POST /api/chat` — invokes RepoAgent, returns SSE stream
- `GET /api/health` — checks LLM and ChromaDB availability

### Ingestion Pipeline

```
1. parse_repo_url()         — validates https://github.com/owner/repo
2. fetch_repo_metadata()    — GET /repos/{owner}/{repo}
3. fetch_repo_tree()        — GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
4. select_files_to_fetch()  — priority files first, up to 50 total
5. fetch_file_content()     — GET /repos/{owner}/{repo}/contents/{path}
                              (base64 decoded, skip > 50KB)
6. chunk_text()             — 100 lines per chunk, 10-line overlap
                              header: "# File: {path}\n"
7. VectorService.ingest_repo() — sentence-transformers encode
                                 ChromaDB upsert in batches of 100
```

**Priority files always fetched first:**
README.md, package.json, requirements.txt, docker-compose.yml, Dockerfile, main.py, index.js, app.py, setup.py, and more.

**Excluded automatically:**
node_modules/, .git/, dist/, build/, *.png, *.jpg, *.ico, *.lock, *.min.js, binaries

### AI Agent (LangChain)

The `RepoAgent` uses `create_tool_calling_agent` (NOT ReAct):

```python
agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, max_iterations=8, ...)
```

**Streaming pattern** (same as project 01):
```
asyncio.Queue  ←  StreamingCallbackHandler.on_llm_new_token()
                   StreamingCallbackHandler.on_tool_start()
                   StreamingCallbackHandler.on_tool_end()
    ↓
asyncio.create_task(run_agent())  [runs executor in thread pool]
    ↓
async for event in queue:
    yield event  →  SSE stream  →  frontend
```

**Tools:**

| Tool | Triggers | Backend |
|------|----------|---------|
| `search_repo` | Questions about code/implementation | ChromaDB cosine similarity |
| `get_repo_metadata` | Questions about stars/language/stats | GitHub REST API |

### VectorService (ChromaDB)

- Collection: `github_repos`
- Embedding function: `SentenceTransformerEmbeddingFunction("all-MiniLM-L6-v2")`
- Distance metric: cosine similarity
- Metadata per chunk: `{repo_name, file_path, chunk_index}`
- Search filter: `where={"repo_name": {"$eq": repo_name}}`
- Client: `HttpClient` → fallback to `EphemeralClient`

### GitHub Service

- Uses `requests` library (synchronous) with `run_in_executor` for async wrappers
- Rate limit detection: checks 403 response + `X-RateLimit-Reset` header
- File size limit: 50KB per file
- Tree truncation: top 50 files by priority + path depth + extension preference

---

## Data Flow — Complete Query Lifecycle

1. User opens `/explore`, pastes `https://github.com/tiangolo/fastapi`
2. Frontend POSTs to `/api/repos/ingest`, opens SSE EventSource
3. IngestionService streams progress events (type: "progress") with % complete
4. Files are fetched, chunked, embedded (all-MiniLM-L6-v2), stored in ChromaDB
5. Final event: `{type: "complete", repo_name: "tiangolo/fastapi", chunk_count: 342}`
6. User goes to `/chat`, selects `tiangolo/fastapi` from dropdown
7. User types: "How is dependency injection implemented?"
8. Frontend POSTs `{query, repo_name}` to `/api/chat`
9. RepoAgent enriches query: `[Repo context: tiangolo/fastapi]\n\n{query}`
10. `create_tool_calling_agent` decides to call `search_repo`
11. `SearchRepoTool._run()` queries ChromaDB → 5 relevant chunks from `fastapi/dependencies.py`
12. Agent generates response with file references, streams tokens via Queue → SSE
13. Frontend renders tokens in real time in the chat bubble

---

## Deployment

### Docker Compose (recommended)

```bash
cd projects/02-ai-github-repo-explainer
cp .env.example .env
# Edit .env: set GROQ_API_KEY and optionally GITHUB_TOKEN
docker-compose up --build
```

Services:
- `frontend`: Next.js on port 3000
- `backend`: FastAPI on port 8000
- `chromadb`: ChromaDB on port 8001 (internal 8000)

### Local Development

```bash
# Terminal 1: ChromaDB
docker run -p 8001:8000 -v chroma-data:/chroma/chroma chromadb/chroma:0.5.5

# Terminal 2: Backend
cd backend
pip install -r requirements.txt
cp ../.env.example .env  # fill in values
uvicorn app.main:app --reload --port 8000

# Terminal 3: Frontend
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

---

## Performance Characteristics

| Operation | Typical Duration |
|-----------|-----------------|
| Repo ingestion (small, ~50 files) | 15–30 seconds |
| Repo ingestion (large, ~50 files) | 20–45 seconds |
| ChromaDB vector search | 30–60ms |
| Groq LLM first token | ~300ms |
| Full chat response | 1.5–3 seconds |
| GitHub API (tree fetch) | 200–800ms |

---

## Security Considerations

- GitHub tokens are stored only in `.env` (never committed to git)
- CORS is configured to allow all origins (development mode — restrict in production)
- Only public GitHub repos are supported (no OAuth flow needed)
- ChromaDB runs in a Docker network, not exposed to the internet
- Rate limit errors are caught and surfaced to the user gracefully
