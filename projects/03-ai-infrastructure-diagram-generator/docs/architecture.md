# Architecture — AI Infrastructure Diagram Generator

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Browser (Next.js UI — port 3000)                 │
│  ┌──────────────────┐  ┌───────────────────┐  ┌─────────────────┐  │
│  │  Terraform Input │  │  Diagram Viewer   │  │  Metrics / Logs │  │
│  │  + Title/Style   │  │  PNG or Mermaid   │  │  Agent Feed     │  │
│  └────────┬─────────┘  └───────────────────┘  └─────────────────┘  │
└───────────┼─────────────────────────────────────────────────────────┘
            │ POST /api/diagrams/generate/stream (NDJSON)
            │ Each AgentStep emitted as one JSON line
            │ Final line: { "step": "__result__", "detail": DiagramResult }
┌───────────▼─────────────────────────────────────────────────────────┐
│                    FastAPI Backend (port 8000)                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  LangChain Agent Pipeline                     │   │
│  │                                                              │   │
│  │  ┌─────────────���┐   ┌──────────────┐   ┌─────────────────┐  │   │
│  │  │  HCL Parser  │ → │ Conn Infer   │ → │    Renderer     │  │   │
│  │  │  (hcl2)      │   │ (attr scan)  │   │ Graphviz / MMD  │  │   │
│  │  │  + regex     │   │              │   │                 │  │   │
│  │  │  fallback    │   │              │   │                 │  │   │
│  │  └──────────────┘   └──────────────┘   └────────┬────────┘  │   │
│  │                                                  │           │   │
│  │  ┌───────────────────────┐   ┌──────────────────▼────────┐  │   │
│  │  │    LLM Summarizer     │   │    Persistence Layer      │  │   │
│  │  │  (1) Bedrock Haiku    │   │  (1) S3 PNG upload        │  │   │
│  │  │  (2) Groq llama3      │   │  (1) DynamoDB PutItem     │  │   │
│  │  │  (3) static fallback  │   │  (2) ChromaDB add()       │  │   │
│  │  └───────────────────────┘   └───────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  GET /output/*.png  (static file serving — local fallback only)     │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                    │
┌────────▼──────┐   ┌─────────▼───────┐   ┌───────▼──────────────┐
│  S3  (AWS)(1) │   │ DynamoDB (AWS)  │   │ ChromaDB (port 8001) │
│  diagram PNGs │   │ (1) diagram     │   │ (2) local fallback   │
│  presigned URL│   │ history +       │   │ cosine similarity    │
│  7-day expiry │   │ PAY_PER_REQUEST │   └──────────────────────┘
└───────────────┘   └─────────────────┘

(1) = AWS mode (when AWS_*_ENABLED=true)
(2) = local fallback (default when no AWS credentials)
```

---

## Component Responsibilities

| Component | Responsibility |
|---|---|
| **Next.js Frontend** | SaaS dashboard — Terraform input, diagram viewer, agent feed, metrics, history |
| **FastAPI Backend** | NDJSON streaming endpoint, static PNG serving, agent lifecycle, startup provisioning |
| **HCL Parser** | Parse Terraform HCL2 via python-hcl2; regex fallback for malformed inputs |
| **Connection Inferencer** | Scan resource attributes for cross-references, build dependency graph |
| **Graphviz Renderer** | Produce DOT source → render PNG with per-provider subgraph clustering |
| **Mermaid Renderer** | Generate flowchart string for browser-side rendering via mermaid.js |
| **Bedrock Claude Haiku** | Primary LLM — architecture summary, fast and cost-effective, no local install |
| **Groq llama3-8b-8192** | Primary LLM fallback — fast, free tier, no local install required |
| **S3** | Primary diagram PNG storage — persistent across restarts, presigned URLs |
| **DynamoDB** | Primary history store — PAY_PER_REQUEST, no container dependency |
| **ChromaDB** | Local fallback vector store for diagram history when DynamoDB is disabled |

---

## Agent Pipeline — Step-by-Step

```
Input: terraform_code (string), diagram_style, title, include_ai_summary

Step 1 — Parse Terraform HCL
  ├─ python-hcl2 attempts structured parse → ParsedResource[]
  ├─ on parse error: regex fallback extracts resource blocks
  └─ emits: { step: "Parsing Terraform HCL", status: "complete",
              detail: "Found 12 resources across 2 providers" }

Step 2 — Infer Connections
  ├─ walks all resource attributes as strings
  ├─ checks for references to other resource IDs (e.g. aws_vpc.main.id)
  └─ emits: { detail: "Detected 8 cross-resource references" }

Step 3 — Render Diagram
  ├─ graphviz: build Digraph with per-provider subgraph clusters
  │            render to PNG → /output/<diagram_id>.png
  ├─ mermaid:  produce flowchart TD string for browser rendering
  └─ emits: { detail: "Diagram rendered successfully" }

Step 4 — Upload to S3  [AWS mode only]
  ├─ boto3 upload_file → s3://BUCKET/diagrams/<id>.png
  ├─ generate_presigned_url (7-day expiry)
  ├─ on failure: log warning, fall back to /output/<id>.png
  └─ emits: { detail: "Stored at s3://bucket/diagrams/<id>.png" }

Step 5 — AI Summary
  ├─ if AWS_BEDROCK_ENABLED=true:
  │    invoke anthropic.claude-haiku-20240307-v1:0 via boto3
  ├─ elif GROQ_API_KEY set:
  │    LangChain ChatGroq → StrOutputParser
  └─ else: static template summary (never fails)

Step 6 — Persist History
  ├─ if AWS_DYNAMODB_ENABLED=true:
  │    DynamoDB PutItem → diagram_id, title, resource_count,
  │                        providers, ai_summary, image_url, created_at
  └─ else: ChromaDB add() with document string + metadata

Output: DiagramResult JSON emitted as sentinel step
  { "step": "__result__", "status": "complete", "detail": "<DiagramResult JSON>" }
```

---

## NDJSON Stream Contract

Each line is a complete JSON object. The frontend parses line-by-line.

```jsonc
// Progress steps (rendered in Agent Feed)
{ "step": "Parsing Terraform HCL",           "status": "running",  "detail": "",                            "timestamp": "..." }
{ "step": "Parsing Terraform HCL",           "status": "complete", "detail": "Found 12 resources",          "timestamp": "..." }
{ "step": "Inferring resource connections",  "status": "complete", "detail": "Detected 8 references",       "timestamp": "..." }
{ "step": "Generating graphviz diagram",     "status": "complete", "detail": "Diagram rendered",            "timestamp": "..." }
{ "step": "Uploading diagram to S3",         "status": "complete", "detail": "s3://bucket/diagrams/abc.png","timestamp": "..." }
{ "step": "Generating AI summary (Bedrock)", "status": "complete", "detail": "Claude Haiku summary ready",  "timestamp": "..." }
{ "step": "Persisting to DynamoDB",          "status": "complete", "detail": "Stored ID abc123",            "timestamp": "..." }

// Sentinel — carries full DiagramResult as escaped JSON string in "detail"
{ "step": "__result__", "status": "complete", "detail": "{\"diagram_id\":\"abc123\", ...}", "timestamp": "..." }
```

---

## Data Schemas

### ParsedResource
```python
{
  "resource_type": "aws_ecs_service",
  "resource_name": "api",
  "provider":      "aws",
  "attributes":    { ... },          # raw HCL attributes
  "connections":   ["aws_ecs_cluster.main", "aws_lb.app"]
}
```

### DynamoDB Record
```
PK:  diagram_id  (String, UUID)
Attributes:
  title           String
  resource_count  Number
  providers       List<String>    e.g. ["aws", "k8s"]
  ai_summary      String
  image_url       String          S3 presigned URL or /output/<id>.png
  created_at      String          ISO 8601 UTC
  expires_at      Number          Unix timestamp (TTL — optional)
```

### ChromaDB Document (local fallback)
```
ID:       diagram_id
Document: "Title: ... Providers: ... Resource types: ... Summary: ..."
Metadata: { diagram_id, title, resource_count, providers, created_at }
```

---

## AWS Integration Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  ECS Fargate Task (optional deployment)                          │
│  ┌──────────────────────┐   ┌──────────────────────────────┐    │
│  │  backend container   │   │  frontend container          │    │
│  │  port 8000           │   │  port 3000                   │    │
│  │  IAM task role ──────┼───┼─► S3 PutObject / GetObject  │    │
│  │                      │   │  ► DynamoDB PutItem / Scan   │    │
│  │                      │   │  ► Bedrock InvokeModel       │    │
│  └──────────────────────┘   └──────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
      │                 │                     │
┌─────▼──────┐  ┌───────▼──────┐  ┌──────────▼──────────────────┐
│  S3 Bucket │  │  DynamoDB    │  │  Bedrock (managed service)  │
│  30-day    │  │  PAY_PER_REQ │  │  Claude Haiku               │
│  lifecycle │  │  no idle cost│  │  ~$0.01–0.05/day at demo    │
└────────────┘  └──────────────┘  └─────────────────────────────┘

IAM permissions (least privilege):
  s3:PutObject, s3:GetObject, s3:ListBucket  → BUCKET/*
  dynamodb:PutItem, GetItem, Scan, Query     → TABLE
  bedrock:InvokeModel                        → claude-haiku ARN only
```

---

## Local vs AWS Mode Summary

| Feature | Local mode | AWS mode |
|---|---|---|
| LLM | Groq llama3-8b-8192 (API, free tier) | Bedrock Claude Haiku |
| Diagram storage | /output/*.png served by FastAPI | S3 presigned URL (7-day) |
| History/metrics | ChromaDB container (port 8001) | DynamoDB (no container) |
| Deployment | docker-compose up | ECS Fargate |
| Cost | Free | < $2/month at demo scale |
| Cold start | Requires GROQ_API_KEY + ChromaDB container | No local dependencies |
