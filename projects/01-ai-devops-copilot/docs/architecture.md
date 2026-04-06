# AI DevOps Copilot — Architecture Document

## System Overview

AI DevOps Copilot is a full-stack conversational AI system designed for DevOps engineers. It enables natural language querying over GitHub repositories, application logs, and DevOps documentation to accelerate incident diagnosis and infrastructure problem-solving. The system runs entirely locally using Ollama (llama3) as the LLM, requiring no paid API subscriptions.

---

## Component Descriptions

### Frontend — Next.js 14

- **Technology:** Next.js 14, React 18, Tailwind CSS, recharts, lucide-react
- **Port:** 3000
- **Responsibilities:**
  - Streaming chat interface with real-time token rendering via Server-Sent Events (SSE)
  - Dashboard with KPI cards, system architecture viewer, and AI insights panel
  - Log viewer with live search and auto-refresh
  - Agent activity feed showing tool calls in real time
  - Metrics page with recharts visualizations
- **Key implementation:** Uses `fetch` with a streaming reader to process SSE events token-by-token

### Backend — FastAPI

- **Technology:** Python 3.11, FastAPI, uvicorn, sse-starlette
- **Port:** 8000
- **Responsibilities:**
  - REST API for health, chat, GitHub data, and log operations
  - SSE streaming of agent events to the frontend
  - Orchestrates the LangChain agent lifecycle
  - Serves as the integration layer between all downstream services
- **Key endpoints:**
  - `POST /api/chat` — streaming chat with SSE
  - `GET /api/health` — service health check
  - `GET /api/github/repos` — repository listing
  - `GET /api/logs/search` — semantic log search

### LangChain Agent

- **Technology:** LangChain 0.2, langchain-ollama, ReAct pattern
- **Responsibilities:**
  - Processes user queries using a ReAct (Reason + Act) agent loop
  - Decides which tool to invoke based on the user's question
  - Iterates up to 5 reasoning steps before generating a final answer
  - Streams events (tool_call, tool_result, token) back to the caller
- **Tools:**
  1. `github_search` — queries GitHub API for repos, PRs, workflow runs, issues
  2. `log_search` — semantic search across log entries in ChromaDB and in-memory buffer
  3. `devops_docs` — RAG retrieval of DevOps runbooks from ChromaDB

### Vector Database — ChromaDB

- **Technology:** ChromaDB 0.5.5, cosine similarity
- **Port:** 8001 (HTTP API)
- **Collections:**
  - `devops_docs` — chunked Markdown documentation (CI/CD, Kubernetes, error patterns)
  - `logs` — application and infrastructure log entries with metadata
- **Embedding:** ChromaDB's built-in default embeddings (no external API required)

### LLM — Ollama / llama3

- **Technology:** Ollama runtime, Meta llama3 8B model
- **Port:** 11434
- **Responsibilities:**
  - Provides token-by-token streaming LLM inference
  - Powers the ReAct agent's reasoning steps
  - Zero cost, runs entirely on local hardware (GPU-accelerated if available)

### External — GitHub API

- **Technology:** GitHub REST API v3
- **Authentication:** Personal Access Token (optional)
- **Behavior:** Returns realistic mock data if no `GITHUB_TOKEN` is configured, enabling demo use without credentials

---

## Data Flow — Step-by-Step Query Lifecycle

1. **User input:** The engineer types a question in the Next.js chat interface (e.g., "Why is my api-gateway pod OOMKilled?")
2. **HTTP POST:** The frontend sends `POST /api/chat` with `{"query": "..."}` to the FastAPI backend
3. **Agent initialization:** FastAPI instantiates `CopilotAgent` and calls `astream_response(query)`
4. **ReAct reasoning:** The LangChain agent sends the query to Ollama/llama3 with the ReAct prompt and tool descriptions
5. **Tool selection:** llama3 outputs a "Thought: ... Action: log_search Action Input: OOMKilled" decision
6. **Tool execution:** `LogSearchTool._run()` queries ChromaDB and the in-memory log buffer, returns formatted results
7. **SSE event:** A `{"type": "tool_call", "content": "log_search", ...}` event is streamed to the frontend immediately
8. **Second reasoning step:** The agent sends tool results back to the LLM, which may call additional tools (e.g., `devops_docs`)
9. **Final answer:** The LLM generates the final answer token-by-token; each token is streamed as `{"type": "token", "content": "..."}`
10. **Rendering:** The frontend accumulates tokens and renders the complete response in the chat bubble

---

## Technology Choices Rationale

| Choice | Rationale |
|--------|-----------|
| **Next.js 14** | App Router, Server Components, native SSE support, excellent TypeScript integration |
| **FastAPI** | Async-first Python framework, excellent SSE support via sse-starlette, auto-generates OpenAPI docs |
| **LangChain** | Standard agent orchestration framework with built-in ReAct support, tool abstractions, callback system |
| **Ollama + llama3** | Zero-cost local inference, no data sent to external APIs, GPU acceleration supported |
| **ChromaDB** | Lightweight embedded vector DB, HTTP mode for Docker deployment, no separate embedding service needed |
| **Tailwind CSS** | Utility-first CSS for rapid dark theme development without fighting component library opinions |
| **Docker Compose** | Single-command deployment of all services with proper networking and volume persistence |

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Docker Compose Network: copilot-net                         │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐  ┌─────────┐ │
│  │ frontend │    │ backend  │    │ chromadb │  │ ollama  │ │
│  │ :3000    │───▶│ :8000    │───▶│ :8000    │  │ :11434  │ │
│  └──────────┘    └──────────┘    └──────────┘  └─────────┘ │
│                       │                              ▲       │
│                       └──────────────────────────────┘       │
│                                                              │
│  Volumes: chroma-data (persistent), ollama-data (models)     │
└─────────────────────────────────────────────────────────────┘
```

External port mapping:
- `3000` → frontend (Next.js)
- `8000` → backend (FastAPI)
- `8001` → chromadb
- `11434` → ollama

---

## Future Improvements

1. **Authentication:** Add OAuth2/JWT for multi-user support with per-user conversation history
2. **Persistent conversations:** Store conversation history in PostgreSQL for context across sessions
3. **More tools:** Add Prometheus metrics tool, Kubernetes kubectl tool, PagerDuty integration
4. **Fine-tuning:** Fine-tune llama3 on internal runbooks and post-mortems for domain-specific accuracy
5. **Observability:** Add OpenTelemetry tracing across all services; expose Prometheus metrics from FastAPI
6. **RAG improvements:** Implement re-ranking, hybrid search (BM25 + vector), and citation tracking
7. **Slack/Teams bot:** Deploy as a chatbot in Slack for in-context DevOps support during incidents
8. **Multi-model support:** Allow switching between llama3, mistral, codellama based on query type
