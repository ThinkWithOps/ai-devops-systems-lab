# AI Infrastructure Diagram Generator

> Paste Terraform HCL into a browser UI and get a visual architecture diagram + AI-generated summary in seconds — no manual diagramming required.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Terraform](https://img.shields.io/badge/Terraform-BSL_1.1-purple.svg)](https://www.hashicorp.com/bsl)
[![Next.js](https://img.shields.io/badge/Next.js-MIT-black.svg)](https://github.com/vercel/next.js/blob/canary/license.md)
[![FastAPI](https://img.shields.io/badge/FastAPI-MIT-teal.svg)](https://github.com/fastapi/fastapi/blob/master/LICENSE)
[![LangChain](https://img.shields.io/badge/LangChain-MIT-green.svg)](https://github.com/langchain-ai/langchain/blob/master/LICENSE)
[![Groq](https://img.shields.io/badge/Groq-Free_Tier-orange.svg)](https://console.groq.com)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/docker-compose-blue.svg)](https://docs.docker.com/compose/)

**YouTube Tutorial:** [Watch the full walkthrough](https://youtube.com/@thinkwithops)

---

## Table of Contents

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
- [What the System Knows](#what-the-system-knows)
- [AWS Integration](#aws-integration)
- [What This Project Actually Teaches](#what-this-project-actually-teaches)

---

## Project Overview

**AI Infrastructure Diagram Generator** is a full-stack AI platform that turns raw Terraform HCL code into rendered architecture diagrams (Graphviz PNG or Mermaid flowchart) with an AI-generated human-readable summary. It is designed for DevOps engineers, platform teams, and architects who need to explain infrastructure visually without spending hours in Lucidchart or draw.io.

Target users: DevOps engineers, platform teams, solutions architects, SREs presenting infrastructure reviews.

---

## Problem Statement

Infrastructure-as-code is the source of truth for modern cloud systems — but it is nearly unreadable to non-engineers and difficult to visualize even for experienced DevOps practitioners. When presenting architecture to:

- Engineering managers
- Security reviewers
- New team members
- Compliance auditors

...engineers typically spend 30–60 minutes manually recreating a diagram that already exists implicitly in the Terraform code. This tool eliminates that manual step by parsing the HCL directly and generating both a visual diagram and a plain-English summary automatically.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Browser (Next.js UI — port 3000)                 │
│  ┌──────────────────┐  ┌───────────────────┐  ┌─────────────────┐  │
│  │  Terraform Input │  │  Diagram Viewer   │  │  Metrics / Logs │  │
│  │  + Title/Style   │  │  PNG or Mermaid   │  │  Agent Feed     │  │
│  └────────┬─────────┘  └───────────────────┘  └─────────────────┘  │
└───────────┼─────────────────────────────────────────────────────────┘
            │ POST /api/diagrams/generate/stream (NDJSON)
┌───────────▼─────────────────────────────────────────────────────────┐
│                    FastAPI Backend (port 8000)                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  LangChain Agent Pipeline                     │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │   │
│  │  │ HCL Parser  │→ │ Conn Infer   │→ │ Graphviz / Mermaid │  │   │
│  │  │ (hcl2)      │  │ (attr scan)  │  │ Renderer           │  │   │
│  │  └─────────────┘  └──────────────┘  └─────────┬──────────┘  │   │
│  │  ┌─────────────────────────────────────────────▼──────────┐  │   │
│  │  │  LLM Summarizer    │    Persistence Layer               │  │   │
│  │  │  Bedrock Haiku (1) │    S3 PNG upload (1)               │  │   │
│  │  │  Ollama llama3 (2) │    DynamoDB history (1)            │  │   │
│  │  │                    │    ChromaDB (2)                    │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  /output/*.png  (static file serving — local fallback)              │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                    │
┌────────▼──────┐   ┌─────────▼──────┐   ┌────────▼──────────────┐
│  S3 (AWS) (1) │   │ DynamoDB (1)   │   │  ChromaDB (port 8001) │
│  diagram PNGs │   │ diagram history│   │  local fallback   (2) │
│  presigned URL│   │ PAY_PER_REQUEST│   └───────────────────────┘
└───────────────┘   └────────────────┘

Deployment (AWS):
┌─────────────────────────────────────────────────────────────────────┐
│  EC2 t3.micro (Ubuntu 22.04)  ←  Terraform provisioned             │
│  Docker Compose stack (frontend:3000 + backend:8000 + chromadb)    │
│  IAM instance profile → Bedrock + S3 + DynamoDB (no keys needed)   │
│  Security group: ports 22, 3000, 8000                              │
│  (1) = AWS mode   (2) = local fallback                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|---|---|
| **Next.js Frontend** | SaaS dashboard — Terraform input, diagram viewer, agent feed, metrics, history |
| **FastAPI Backend** | NDJSON streaming endpoint, static PNG serving, agent lifecycle, startup provisioning |
| **HCL Parser** | Parse Terraform HCL2 via python-hcl2; regex fallback for malformed inputs |
| **Connection Inferencer** | Scan resource attributes for cross-references, build dependency graph |
| **Graphviz Renderer** | Produce DOT source → render PNG with per-provider subgraph clustering |
| **Mermaid Renderer** | Generate flowchart string for browser-side rendering via mermaid.js |
| **Bedrock Claude Haiku** | AWS LLM — architecture summary when AWS_BEDROCK_ENABLED=true |
| **Groq llama3-8b-8192** | Primary LLM fallback — fast, free tier, no local install required |
| **Groq llama3-8b-8192** | Primary local LLM — fast, free tier, no local install required |
| **S3** | Primary diagram PNG storage — persistent across restarts, presigned URLs |
| **DynamoDB** | Primary history store — PAY_PER_REQUEST, no container dependency |
| **ChromaDB** | Local fallback vector store for diagram history when DynamoDB is disabled |

---

## Tech Stack

| Technology | Role | Why It Was Chosen |
|---|---|---|
| Next.js 14 | Frontend dashboard UI | App Router, streaming fetch support, fast dev |
| Tailwind CSS | Styling | Utility-first, dark-mode-friendly, consistent theming |
| FastAPI | Backend API | Async, NDJSON streaming, Pydantic schemas |
| python-hcl2 | Terraform parser | Native HCL2 support in Python |
| Graphviz | Diagram rendering | De-facto standard for DOT-based graph visualization |
| LangChain | AI orchestration | Clean pipeline abstraction, easy LLM swap |
| Groq (llama3-8b-8192) | Primary LLM | Free tier, fast inference, no local install |
| ChromaDB | Vector store history | Lightweight local vector DB, no external service |
| Docker Compose | Local deployment | Single-command startup for all services |

---

## System Workflow

1. User pastes Terraform HCL into the code editor panel
2. User sets a diagram title and picks style (Graphviz or Mermaid)
3. Frontend opens a streaming POST to `/api/diagrams/generate/stream`
4. Agent emits `AgentStep` events: Parse → Infer → Render → Summarize → Store
5. Each step appears live in the Agent Activity feed
6. Final `DiagramResult` is embedded in the last stream event
7. Dashboard renders the diagram image, AI summary, and resource list
8. Result is persisted in ChromaDB for history and metrics

---

## Results

- Parses 10–50 resource Terraform files in under 200ms
- Generates Graphviz PNG diagrams in ~1s
- Ollama llama3 summary adds 3–8s (local, no API cost)
- Full pipeline end-to-end: ~5–10s on a standard laptop
- Supports AWS, Azure, GCP, Kubernetes resource types
- Handles malformed HCL via regex fallback parser

---

## Challenges and Learnings

- **Graphviz subgraph clustering** requires careful color management to avoid unreadable overlap — solved by per-provider subgraphs with transparent fill.
- **HCL2 vs HCL1** — `python-hcl2` only handles HCL2 (Terraform 0.12+). Added a regex fallback for legacy configs.
- **Connection inference without a full dependency graph** — scanning attribute strings for resource references is imperfect but practical for 80% of real configs.
- **NDJSON streaming with FastAPI** — `StreamingResponse` with `application/x-ndjson` and async generators works cleanly but requires the frontend to handle partial JSON lines carefully.

---

## Installation

### Prerequisites

- Docker + Docker Compose, **or** Python 3.11+ and Node 20+
- [Ollama](https://ollama.com) installed locally (for AI summaries)
- Graphviz system package (only needed for non-Docker local dev)

### Option A — Docker Compose (recommended)

```bash
git clone <repo>
cd projects/03-ai-infrastructure-diagram-generator
cp .env.example .env

# Pull Ollama model (run outside Docker)
ollama pull llama3

docker-compose up --build
```

Open [http://localhost:3000](http://localhost:3000)

### Option B — Manual Local Dev

```bash
# 1. Start ChromaDB
docker run -p 8001:8000 chromadb/chroma

# 2. Backend
cd backend
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload

# 3. Frontend
cd ../frontend
npm install
npm run dev
```

---

## Usage

1. Open [http://localhost:3000](http://localhost:3000)
2. The dashboard loads with a sample AWS Terraform snippet pre-filled
3. Click **Generate Diagram** — watch the Agent Activity panel update in real time
4. The rendered PNG appears in the center panel
5. AI summary and resource breakdown appear in the Insights panel
6. Visit `/results` to browse diagram history
7. Visit `/metrics` to see provider usage charts

**Seed demo data:**
```bash
python scripts/seed_demo.py
```

---

## Project Structure

```text
03-ai-infrastructure-diagram-generator/
├── frontend/               # Next.js 14 dashboard
│   └── src/
│       ├── app/            # Pages: dashboard, agents, logs, metrics, results, architecture, settings
│       ├── components/     # layout/, ui/, diagram/
│       └── lib/api.ts      # API client with streaming support
├── backend/                # FastAPI application
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── routes/         # diagrams, health, history, metrics
│       ├── schemas/        # Pydantic models
│       ├── services/       # terraform_parser, diagram_generator, vector_store
│       └── agents/         # diagram_agent.py (LangChain pipeline)
├── docs/                   # architecture.md
├── scripts/                # setup.sh, seed_demo.py
├── docker-compose.yml
└── .env.example
```

---

## Cleanup

```bash
docker-compose down -v
# Removes containers, ChromaDB volume, and diagram output volume
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `hcl2` parse error | Check Terraform uses HCL2 syntax (Terraform 0.12+). Regex fallback activates automatically. |
| Graphviz not found | Install system package: `apt-get install graphviz` or `brew install graphviz` |
| Ollama timeout | Ensure `ollama serve` is running and `llama3` is pulled: `ollama pull llama3` |
| ChromaDB connection refused | Start ChromaDB: `docker run -p 8001:8000 chromadb/chroma` |
| CORS errors in browser | Ensure backend is on port 8000 and `NEXT_PUBLIC_API_URL` is set correctly |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /health | Backend health check |
| POST | /api/diagrams/generate | Generate diagram (returns full result) |
| POST | /api/diagrams/generate/stream | Generate diagram with NDJSON event stream |
| GET | /api/history | List all diagram history from ChromaDB |
| GET | /api/metrics | Aggregate metrics: totals, providers, averages |
| GET | /output/{id}.png | Download generated diagram PNG |

---

## What the System Knows

### Parsed from Terraform HCL
- All `resource` blocks and their types, names, and attributes
- Cross-resource references detected via attribute scanning
- Provider inferred from resource type prefix (aws_, azurerm_, google_, kubernetes_)

### LLM Context (Ollama llama3)
- Resource list with types, names, and provider
- Diagram title provided by the user
- Generates 3–5 sentence architecture description

### What It Cannot Do
- Cannot parse Terraform modules that reference external source URLs
- Cannot interpret complex `count` or `for_each` expressions into individual nodes
- Does not access live cloud accounts or running infrastructure state

---

## 📁 Documentation

| Doc | Description |
|-----|-------------|
| [`docs/architecture.md`](docs/architecture.md) | Full system architecture, data flow, agent pipeline, and component breakdown |
| [`docs/aws-deployment.md`](docs/aws-deployment.md) | Step-by-step AWS EC2 deployment guide |
| [`docs/aws-integration.md`](docs/aws-integration.md) | AWS services used, local vs AWS mode, cost estimate, cleanup |

---

## AWS Integration

> AWS mode is **opt-in**. The project runs fully locally without any credentials. Enable AWS services to improve responsiveness, persistence, and demo realism.

> **Cost notice:** Demo-level AWS usage costs less than $2/month. Always run `terraform destroy` after testing.

### AWS Services Used

| Service | Role | Local Fallback |
|---|---|---|
| **Bedrock Claude Haiku** | AWS LLM for architecture summaries — highest quality, low latency | Groq llama3-8b-8192 |
| **S3** | Stores generated PNG diagrams with presigned URLs — persistent across restarts | Local filesystem |
| **DynamoDB** | Diagram history and metrics — no container dependency | ChromaDB |

### Quick Enable

```bash
# 1. Provision infrastructure
cd infra/aws/terraform
cp terraform.tfvars.example terraform.tfvars  # edit bucket name
terraform init && terraform apply

# 2. Enable Bedrock model access in AWS Console → Bedrock → Model access
#    Request: Anthropic Claude Haiku

# 3. Paste terraform output env_block into .env, then:
docker-compose up --build
```

### Runtime Behaviour

The backend automatically detects which AWS services are configured at startup. Each service has an independent toggle — you can enable only S3, only Bedrock, or all three. Failures are logged and degraded gracefully to local alternatives.

### Ecommerce Demo

A full ecommerce platform sample is at `infra/aws/sample-ecommerce.tf`. Paste it into the UI to generate a 20-resource AWS diagram showing: CloudFront → ALB → ECS → RDS, ElastiCache, S3, SQS, Lambda, SNS, API Gateway.

### Cleanup

```bash
aws s3 rm s3://YOUR_BUCKET_NAME --recursive
cd infra/aws/terraform && terraform destroy
```

Full details: [docs/aws-integration.md](docs/aws-integration.md)

---

## What This Project Actually Teaches

### Skills at a Glance

| What You Built | Skill It Demonstrates |
|---|---|
| HCL parser service | Parsing structured domain-specific languages in Python |
| Connection inferencer | Graph construction from unstructured attribute references |
| Graphviz DOT renderer | Programmatic diagram generation with layout algorithms |
| NDJSON streaming endpoint | FastAPI async generators and streaming HTTP responses |
| LangChain pipeline | AI orchestration with tool chaining and LLM integration |
| Ollama integration | Running LLMs locally for zero-cost AI features |
| ChromaDB persistence | Vector store usage beyond RAG — metadata indexing and search |
| Next.js streaming fetch | Reading NDJSON streams in React with incremental state updates |

### AI Engineering
- Chaining deterministic parsing steps with LLM summarization in a single pipeline
- Graceful LLM fallback: static summary if Ollama is unavailable
- Prompt design for architecture description: specific, grounded, non-hallucinating

### DevOps + Cloud
- Terraform HCL2 structure and resource type taxonomy
- Multi-provider infrastructure awareness (AWS, Azure, GCP, Kubernetes)
- Docker Compose multi-service wiring with volume mounts and health dependencies

### System Design
- NDJSON streaming for progressive UI updates without WebSockets
- Async generator pattern for pipeline step emission
- Static file serving from FastAPI for binary outputs (PNG diagrams)

### The Core Problem This Solves

> Infrastructure-as-code is the most accurate representation of a system's architecture, but it is illegible to most stakeholders. This project bridges that gap by making diagram generation a zero-effort byproduct of writing Terraform — turning a 30-minute manual task into a 5-second automated one.

### Key Engineering Lessons

- **Streaming > polling for pipeline UX**: NDJSON streaming gives the UI a real-time feed of agent steps, which is far more engaging in demos than a spinner followed by a result.
- **Regex fallback is production-realistic**: Real Terraform in the wild often has syntax quirks that trip up strict parsers. A best-effort fallback prevents hard failures on imperfect input.
- **Graphviz subgraph clustering**: Grouping resources by provider into labeled clusters is the single biggest readability improvement for multi-cloud diagrams.
- **ChromaDB for non-RAG use cases**: Vector stores work well as lightweight document databases with metadata filtering, not just for semantic search.

---

## License

MIT

## Author

Built by [@thinkwithops](https://youtube.com/@thinkwithops) as part of the AI + DevOps 30-project portfolio series.
