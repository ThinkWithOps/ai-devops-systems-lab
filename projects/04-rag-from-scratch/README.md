# RAG from Scratch — No LangChain, Just Python

> I Gave My DevOps Tools a Memory — Groq + ChromaDB + S3 Auto-Ingest, No Frameworks

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![No Frameworks](https://img.shields.io/badge/LangChain-NOT%20USED-red)](https://python.langchain.com)

**YouTube Tutorial:** *(coming soon — [@ThinkWithOps](https://youtube.com/@thinkwithops))*

---

## 📋 Table of Contents

- [Problem Statement](#problem-statement)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [How to Install and Run](#how-to-install-and-run)
- [How to Use](#how-to-use)
- [Tools Reference](#tools-reference)
- [Project Structure](#project-structure)
- [What This Teaches](#what-this-teaches)
- [Challenges](#challenges)
- [License](#license)
- [Contact](#contact)

---

## Problem Statement

DevOps teams drown in runbooks nobody reads. When a pod crashes at 3 AM, nobody opens a 200-line markdown file and grep-s through it.

I built a system that ingests all your runbooks automatically — just upload a file to S3, and Lambda chunks it, embeds it, and stores the vectors. Ask any question locally and get a plain English answer in seconds via Groq.

No frameworks. No LangChain. No black boxes. Just Python.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     INGEST (automatic via S3)                    │
│                                                                  │
│  Upload .md to S3 docs/                                          │
│         │                                                        │
│         ▼  (S3 trigger)                                          │
│  Lambda (Docker)                                                 │
│    → download doc from S3                                        │
│    → chunk_text() (500 chars, 50 overlap)                        │
│    → SentenceTransformer (all-MiniLM-L6-v2, 384-dim)            │
│    → ChromaDB (stored in /tmp)                                   │
│    → zip + upload chroma_db back to S3                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     QUERY (local terminal)                       │
│                                                                  │
│  python src/rag_pipeline.py                                      │
│         │                                                        │
│         ▼                                                        │
│  download chroma_db from S3 (if not cached locally)             │
│         │                                                        │
│         ▼                                                        │
│  SentenceTransformer → query embedding                           │
│         │                                                        │
│         ▼                                                        │
│  ChromaDB cosine similarity → top 3 chunks                       │
│         │                                                        │
│         ▼                                                        │
│  Groq API (llama-3.3-70b) → streamed answer                     │
│         │                                                        │
│         ▼                                                        │
│  Source citations → which runbook answered the question          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Technology | Role | Why |
|------------|------|-----|
| `sentence-transformers` | Generate embeddings | Free, local, all-MiniLM-L6-v2 is fast and accurate |
| `chromadb` | Vector store | Local + S3-backed, no server needed |
| `Groq API` (llama-3.3-70b) | LLM for answers | Extremely fast, generous free tier |
| AWS S3 | Doc storage + ChromaDB persistence | Trigger-based ingest, durable vector store |
| AWS Lambda (Docker) | Auto-ingest on file upload | Zero infra to manage, triggers on S3 upload |
| `rich` | Terminal UI | Progress bars, tables, streaming output |
| Terraform | Infra provisioning | S3 + ECR + Lambda + IAM in one apply |

---

## How to Install and Run

### Prerequisites

| Requirement | Why |
|---|---|
| Python 3.11+ | Runtime |
| AWS CLI configured | S3 + Lambda deployment |
| Docker | Build Lambda image |
| Terraform | Provision AWS infra |
| Groq API key | LLM inference — free at [console.groq.com](https://console.groq.com) |

### Steps

```bash
# 1. Navigate to the project
cd projects/04-rag-from-scratch

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment variables
cp .env.example .env
# Edit .env — add GROQ_API_KEY and AWS region
```

### Deploy AWS Infrastructure

```bash
# Step 1 — provision S3 + ECR
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — set region and project_name, leave ecr_image_uri blank for now
terraform init
terraform apply -target=aws_s3_bucket.rag -target=aws_ecr_repository.rag_lambda

# Step 2 — build and push Lambda Docker image
ECR_URL=$(terraform output -raw ecr_repository_url)
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URL
docker build -t rag-ingest ../../lambda/
docker tag rag-ingest:latest $ECR_URL:latest
docker push $ECR_URL:latest

# Step 3 — set ECR image URI and apply the rest
# Edit terraform.tfvars — set ecr_image_uri to the ECR URL above
terraform apply

# Step 4 — copy bucket name to .env
terraform output s3_bucket_name
# Add to .env: CHROMA_S3_BUCKET=<bucket-name>
```

### Upload Docs and Trigger Ingest

```bash
# Upload a runbook — this automatically triggers Lambda
aws s3 cp docs/runbook-kubernetes.md s3://$CHROMA_S3_BUCKET/docs/runbook-kubernetes.md
aws s3 cp docs/runbook-docker.md s3://$CHROMA_S3_BUCKET/docs/runbook-docker.md
aws s3 cp docs/runbook-cicd.md s3://$CHROMA_S3_BUCKET/docs/runbook-cicd.md

# Watch Lambda logs to confirm ingestion
aws logs tail /aws/lambda/rag-demo-ingest --follow
```

### Ask Questions

```bash
python src/rag_pipeline.py
```

---

## How to Use

**Upload a doc → Lambda ingests it automatically:**
```bash
aws s3 cp my-runbook.md s3://$CHROMA_S3_BUCKET/docs/my-runbook.md
```

**Ask questions locally:**
```bash
python src/rag_pipeline.py
# or pass directly:
python src/rag_pipeline.py "What should I do when a pod is in CrashLoopBackOff?"
```

**Demo questions that work well:**
- `"What should I do when a Kubernetes pod is in CrashLoopBackOff?"`
- `"How do I fix a Docker container that keeps exiting?"`
- `"What are the steps to rollback a failed CI/CD deployment?"`
- `"How do I handle an OOMKilled pod?"`
- `"What is the correct way to store secrets in CI/CD pipelines?"`

> **Cost:** Lambda + S3 for this demo is well within the AWS free tier. Groq free tier handles hundreds of requests/day. Total cost: ~$0.

---

## Tools Reference

| Script | What it does |
|--------|-------------|
| `src/ingest.py` | Local ingest (no Lambda) — for testing without AWS |
| `src/retriever.py` | Query ChromaDB (downloads from S3 if needed) |
| `src/generator.py` | Send question + context to Groq, stream response |
| `src/rag_pipeline.py` | Main entry point — interactive question loop |
| `src/utils.py` | Chunking, config, Rich UI, S3 sync helpers |
| `lambda/handler.py` | Lambda function — triggered by S3 upload |
| `lambda/Dockerfile` | Docker image for Lambda (includes model) |

---

## Project Structure

```
04-rag-from-scratch/
├── src/
│   ├── ingest.py              # Local ingest — testing without Lambda
│   ├── retriever.py           # Cosine similarity search, S3 download
│   ├── generator.py           # Groq API streaming
│   ├── rag_pipeline.py        # Main entry point
│   └── utils.py               # Chunking, config, S3 helpers
├── lambda/
│   ├── handler.py             # Lambda function
│   ├── Dockerfile             # Docker image (includes embedding model)
│   └── requirements.txt       # Lambda deps
├── infra/
│   └── terraform/
│       ├── main.tf            # S3 + ECR + Lambda + IAM + S3 trigger
│       ├── variables.tf
│       ├── outputs.tf
│       └── terraform.tfvars.example
├── docs/
│   ├── runbook-kubernetes.md
│   ├── runbook-docker.md
│   └── runbook-cicd.md
├── tests/
│   └── test_rag.py
├── config.yaml
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## What This Teaches

| What You Built | Skill |
|---|---|
| Text chunking with sliding window | Core RAG concept — chunk size and overlap trade-offs |
| Sentence embeddings with sentence-transformers | What embeddings are and how they encode meaning |
| Cosine similarity search in ChromaDB | How vector databases find relevant content |
| RAG prompt construction | Combining context + question into an effective prompt |
| Groq API streaming | Fast LLM inference via OpenAI-compatible API |
| Docker Lambda with heavy ML deps | Packaging sentence-transformers for serverless |
| S3 → Lambda event trigger | Event-driven architecture for auto-ingest |
| ChromaDB persistence via S3 | Durable vector store without a database server |

---

## Challenges

- **sentence-transformers is too large for Lambda zip** — 250MB unzipped limit is exceeded. Docker-based Lambda supports up to 10GB. Pre-downloading the model in the Dockerfile avoids cold start download.
- **ChromaDB persistence in Lambda** — Lambda's filesystem is ephemeral. Solved by downloading the chroma_db zip from S3 on each invocation, modifying it, and uploading it back.
- **ChromaDB cosine distance vs similarity** — ChromaDB returns distance (0 = identical). Similarity = `1 - distance`. Easy to get wrong.
- **Groq streaming format** — uses SSE (Server-Sent Events). Each line starts with `data: `. The stream ends with `data: [DONE]`.
- **Lambda cold start** — first invocation downloads chroma_db from S3 and loads the model. Can take 30-60 seconds. Subsequent warm invocations are much faster.
- **Prompt engineering for DevOps** — the system prompt must explicitly tell the LLM to answer only from context and be actionable. Without this, it ignores the context and hallucinates.

---

## License

MIT — free to use for learning and personal projects.

---

## Contact

- **YouTube:** [@ThinkWithOps](https://youtube.com/@thinkwithops)
- **LinkedIn:** [b-vijaya](https://www.linkedin.com/in/b-vijaya/)

---

**⭐ Star the repo and subscribe if this helped you!**
