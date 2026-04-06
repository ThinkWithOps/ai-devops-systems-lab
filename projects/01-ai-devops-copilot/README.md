# AI DevOps Copilot 🤖⚙️

> ChatGPT for DevOps Engineers — diagnose infrastructure problems, search runbooks, and monitor live apps in plain English

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/docker-compose-blue.svg)](https://docs.docker.com/compose/)

**YouTube Tutorial:** [Watch the full walkthrough](https://youtu.be/a50334Szt5g)

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
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Cleanup](#cleanup)
- [Troubleshooting](#troubleshooting)
- [API Endpoints](#api-endpoints)
- [What the Copilot Knows](#what-the-copilot-knows)
- [What This Project Actually Teaches](#what-this-project-actually-teaches)

---

A conversational AI platform for DevOps engineers that diagnoses infrastructure problems, answers DevOps questions, and monitors live applications — powered by a LangChain tool-calling agent and ChromaDB runbooks. Runs locally via Docker Compose or deploys to AWS EC2 with Terraform.

---

## Project Overview

AI DevOps Copilot is a full-stack AI operations platform built for platform and DevOps engineers. It surfaces a ChatGPT-style interface backed by a LangChain tool-calling agent that can search logs, retrieve DevOps runbook documentation, and monitor a live application — all in a single conversational turn.

Engineers stop context-switching between GitHub, dashboards, and docs and instead ask plain-English questions: _"What is wrong with the restaurant app right now?"_ or _"How do I fix a CrashLoopBackOff?"_ — and get grounded, tool-augmented answers streamed in real time.

---

## Problem Statement

DevOps engineers spend the majority of incident response time not fixing problems, but finding them. A typical debugging session involves:

- Opening GitHub Actions to find the failing workflow run
- Grepping through logs across multiple services
- Searching Confluence or Notion for the relevant runbook
- Context-switching between 4–6 browser tabs

This fragmented workflow is slow, error-prone, and blocks fast remediation. AI DevOps Copilot replaces that multi-tab workflow with a single conversational interface backed by live tool execution.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (Next.js UI — port 3000)            │
│  ┌──────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  Chat    │  │  Agent Activity  │  │  Metrics / Logs /    │  │
│  │  Panel   │  │  Feed            │  │  Architecture        │  │
│  └────┬─────┘  └──────────────────┘  └──────────────────────┘  │
└───────┼─────────────────────────────────────────────────────────┘
        │ SSE stream (text/event-stream)
┌───────▼─────────────────────────────────────────────────────────┐
│                  FastAPI Backend (port 8000)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │             LangChain Tool-Calling Agent                  │  │
│  │   ┌──────────┐  ┌────────────┐  ┌────────────────────┐   │  │
│  │   │ Log Tool │  │ Docs Tool  │  │ Restaurant Monitor │   │  │
│  │   └────┬─────┘  └─────┬──────┘  └──────────┬─────────┘   │  │
│  └────────┼──────────────┼────────────────────┼─────────────┘  │
└───────────┼──────────────┼────────────────────┼────────────────┘
            │              │                    │
   ┌────────▼───┐  ┌───────▼──────┐  ┌─────────▼──────┐
   │  ChromaDB  │  │ Groq / Ollama│  │ Restaurant API │
   │ (port 8001)│  │ (llama-3.1)  │  │ (port 8010)    │
   └────────────┘  └──────────────┘  └────────────────┘

Deployment:
┌──────────────────────────────────────────────────────┐
│  AWS EC2 (t3.medium)  ←  Terraform provisioned       │
│  Docker Compose stack (frontend + backend + chromadb) │
│  IAM role + security group managed by Terraform       │
└──────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Next.js Frontend** | SaaS dashboard UI — chat, agent feed, logs, metrics, architecture views |
| **FastAPI Backend** | REST + SSE endpoints, request routing, agent lifecycle management |
| **LangChain Tool-Calling Agent** | Multi-step reasoning, tool selection, streaming response generation |
| **Log Tool** | Semantic log search via ChromaDB + in-memory log buffer |
| **Docs Tool** | Retrieves DevOps runbooks and troubleshooting guides from ChromaDB |
| **Restaurant Monitor Tool** | Live monitoring of Bella Roma app — failures, health, stats, metrics |
| **ChromaDB** | Local vector database for docs and log embeddings |
| **Groq (primary) / Ollama (fallback)** | Groq cloud LLM (free tier) or local Ollama — configurable via env |
| **CloudWatch (optional)** | Real AWS log source when `CLOUDWATCH_ENABLED=true` on EC2 |

---

## Tech Stack

| Technology | Role | Why Chosen |
|------------|------|------------|
| Next.js 14 | Frontend framework | App router, SSE support, fast builds |
| Tailwind CSS | Styling | Rapid dark-theme dashboard UI |
| Recharts | Metrics charts | Lightweight, composable React charts |
| FastAPI | Backend API | Async-first, SSE streaming, auto-docs |
| LangChain 0.3 | Agent orchestration | Tool-calling agent, tool abstraction, callbacks |
| Groq + llama-3.1-8b-instant | LLM (primary) | Free tier, fast inference, cloud-hosted |
| Ollama + llama3 | LLM (fallback) | Local, zero cost, no data leakage |
| ChromaDB | Vector database | Embedded-first, easy Docker deployment |
| GitHub REST API | Optional data source | Available via `github_search` tool — not used in primary demo |
| Docker Compose | Local + AWS deployment | Single-command stack startup |
| Prometheus | Metrics scraping | Backend + ChromaDB observability |
| AWS EC2 | Cloud deployment | Run full stack on cloud hardware |
| AWS CloudWatch | Log source (optional) | Real log ingestion when deployed on AWS |
| Terraform | Infrastructure as code | EC2, security groups, IAM role provisioning |

---

## System Workflow

1. Engineer types a question in the Chat panel (e.g., _"What is wrong with the restaurant app?"_)
2. Frontend POSTs to `POST /api/chat` and opens an SSE connection
3. Backend initializes the LangChain tool-calling agent with 4 tools
4. Agent decides — call a tool or answer from knowledge directly
5. Each tool call and result is streamed back as a `tool_call` / `tool_result` SSE event
6. Final LLM tokens stream as `token` events — rendered in the chat bubble live
7. Agent Activity Feed updates in parallel, showing every reasoning step
8. LiveLogStrip at the bottom polls `/api/logs/search` continuously

---

## Results

The platform enables a complete incident investigation without leaving the browser:

- **Restaurant app failure** → copilot detects `slow_menu: ACTIVE`, explains impact, returns exact disable command
- **General DevOps question** → answered instantly from ChromaDB runbooks — no tool call needed
- **CrashLoopBackOff** → agent searches runbooks, returns Kubernetes remediation steps
- **502 Bad Gateway** → agent retrieves nginx troubleshooting guide and upstream health checks

All responses are grounded in actual tool results or runbook content, not hallucinated context.

---

## Challenges and Learnings

- **Streaming with ReAct agents**: LangChain's `AgentExecutor` is synchronous; bridging it to async SSE required `run_in_executor` + an asyncio Queue with a sentinel pattern.
- **ChromaDB cold start**: The HttpClient fails if ChromaDB isn't ready; the `VectorService` falls back to an ephemeral in-process client so the backend starts cleanly without the container.
- **ReAct prompt compatibility with Ollama**: Hub-pulled prompts assume OpenAI formatting; a custom `PromptTemplate` with explicit `{agent_scratchpad}` was required for llama3 compatibility.
- **SSE in Next.js**: The `next.config.js` rewrite proxy strips buffering headers; `X-Accel-Buffering: no` must be set on the FastAPI response.
- **Docker npm ci**: `npm ci` requires a lockfile; changed to `npm install` in the frontend Dockerfile since no `package-lock.json` is committed.
- **Next.js standalone output**: The multi-stage Dockerfile runner copies `.next/standalone`; `output: 'standalone'` must be set in `next.config.js` or the copy step fails.
- **Missing public directory**: Next.js doesn't create `public/` during build if the folder doesn't exist; added `public/.gitkeep` to satisfy the Dockerfile `COPY` step.
- **Nvidia GPU block**: The ollama service had a GPU reservation that fails on non-Nvidia / WSL environments; removed the `deploy.resources` block to run on CPU.

---

## Installation

### Prerequisites

- Docker + Docker Compose
- Ollama installed locally (`https://ollama.com`) **or** the ollama service runs inside the compose stack
- Python 3.11+ (for vectorstore seeding scripts only)
- Node.js 20+ (for local frontend development only)

### Environment Variables

**Local:**
```bash
cp .env.example .env
# Edit .env — set GITHUB_TOKEN for real GitHub data (optional, mock data works without it)
```

**AWS:**
```bash
cp .env.aws.example .env
# Edit .env — set EC2 public IP and optional GitHub token
```

### Step 1 — Start the Restaurant Demo App

The copilot monitors this live app, so start it first:

```bash
cd demo-app
docker-compose up -d --build
```

| Service | Port | Description |
|---------|------|-------------|
| Restaurant Frontend | 3001 | Storefront + operator dashboard |
| Restaurant Backend | 8010 | API + failure injection |

### Step 2 — Start the AI Copilot

```bash
cd ..
cp .env.example .env
docker-compose up -d --build
```

| Service | Port | Description |
|---------|------|-------------|
| Frontend (Next.js) | 3000 | Dashboard UI |
| Backend (FastAPI) | 8000 | API + agent |
| ChromaDB | 8001 | Vector database |
| Ollama | 11434 | Local LLM (fallback) |

### Deploy to AWS EC2

> Full guide: [`docs/aws-deployment.md`](docs/aws-deployment.md)

> The repo is automatically cloned to `~/app` during EC2 bootstrap. You do not need to clone it manually. SSH in after `terraform apply`, then run `docker-compose up -d` directly from `~/app/projects/01-ai-devops-copilot`.

```bash
cd infra/aws/terraform

# Create terraform.tfvars with your repo URL and region — no manual AWS Console steps needed
terraform init
terraform apply
```

Terraform creates everything automatically: EC2 instance, security group, IAM role, and SSH key pair. The private key is saved to `infra/aws/ai-devops-copilot.pem`. The instance bootstraps itself on first boot — Docker, Docker Compose, repo clone, and `docker-compose up -d` all run automatically.

**Update after a code push:**
```bash
cd infra/aws/scripts
./deploy.sh    # auto-reads IP and key from Terraform outputs
```

> **Cost warning:** Stop or terminate the EC2 instance when not actively demoing to preserve AWS credits.
> `t3.xlarge` ~$0.17/hr · `g4dn.xlarge` (GPU, faster Ollama) ~$0.53/hr

---

## Usage

| URL | Purpose |
|-----|---------|
| `http://localhost:3000` | Dashboard home — KPIs, architecture, health status |
| `http://localhost:3000/chat` | Main chat interface with agent activity feed |
| `http://localhost:3000/agents` | Agent run history and tool call timeline |
| `http://localhost:3000/logs` | Searchable log viewer with severity filters |
| `http://localhost:3000/metrics` | Charts: query volume, response time, tool usage |
| `http://localhost:3000/architecture` | System architecture diagram |
| `http://localhost:8000/docs` | FastAPI auto-generated API docs |

### Demo Scenario

> Replace `localhost` with your EC2 public IP when running on AWS.

**Full Incident Lifecycle Demo:**
1. Open the restaurant operator dashboard: `http://localhost:3001/operator`
2. Enable the `slow_menu` failure toggle — this injects a 2-second delay into the Menu API
3. Open the AI Copilot: `http://localhost:3000/chat`
4. Ask: _"What is wrong with the restaurant app right now?"_
5. Watch the live log strip — `restaurant_monitor` tool fires against the restaurant API
6. Copilot detects `slow_menu: ACTIVE` and returns exact remediation steps
7. Disable the toggle in the operator dashboard — menu loads instantly
8. Ask a general DevOps question: _"How do I troubleshoot a Docker container that keeps crashing?"_
9. Copilot answers instantly from knowledge — no tool call needed

---

## Project Structure

```text
01-ai-devops-copilot/
  frontend/                 # Next.js 14 dashboard UI
    app/                    # App router pages (chat, logs, metrics, agents, architecture)
    components/
      layout/               # Header, Sidebar, LiveLogStrip
      dashboard/            # KPICard, ChatPanel, AgentActivityFeed, ArchitectureViewer, MetricsChart, InsightsPanel
    lib/api.ts              # Typed API client with SSE streaming helper
  backend/
    app/
      api/routes/           # FastAPI routers: chat, logs, health
      agents/               # CopilotAgent + tools (log, docs, restaurant)
      services/             # VectorService, LogService, RestaurantService
      schemas/              # Pydantic request/response models
      config.py             # pydantic-settings environment config
  vectorstore/
    ingest.py               # ChromaDB seeding script
    sample_docs/            # DevOps runbooks (CI/CD, Kubernetes, common errors)
  infra/
    prometheus/             # Prometheus scrape config
    aws/
      terraform/            # main.tf, variables.tf, outputs.tf — EC2 + IAM + security group
      scripts/              # setup.sh.tpl (EC2 bootstrap), deploy.sh (update script)
  scripts/
    setup.sh                # One-command setup script
    seed_docs.py            # Standalone ChromaDB seeder
  docs/
    architecture.md         # Detailed architecture documentation
    aws-deployment.md       # Step-by-step AWS EC2 deployment guide
  docker-compose.yml
  .env.example
  .env.aws.example          # AWS environment template
```

---

## Cleanup

```bash
# Stop all containers
docker-compose down

# Remove volumes (deletes ChromaDB data and Ollama model cache)
docker-compose down -v

# Remove built images
docker-compose down --rmi all
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ollama: connection refused` | Start the compose stack first: `docker-compose up -d` |
| `llama3` model not found | Run `docker exec 01-ai-devops-copilot-ollama-1 ollama pull llama3` |
| `nvidia-container-cli` error on ollama start | GPU block removed from `docker-compose.yml`; runs on CPU by default |
| `npm ci` fails during frontend build | Dockerfile uses `npm install`; no lockfile required |
| `COPY public` fails during frontend build | `public/.gitkeep` ensures the directory exists |
| ChromaDB seeding fails | Ensure ChromaDB container is healthy: `docker-compose ps` → check port 8001 |
| Frontend shows "API unreachable" | Check `NEXT_PUBLIC_API_URL` in `.env` matches backend port |
| Agent hangs > 2 minutes | Llama3 cold inference is slow on CPU; first query can take 30–60s |
| GitHub endpoints return mock data | Set `GITHUB_TOKEN` in `.env` with a valid personal access token |
| `docker compose` not found | Use `docker-compose` (V1) — `docker compose` V2 is not required |
| Frontend shows error on AWS | Set `NEXT_PUBLIC_API_URL=http://<EC2_IP>:8000` in `.env` on the instance |
| CloudWatch returns no logs | Ensure `CLOUDWATCH_ENABLED=true` and EC2 IAM role has CloudWatch read access |
| EC2 bootstrap still running | SSH in and run `docker-compose logs -f` — llama3 pull (~4GB) can take 5–10 min |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Service health — Groq + ChromaDB connectivity |
| `POST` | `/api/chat` | SSE streaming chat — runs the tool-calling agent |
| `GET` | `/api/logs/search?q={query}` | Semantic log search |
| `POST` | `/api/logs/ingest` | Ingest log entries into ChromaDB |

---

## What the Copilot Knows

The copilot answers DevOps questions from two sources:
1. **ChromaDB runbooks** — 9 custom documents embedded as vectors (strong, specific answers)
2. **Llama 3.1 built-in knowledge** — general programming and tech knowledge from LLM training

### Trained Runbooks (ChromaDB)
| Topic | Coverage |
|---|---|
| Docker & Containers | Troubleshooting, networking, builds, registry |
| AWS | EC2, ECS, RDS, S3, IAM, CloudWatch |
| Kubernetes | Pods, deployments, services, debugging |
| CI/CD & GitHub Actions | Pipelines, deployment strategies, secrets |
| Terraform & IaC | State management, lifecycle, modules |
| Linux & Performance | CPU, memory, disk, network, processes |
| Python & FastAPI | Async patterns, connection pools, deployment |
| Security | Secrets management, container security, OWASP |
| Prometheus & Observability | Metrics, Grafana, PromQL, SLOs, alerting |

> **Note:** AI/ML topics are answered from the LLM's built-in knowledge — no custom AI runbooks are included. DevOps topics get the strongest, most specific answers.

### Live Monitoring
The copilot also has real-time access to the Bella Roma restaurant demo app — it can detect active failures, check health status, and pull live metrics on demand.

---

## What This Project Actually Teaches

### Skills at a Glance

| What You Built | Skill It Demonstrates |
|---|---|
| LangChain agent with 4 custom tools | AI orchestration + tool use |
| SSE streaming from FastAPI to Next.js | Real-time backend engineering |
| ChromaDB vector search for logs + docs | RAG / semantic search / embeddings |
| Terraform EC2 deployment with IAM + security groups | Infrastructure as Code |
| Full Docker Compose stack (5 services) | Container deployment |
| Groq / Ollama LLM integration with fallback | LLM API integration |
| SaaS-style dashboard with dark theme | Frontend engineering |
| CloudWatch log ingestion on AWS | Cloud observability |
| Restaurant demo app with failure injection | Realistic target system for AI monitoring |
| Async/sync bridge for LangChain in FastAPI | Python async engineering |
| Live cross-service monitoring via HTTP tool | Distributed system integration |

### AI Engineering
- Building an AI agent with multiple tools — not just a chatbot, it **reasons and acts**
- Tool calling vs ReAct pattern — why native function calling is more reliable than text-based parsing
- Streaming LLM responses with SSE in a production API
- RAG (Retrieval Augmented Generation) — ChromaDB vector search for docs and logs
- Prompt engineering for agent behavior and tool selection

### DevOps + Cloud
- Full AWS deployment with Terraform (EC2, security groups, IAM roles)
- Docker Compose multi-service stack management
- Prometheus metrics and observability
- Chaos engineering — intentionally injecting failures to test monitoring and AI detection

### System Design
- Connecting two independent services (copilot → restaurant app via HTTP tool)
- Async/sync boundary management (LangChain in async FastAPI)
- Event-driven streaming architecture (SSE from backend to frontend)

### The Core Problem This Solves

> *"If something breaks in production at 2am, can an AI help you find it faster than manually checking dashboards?"*

The restaurant app exists to answer that question. When `kitchen_down` is active, the copilot detects it from live Prometheus metrics, retrieves the runbook, and tells you exactly what to disable — without you opening a single dashboard.

### Key Engineering Lessons

- **Tool calling vs ReAct**: `create_tool_calling_agent` (native function calling) is far more reliable than text-based ReAct parsing with open-source LLMs — ReAct depends on strict format compliance that smaller models frequently fail
- **SSE streaming with agents**: LangChain's `AgentExecutor` is synchronous; bridging it to async SSE required `run_in_executor` + an asyncio Queue with a sentinel pattern
- **Token filtering**: `on_llm_new_token` fires for tool call encoding chunks too — filter by `chunk.tool_call_chunks` to avoid leaking internal function call JSON to the user
- **Final answer race condition**: Capturing the agent's final answer from `executor.invoke()` return value is more reliable than the `on_agent_finish` callback, which can lose the race against the stream sentinel
- **Terraform instance stability**: `most_recent = true` on AMI data sources causes instance replacement on every apply — use `lifecycle { ignore_changes = [ami, user_data, instance_type] }` to keep the instance alive
- **ChromaDB cold start**: The HttpClient fails if ChromaDB isn't ready; `VectorService` falls back to an ephemeral in-process client so the backend starts cleanly
- **Next.js SSE proxy**: The `next.config.js` rewrite proxy strips buffering headers; `X-Accel-Buffering: no` must be set on the FastAPI response
- **structlog duplicate event**: In structlog, the first positional argument IS the `event` — passing `event=` as a keyword argument alongside it raises `multiple values for argument 'event'`

---

## 📁 Documentation

| Doc | Description |
|-----|-------------|
| [`docs/architecture.md`](docs/architecture.md) | Full system architecture, data flow, and component breakdown |
| [`docs/aws-deployment.md`](docs/aws-deployment.md) | Step-by-step AWS EC2 deployment guide |
| [`docs/interview.md`](docs/interview.md) | Interview prep — STAR story, architecture walk, tech deep dives, and Q&A |

---

## 🎬 YouTube Video

**Watch the full tutorial:** [ThinkWithOps — AI DevOps Copilot](https://youtube.com/@thinkwithops)

---

## 📝 License

MIT License — free to use for learning and personal projects.

---

## 📧 Contact

- **YouTube:** [@ThinkWithOps](https://youtube.com/@thinkwithops)
- **LinkedIn:** [@LinkedIn](https://www.linkedin.com/in/b-vijaya/)

---

**⭐ If this helped you, please star the repo and subscribe to the YouTube channel!**

