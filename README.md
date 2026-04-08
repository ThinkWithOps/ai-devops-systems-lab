# AI DevOps Systems Lab

> 30 portfolio-grade AI + DevOps projects — built for engineers, shipped as a YouTube series.

[![Channel](https://img.shields.io/badge/YouTube-ThinkWithOps-red?logo=youtube)](https://youtube.com/@ThinkWithOps)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Projects](https://img.shields.io/badge/Projects-30-brightgreen)
![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20FastAPI%20%7C%20LangChain%20%7C%20Docker-informational)

---

## What This Is

A series of 30 fully working AI + DevOps platforms — each one a GitHub-ready portfolio project with a matching YouTube video. Every project ships with a frontend dashboard, FastAPI backend, AI agent layer, vector database, Docker deployment, and optional AWS integration.

Built with a local-first philosophy: everything runs on your machine with free tools. AWS is an optional realism layer, not a requirement.

---

## The 30 Projects

| # | Project | YouTube Title | Stack | Status |
|---|---------|---------------|-------|--------|
| 01 | [AI DevOps Copilot](projects/01-ai-devops-copilot) | I Built ChatGPT for DevOps Engineers | Next.js · FastAPI · LangChain · Groq · ChromaDB | ✅ Done |
| 02 | [AI GitHub Repo Explainer](projects/02-ai-github-repo-explainer) | This AI Understands Any GitHub Repository | React · FastAPI · LangChain · ChromaDB · GitHub API | ✅ Done |
| 03 | AI DevOps MCP Server | I Built an MCP Server That Lets Claude Control My Entire Infrastructure | Python · MCP SDK · Kubernetes Python Client · boto3 · Terraform CLI | 🔜 Next |

---

## Standard Tech Stack

Every project is built on the same foundation:

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | FastAPI, Python 3.11+ |
| AI Orchestration | LangChain, LangGraph, AutoGen |
| LLM | Groq (default), Ollama (local), OpenAI (optional) |
| Vector DB | ChromaDB, Weaviate, Pinecone |
| Deployment | Docker Compose, EC2 (optional) |
| Observability | Prometheus, Grafana |
| Cloud | AWS (optional — S3, DynamoDB, Bedrock) |

---

## How to Run Any Project

Each project folder contains its own `README.md` with full setup instructions. The standard local setup is:

```bash
cd projects/01-ai-devops-copilot
cp .env.example .env
# Add your GROQ_API_KEY to .env
docker-compose up --build
```

Then open `http://localhost:3000`.

---

## Repository Structure

```
ai-devops-systems-lab/
└── projects/
    ├── 01-ai-devops-copilot/
    ├── 02-ai-github-repo-explainer/
    ├── 03-ai-infrastructure-diagram-generator/
    └── ...
```

---

## Local-First Philosophy

- Every project runs without AWS credentials
- Groq free tier is the default LLM
- AWS is optional — add it when it improves demo realism
- No project requires a paid subscription to run locally

---

## Follow Along

New project every week. Subscribe to watch the full series being built live.

**YouTube:** [ThinkWithOps](https://youtube.com/@ThinkWithOps)
