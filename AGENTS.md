# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## What This Repository Is

This is a **meta-repository and guidance system** — not a runnable application. It contains four Codex instruction systems for generating a YouTube series of 30 portfolio-grade AI + DevOps projects. There are no build, test, or lint commands.

## Four Instruction Systems

| Folder | Purpose | When to Use |
|--------|---------|-------------|
| `.Codex/` | Main AI + DevOps project generation | Step 1: generate the primary platform |
| `.Codex-demoapps/` | Business simulation demo apps | Step 2: generate supporting demo applications |
| `.Codex-aws/` | AWS integration layer | Step 3 (optional): add cloud services |
| `.Codex-nontechnical/` | YouTube/social content assets | Step 4: use Codex Chat/Web, not Code |

## Project Generation Workflow

**Step 1** — Use `.Codex/` system prompt in Codex terminal to generate the main AI platform.

**Step 2** — Use `.Codex-demoapps/` system prompt in Codex terminal to generate a realistic demo app the platform will operate on.

**Step 3 (optional)** — Use `.Codex-aws/` to extend with AWS services.

**Step 4** — Use `.Codex-nontechnical/` in Codex **Chat/Web** (not terminal) to generate YouTube scripts, thumbnails, LinkedIn posts, Dev.to articles.

### Minimum Prompt Format (Step 1)

```
Use the local .Codex system for this project.

Project Name: [NAME]
Viral YouTube Title: [TITLE]
Tech Stack: [STACK]
```

## Non-Negotiable Standards (from `.Codex/project_rules.md`)

Every generated project must:
- Have a visible web UI (Next.js + React + Tailwind) — no CLI-only outputs
- Have a FastAPI backend
- Include AI orchestration (LangChain / LangGraph / AutoGen)
- Include a vector database or retrieval layer (Chroma / Weaviate / Pinecone)
- Include Docker deployment (`docker-compose.yml`)
- Default to **free/local-first** LLM tooling (Ollama over OpenAI)

## Standard Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** FastAPI
- **AI:** LangChain, LangGraph, AutoGen
- **Vector DB:** Chroma, Weaviate, Pinecone
- **LLMs:** Ollama (default), OpenAI, HuggingFace
- **Infra:** Docker, Kubernetes (when relevant), Prometheus + Grafana (observability)

## Standard Generated Project Structure

```
project-name/
├── frontend/          # Next.js dashboard UI
├── backend/           # FastAPI + services
├── agents/            # AI orchestration
├── vectorstore/       # Vector DB setup
├── infra/             # Docker, Kubernetes
├── docs/              # Architecture docs
├── scripts/           # Setup and utility scripts
├── docker-compose.yml
└── README.md
```

## UI Layout Standard

Every project dashboard uses a consistent SaaS-style layout (see `.Codex/ui_layout_pattern.md`):
- **Header:** project name, status, environment, primary action button
- **Sidebar:** Dashboard, Agents, Logs, Architecture, Metrics, Results, Settings
- **Body:** 4–6 KPI cards + main visual panel + AI insights panel + live log strip

## The 30-Project Sequence

Defined in `README.md`. Project 1 is **AI DevOps Copilot** (ChatGPT for DevOps Engineers). All 30 project prompts are pre-written in `.Codex/example_prompt.md`.

## Key Reference Files

- `WORKFLOW.md` — step-by-step operating guide with the exact sequence for Project 01
- `.Codex/system_prompt.md` — core generation philosophy and role definition
- `.Codex/project_rules.md` — full list of non-negotiable requirements
- `.Codex/generation_rules.md` — what must be auto-generated from minimal input
- `.Codex/portfolio_output_format.md` — required section order for all generated projects
- `.Codex/example_prompt.md` — ready-to-run prompts for all 30 projects
