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
| 03 | [AI Infrastructure Diagram Generator](projects/03-ai-infrastructure-diagram-generator) | AI Turns Terraform Code Into Architecture Diagrams | Next.js · FastAPI · Graphviz · LangChain · Groq | ✅ Done |
| 04 | AI DevOps Runbook RAG Assistant | I Made Our 500-Page DevOps Runbook Searchable With AI | Next.js · FastAPI · LangChain RAG · ChromaDB · Redis | 🔜 Planned |
| 05 | AI DevOps ChatOps Bot | I Put an AI DevOps Engineer Inside Slack | Slack API · FastAPI · LangChain · Redis · Ollama | 🔜 Planned |
| 06 | AI Cloud Cost Optimization Agent | This AI Saved Me $900 on AWS | React · FastAPI · boto3 · LangChain · PostgreSQL | 🔜 Planned |
| 07 | AI Kubernetes Cost Analyzer | AI That Finds Hidden Kubernetes Costs | React · FastAPI · Kubernetes Metrics API · Prometheus | 🔜 Planned |
| 08 | AI Infrastructure Drift Detector | This AI Detects Hidden Infrastructure Changes | FastAPI · Terraform State Parser · AWS SDK · LangChain | 🔜 Planned |
| 09 | AI DevOps CLI Engineer | I Built an AI DevOps Engineer for My Terminal | Python CLI · Next.js · FastAPI · LangChain · Kubernetes API | 🔜 Planned |
| 10 | AI Codebase Knowledge Engine | AI That Understands My Entire Codebase | Next.js · FastAPI · LangChain RAG · ChromaDB · GitHub API | 🔜 Planned |
| 11 | AI DevOps Monitoring Assistant | This AI Explains Monitoring Alerts Instantly | React · FastAPI · Prometheus API · Grafana API · LangChain | 🔜 Planned |
| 12 | AI DevOps Learning Assistant | AI That Teaches DevOps From Real Systems | Next.js · FastAPI · LangChain RAG · ChromaDB · HuggingFace | 🔜 Planned |
| 13 | AI Kubernetes Fix Bot | This AI Fixes Broken Kubernetes Pods Automatically | Python · FastAPI · Kubernetes Python Client · Ollama · React | 🔜 Planned |
| 14 | AI DevOps ChatOps Agent | I Built a DevOps ChatGPT That Runs Commands For Me | FastAPI · Slack API · LangChain · Ollama · Redis | 🔜 Planned |
| 15 | AI CI/CD Failure Predictor | This AI Predicts Pipeline Failures Before They Happen | Python · FastAPI · Scikit-learn · GitHub Actions API · React | 🔜 Planned |
| 16 | AI Terraform Drift Detector | This AI Finds Infrastructure Drift Instantly | Terraform CLI · Python · FastAPI · AWS SDK · React | 🔜 Planned |
| 17 | AI Service Health Explainer | This AI Explains Why Your Service Is Down | FastAPI · Prometheus API · Grafana API · LangChain · React | 🔜 Planned |
| 18 | AI DevOps Command Generator | This AI Writes DevOps Commands For You | FastAPI · Ollama · LangChain · CLI + React UI | 🔜 Planned |
| 19 | AI Deployment Risk Analyzer | This AI Warns You Before a Bad Deployment | Python · FastAPI · GitHub API · Scoring Logic · React | 🔜 Planned |
| 20 | AI Incident Investigation Platform | AI That Investigates Production Outages | React · FastAPI · LangGraph · Prometheus · Elasticsearch | 🔜 Planned |
| 21 | AI Infrastructure Architect | I Let AI Design My Entire Cloud Architecture | React · FastAPI · LangChain · Terraform Parser · AWS SDK | 🔜 Planned |
| 22 | AI DevOps Task Automation Agent | I Let AI Run My DevOps Job for a Day | LangGraph · FastAPI · Next.js · Docker Sandbox | 🔜 Planned |
| 23 | AI Deployment Planning Assistant | AI That Plans Production Deployments | React · FastAPI · LangChain · PostgreSQL | 🔜 Planned |
| 24 | AI Debugging Pair Programmer | I Let AI Debug My Production Code | React · FastAPI · LangChain · GitHub API · Ollama | 🔜 Planned |
| 25 | AI DevOps Observability Engine | I Built an AI Observability Platform | Next.js · FastAPI · Prometheus · Grafana · LangChain | 🔜 Planned |
| 26 | AI Cloud Architecture Optimizer | AI That Optimizes Cloud Architecture | React · FastAPI · Terraform Parser · AWS SDK · LangChain | 🔜 Planned |
| 27 | AI DevOps Documentation Generator | AI Writes DevOps Documentation Automatically | Next.js · FastAPI · LangChain · Markdown Parser | 🔜 Planned |
| 28 | AI Deployment Risk Predictor | This AI Predicts If Your Deployment Will Fail | Next.js · FastAPI · Scikit-learn · LangChain · GitHub API | 🔜 Planned |
| 29 | AI CI/CD Pipeline Debugger | This AI Debugs Broken CI Pipelines Automatically | Next.js · FastAPI · LangChain · GitHub Actions API · Ollama | 🔜 Planned |
| 30 | AI DevOps Learning Assistant | AI That Teaches DevOps From Real Systems | Next.js · FastAPI · LangChain RAG · ChromaDB · HuggingFace | 🔜 Planned |

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
