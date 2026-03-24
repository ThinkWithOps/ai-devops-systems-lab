# AI GitHub Repo Explainer 🤖🔍

> Chat with any GitHub repository — paste a URL, and the AI explains the entire codebase with file references and code context

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/docker-compose-blue.svg)](https://docs.docker.com/compose/)

**YouTube Tutorial:** [Watch the full walkthrough](https://youtube.com/@thinkwithops)

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [System Workflow](#system-workflow)
- [Results](#results)
- [Challenges and Learnings](#challenges-and-learnings)
- [Installation](#installation)
- [AWS Deployment](#deploy-to-aws-ec2)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Cleanup](#cleanup)
- [Troubleshooting](#troubleshooting)
- [API Endpoints](#api-endpoints)
- [How the AI Understands Code](#how-the-ai-understands-code)
- [What This Project Actually Teaches](#what-this-project-actually-teaches)

---

A full-stack AI platform that ingests any public GitHub repository into a vector database and lets you chat with the codebase in plain English. Ask "how is routing implemented?" and the AI retrieves the relevant source files, synthesizes an answer, and cites the exact file paths — no manual code reading required.

---

## Project Overview

AI GitHub Repo Explainer is a RAG-powered developer tool for engineers who need to quickly understand unfamiliar codebases. It combines a LangChain tool-calling agent, ChromaDB vector search, and local sentence-transformer embeddings to turn any GitHub repository into a conversational knowledge base.

Engineers stop manually tracing function calls and reading through hundreds of files. Instead they paste a GitHub URL, wait 20–30 seconds for ingestion, then ask plain-English questions: _"What does this repo do?"_, _"How are dependencies injected?"_, _"What's the main entry point?"_ — and get grounded answers with file references streaming in real time.

---

## Problem Statement

Every engineer has faced the cost of onboarding into an unfamiliar codebase. Reading through hundreds of files, tracing function calls, understanding architecture decisions — it can take days or weeks. This problem is worse in:

- **Code reviews** — reviewers lack context on large PRs
- **Incident response** — on-call engineers unfamiliar with a service need to understand it fast
- **Open source exploration** — evaluating a library means reading its source manually
- **Team onboarding** — new engineers spend weeks just understanding the repo structure

Existing tools (GitHub search, grep, IDE navigation) are file-level. They don't answer questions like _"how is auth implemented across this service?"_ — that requires reading 6 files and mentally synthesizing them. AI GitHub Repo Explainer does that synthesis automatically.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser (Next.js UI — port 3000)             │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Repo        │  │  Chat Panel      │  │  Metrics / Logs  │  │
│  │  Explorer    │  │  (repo selector) │  │  Architecture    │  │
│  └──────┬───────┘  └────────┬─────────┘  └──────────────────┘  │
└─────────┼───────────────────┼────────────────────────────────────┘
          │ SSE (ingestion     │ SSE (token stream)
          │ progress)          │
┌─────────▼───────────────────▼────────────────────────────────────┐
│                    FastAPI Backend (port 8000)                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Ingestion Pipeline                        │ │
│  │  GitHub URL → fetch tree → fetch 50 files → chunk → embed   │ │
│  └──────────────────────────────┬──────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              LangChain Tool-Calling Agent                    │ │
│  │   ┌────────────────────┐   ┌─────────────────────────────┐  │ │
│  │   │   search_repo      │   │   get_repo_metadata         │  │ │
│  │   │   (ChromaDB RAG)   │   │   (GitHub REST API)         │  │ │
│  │   └──────────┬─────────┘   └──────────────┬──────────────┘  │ │
│  └──────────────┼──────────────────────────────┼────────────────┘ │
└─────────────────┼──────────────────────────────┼──────────────────┘
                  │                              │
      ┌───────────▼──────────┐       ┌───────────▼──────────┐
      │  ChromaDB (port 8001)│       │  GitHub REST API      │
      │  all-MiniLM-L6-v2    │       │  (metadata + stats)   │
      │  cosine similarity   │       └───────────────────────┘
      └──────────────────────┘

Deployment (AWS):
┌──────────────────────────────────────────────────────────────────┐
│  AWS EC2 (t3.medium)  ←  Terraform provisioned                   │
│  Docker Compose stack (frontend + backend + chromadb)            │
│  ShopFlow demo app (frontend:3002 + backend:8020)                │
│  Security group: ports 22, 3000, 3002, 8000, 8020               │
│  IAM role + SSH key pair managed by Terraform                    │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Next.js Frontend** | SaaS dashboard — repo explorer, chat with repo selector, logs, metrics, architecture |
| **FastAPI Backend** | REST + SSE endpoints, ingestion pipeline orchestration, agent lifecycle |
| **Ingestion Pipeline** | Fetch tree → select files → chunk → embed → store in ChromaDB |
| **LangChain Tool-Calling Agent** | Multi-step reasoning, tool selection, streaming response generation |
| **search_repo Tool** | Semantic code search via ChromaDB cosine similarity |
| **get_repo_metadata Tool** | Live GitHub repo stats — stars, language, forks, description |
| **ChromaDB** | Local vector database storing code chunks with repo/file/chunk metadata |
| **sentence-transformers** | Local, free embeddings — all-MiniLM-L6-v2 (384-dim, CPU-compatible) |
| **Groq (primary) / Ollama (fallback)** | LLM inference — configurable via env |

---

## Tech Stack

| Technology | Role | Why Chosen |
|------------|------|------------|
| Next.js 14 | Frontend framework | App router, SSE support, fast builds |
| Tailwind CSS | Styling | Rapid dark-theme dashboard UI |
| FastAPI | Backend API | Async-first, SSE streaming, auto-docs |
| LangChain 0.3 | Agent orchestration | Tool-calling agent, callbacks, streaming |
| Groq + llama-3.1-8b-instant | LLM (primary) | Free tier, ~180 tok/s, cloud-hosted |
| Ollama + llama3 | LLM (fallback) | Local, zero cost, no data leakage |
| sentence-transformers all-MiniLM-L6-v2 | Embeddings | Free, local, CPU-compatible, 384-dim |
| ChromaDB | Vector database | Embedded-first, easy Docker deployment |
| GitHub REST API v3 | Repo data source | File tree, content fetch, metadata, rate limit headers |
| Docker Compose | Local + AWS deployment | Single-command stack startup |
| AWS EC2 (t3.medium) | Cloud deployment | Runs full stack — enough RAM for sentence-transformers |
| Terraform | Infrastructure as code | EC2, security group, IAM role, SSH key provisioning |

---

## System Workflow

1. Engineer pastes a GitHub URL in the **Explore** tab and clicks Analyze
2. Frontend POSTs to `POST /api/repos/ingest` and opens an SSE connection for progress
3. **IngestionService** fetches repo metadata, recursive file tree, and up to 50 key files via GitHub REST API
4. Files are chunked into 100-line segments with 10-line overlap, each prefixed with file path
5. **sentence-transformers** encodes all chunks locally — no external embedding API needed
6. Chunks are stored in ChromaDB with `{repo_name, file_path, chunk_index}` metadata
7. Engineer goes to **Chat**, selects the indexed repo from the dropdown
8. Question is POSTed to `POST /api/chat` — agent enriches it with repo context
9. **LangChain agent** calls `search_repo` → ChromaDB returns the 5 most relevant code chunks
10. Agent may also call `get_repo_metadata` for stats questions (stars, language, forks)
11. Final tokens stream via asyncio Queue → SSE → frontend renders in real time

---

## Results

The platform enables instant codebase comprehension without reading a single file manually:

- **Architecture questions** → agent retrieves entry points and top-level structure from indexed files
- **Implementation questions** → agent returns the specific source files and code snippets that answer the question
- **Stats questions** → agent calls `get_repo_metadata` live and returns stars, language, forks
- **Cross-file questions** → agent synthesizes across multiple retrieved chunks into a single coherent answer

Example — ingesting `tiangolo/fastapi` (342 chunks, ~25 seconds):
- _"How is dependency injection implemented?"_ → references `fastapi/dependencies.py` with code
- _"What's the main entry point?"_ → references `fastapi/applications.py`
- _"How many stars does this repo have?"_ → live GitHub API call, returns current count

---

## Challenges and Learnings

- **Chunking strategy for code**: Line-based chunking (100 lines, 10-line overlap) works better than character-based for source code — it preserves function boundaries more reliably
- **File selection priority**: Fetching all files in a large repo hits GitHub rate limits fast; a priority scoring system (README first, then source files by extension and path depth) gives the best coverage within 50 files
- **sentence-transformers cold start**: The model downloads ~90MB on first run and loads into memory — backend startup appears slow but is a one-time cost; subsequent queries are fast
- **SSE for ingestion progress**: Streaming ingestion progress (not just the final result) dramatically improves perceived performance — users see each file being processed instead of a blank spinner for 30 seconds
- **ChromaDB metadata filtering**: Scoping vector search to a specific repo (`where={"repo_name": {"$eq": repo_name}}`) is essential — without it, results bleed across repos when multiple are indexed
- **GitHub base64 decoding**: File content from the GitHub API is base64-encoded; binary files (images, compiled artifacts) must be detected and skipped before decoding to avoid garbage chunks

---

## Installation

### Prerequisites

- Docker + Docker Compose
- Python 3.11+ (for local development only)
- Node.js 20+ (for local frontend development only)

### Environment Variables

```bash
cp .env.example .env
# Required: GROQ_API_KEY
# Recommended: GITHUB_TOKEN (5000 req/hr vs 60 unauthenticated)
```

### Step 1 — Start the Stack

```bash
cd projects/02-ai-github-repo-explainer
cp .env.example .env
docker-compose up -d --build
```

| Service | Port | Description |
|---------|------|-------------|
| Frontend (Next.js) | 3000 | Dashboard UI |
| Backend (FastAPI) | 8000 | API + agent |
| ChromaDB | 8001 | Vector database |

### Deploy to AWS EC2

> Full guide: [`docs/aws-deployment.md`](docs/aws-deployment.md)

**Prerequisites:** [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5, AWS CLI configured (`aws configure`)

```bash
cd projects/02-ai-github-repo-explainer/infra/aws/terraform

# Step 1 — Create your variables file
cat > terraform.tfvars <<EOF
github_repo_url = "https://github.com/ThinkWithOps/ai-devops-systems-lab"
github_token    = "your_github_token"
groq_api_key    = "your_groq_api_key"
EOF

# Step 2 — Initialise Terraform (downloads AWS provider)
terraform init

# Step 3 — Preview what will be created
terraform plan

# Step 4 — Provision the infrastructure
terraform apply
```

Terraform creates everything automatically: EC2 `t3.medium`, security group (ports 22, 3000, 3002, 8000, 8020), IAM role, and SSH key pair saved to `infra/aws/ai-github-repo-explainer.pem`. The instance bootstraps itself on first boot — Docker install, repo clone, and `docker-compose up -d` all run automatically.

Wait **3–5 minutes** after `terraform apply` for the bootstrap to complete, then open the URLs from the Terraform output.

> **Note:** Use `t3.medium` minimum — sentence-transformers needs more than 1GB RAM. `t2.micro` will OOM.
> **Cost warning:** `t3.medium` ~$0.047/hr (~$1.13/day). Stop or terminate the instance when not recording.

**Verify bootstrap completed:**
```bash
ssh -i infra/aws/ai-github-repo-explainer.pem ubuntu@<EC2_IP> \
  "tail -20 /var/log/repo-explainer-setup.log"
```

**Update after a code push:**
```bash
cd infra/aws/scripts
./deploy.sh    # auto-reads IP and key from Terraform outputs
```

**Tear down:**
```bash
cd infra/aws/terraform
terraform destroy
```

---

### Step 2 — Ingest a Sample Repo (Optional)

```bash
# With the stack running, pre-ingest the FastAPI repo as a demo
python vectorstore/ingest_sample.py
```

### Local Development

```bash
# Terminal 1: ChromaDB
docker run -d -p 8001:8000 -v chroma-data:/chroma/chroma \
  -e IS_PERSISTENT=TRUE chromadb/chroma:0.5.5

# Terminal 2: Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 3: Frontend
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

---

## Usage

| URL | Purpose |
|-----|---------|
| `http://localhost:3000` | Dashboard home — KPIs, recent repos, quick start |
| `http://localhost:3000/explore` | Paste GitHub URL, trigger ingestion, view repo list |
| `http://localhost:3000/chat` | Chat with indexed repo — select from dropdown |
| `http://localhost:3000/agents` | Agent run history and tool call timeline |
| `http://localhost:3000/logs` | Searchable log viewer |
| `http://localhost:3000/metrics` | Charts: query volume, response time, tool usage |
| `http://localhost:3000/architecture` | System architecture diagram |
| `http://localhost:8000/docs` | FastAPI auto-generated API docs |

### Demo Scenario

1. Open `http://localhost:3000/explore`
2. Paste `https://github.com/tiangolo/fastapi` → click **Analyze**
3. Watch progress stream: fetching metadata → tree → 48 files → 342 chunks → indexed
4. Go to **Chat** → select `tiangolo/fastapi` from the repo dropdown
5. Ask:
   - _"What does this repo do?"_ — agent calls `search_repo` + `get_repo_metadata`
   - _"How is dependency injection implemented?"_ — references `fastapi/dependencies.py`
   - _"How many GitHub stars does this repo have?"_ — calls `get_repo_metadata` live

---

## Project Structure

```text
02-ai-github-repo-explainer/
  frontend/
    app/
      page.tsx                   # Dashboard — KPI cards, quick start
      explore/page.tsx           # Repo ingestion — URL input, progress, repo list
      chat/page.tsx              # Chat interface with repo selector
      agents/page.tsx            # Agent activity history
      logs/page.tsx              # Log viewer
      architecture/page.tsx      # System diagram
      metrics/page.tsx           # Charts
      settings/page.tsx          # Config and service status
    components/
      layout/                    # Header, Sidebar, LiveLogStrip
      dashboard/                 # KPICard, ChatPanel, RepoExplorer, AgentActivityFeed, MetricsChart
    lib/api.ts                   # Typed API client with SSE streaming helper
  backend/
    app/
      api/routes/                # FastAPI routers: repos (ingest, list, delete, tree), chat, health
      agents/                    # RepoAgent + tools (search_repo, get_repo_metadata)
      services/                  # GitHubService, VectorService, IngestionService
      schemas/                   # Pydantic request/response models
      config.py                  # pydantic-settings environment config
      main.py                    # FastAPI app entry point
    requirements.txt
    Dockerfile
  vectorstore/
    ingest_sample.py             # Pre-ingest demo repos (FastAPI, etc.)
  infra/
    aws/
      terraform/                 # main.tf, variables.tf, outputs.tf — EC2 + security group + IAM
      scripts/
        setup.sh.tpl             # EC2 bootstrap — Docker, repo clone, docker-compose up
        deploy.sh                # Pull latest code and restart stack on EC2
  docs/
    architecture.md              # Detailed architecture documentation
    aws-deployment.md            # Step-by-step AWS EC2 deployment guide
  docker-compose.yml
  .env.example
  .env.aws.example               # AWS environment template
  README.md
```

---

## Cleanup

```bash
# Stop all containers
docker-compose down

# Remove volumes (deletes ChromaDB data)
docker-compose down -v

# Remove built images
docker-compose down --rmi all
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `GitHub API rate limit exceeded` | Set `GITHUB_TOKEN` in `.env` — 5000 req/hr vs 60 unauthenticated |
| `No results found for query` | Repo not indexed yet — go to `/explore` and ingest it first |
| `ChromaDB connection failed` | Check `docker-compose ps` → chromadb container must be healthy on port 8001 |
| `Groq rate limit (429)` | Wait 30s or remove `GROQ_API_KEY` to fall back to Ollama |
| `sentence-transformers slow first run` | Model downloads ~90MB on first use — normal, fast after that |
| `File skipped (too large)` | Files over 50KB are excluded — expected for generated or binary files |
| Frontend shows `Connecting...` | Backend not running — check `docker-compose logs backend` |
| `docker compose` not found | Use `docker-compose` (V1) — `docker compose` V2 is not required |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Service health — Groq + ChromaDB connectivity |
| `POST` | `/api/repos/ingest` | SSE stream — ingest GitHub repo into ChromaDB |
| `GET` | `/api/repos` | List all indexed repos |
| `DELETE` | `/api/repos/{repo_name}` | Delete repo chunks from ChromaDB |
| `GET` | `/api/repos/{owner}/{repo}/tree` | Proxy GitHub file tree |
| `POST` | `/api/chat` | SSE streaming chat — runs the repo agent |

---

## How the AI Understands Code

The AI doesn't "understand" code in a traditional sense. Here's what actually happens:

1. **Files are chunked** into 100-line segments, each with a file path header
2. **all-MiniLM-L6-v2** converts each chunk into a 384-dimensional vector capturing semantic meaning
3. **ChromaDB** stores these vectors and enables cosine similarity search scoped to the repo
4. When you ask _"how is auth implemented?"_, the query is vectorized and the closest matching chunks are retrieved
5. These chunks (actual source code) are injected into the LLM context window
6. **Groq llama-3.1-8b** synthesizes an answer from the source code, citing specific files

This is Retrieval-Augmented Generation (RAG) applied to GitHub repositories — the LLM never hallucinates file names because it only answers from retrieved code.

---

## What This Project Actually Teaches

### Skills at a Glance

| What You Built | Skill It Demonstrates |
|---|---|
| LangChain agent with 2 custom tools | AI orchestration + tool use |
| GitHub REST API ingestion pipeline | External API integration + rate limit handling |
| sentence-transformers local embeddings | Embedding models without external API cost |
| ChromaDB with metadata-scoped search | Vector database with multi-tenant filtering |
| SSE streaming for ingestion progress | Real-time backend engineering |
| Chunked code indexing with overlap | RAG chunking strategy for source code |
| Repo-scoped chat with dropdown selector | Multi-repo vector search filtering |
| Full Docker Compose stack (3 services) | Container deployment |

### AI Engineering
- Building a RAG pipeline from scratch — fetch, chunk, embed, store, retrieve, synthesize
- Tool-calling agent design — when to call `search_repo` vs `get_repo_metadata` vs answer from knowledge
- Local embeddings with sentence-transformers — zero API cost, CPU-compatible
- Streaming LLM responses with SSE in a production API
- Metadata filtering in vector search — scoping results to a specific collection subset

### DevOps + Cloud
- Docker Compose multi-service stack with networking between frontend, backend, and ChromaDB
- GitHub REST API integration — recursive tree fetch, base64 file content, rate limit detection
- Prometheus-ready FastAPI backend with structured logging

### System Design
- Ingestion pipeline design — prioritizing which files to fetch within API rate limits
- Async/sync boundary management — sentence-transformers and requests are synchronous; FastAPI is async
- SSE for long-running operations — streaming progress for a 20–45 second ingestion job

### The Core Problem This Solves

> *"If you need to understand a 500-file codebase in 10 minutes — not 2 days — can AI do that for you?"*

The answer is yes, with caveats. The AI returns grounded answers with file citations, not hallucinated summaries. It works on any public GitHub repo with no configuration beyond a URL.

### Key Engineering Lessons

- **Metadata filtering is non-negotiable for multi-repo RAG**: Without `where={"repo_name": ...}`, results bleed across all indexed repos — ChromaDB returns semantically similar chunks from the wrong repository
- **Priority file selection beats fetching everything**: 50 well-chosen files (README, entry points, core source) give better coverage than 200 random files — and stay within GitHub's unauthenticated rate limit
- **Line-based chunking preserves function boundaries better than character-based**: 100-line chunks align with how functions are actually written in most languages — character chunking splits in the middle of methods
- **SSE progress transforms UX for slow pipelines**: A 30-second ingestion with visible per-file progress feels fast; the same 30 seconds with a blank spinner feels broken
- **sentence-transformers cold start is a deployment surprise**: First backend request triggers model download — add a startup warmup call in production or document the 20-second first-request delay clearly

---

## 🎬 YouTube Video

**Watch the full tutorial:** [ThinkWithOps — AI GitHub Repo Explainer](https://youtube.com/@thinkwithops)

---

## 📝 License

MIT License — free to use for learning and personal projects.

---

## 📧 Contact

- **YouTube:** [@ThinkWithOps](https://youtube.com/@thinkwithops)
- **LinkedIn:** [@LinkedIn](https://www.linkedin.com/in/b-vijaya/)

---

**⭐ If this helped you, please star the repo and subscribe to the YouTube channel!**
