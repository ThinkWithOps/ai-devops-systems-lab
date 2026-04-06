# AWS Integration — AI Infrastructure Diagram Generator

## Overview

AWS mode replaces three local services with managed cloud equivalents:

| Component | Local (default) | AWS (when enabled) |
|---|---|---|
| LLM for summaries | Ollama llama3 | Bedrock Claude Haiku |
| Diagram PNG storage | Local filesystem | S3 presigned URLs |
| Diagram history | ChromaDB | DynamoDB |

AWS mode is opt-in. The project runs fully locally without any AWS credentials.

---

## Why AWS Here

| Service | Value Added |
|---|---|
| **Bedrock Claude Haiku** | Higher quality than Groq, no rate limits at scale, consistent latency |
| **S3** | Diagrams persist across container restarts; URLs are shareable and work in CI/CD |
| **DynamoDB** | No ChromaDB container needed; reliable scan/query with zero maintenance |

---

## Architecture (AWS Mode)

```
Browser
  │
  ▼
Next.js Frontend (ECS Fargate or local)
  │  POST /api/diagrams/generate/stream
  ▼
FastAPI Backend
  │
  ├─ HCL Parser          → local (python-hcl2)
  ├─ Connection Inferrer → local
  ├─ Graphviz Renderer   → local (produces PNG)
  ├─ S3 Upload           → s3://BUCKET/diagrams/<id>.png
  ├─ Bedrock Haiku       → architecture summary
  └─ DynamoDB PutItem    → history + metadata
```

---

## Setup

### Step 1 — Provision AWS resources

```bash
cd infra/aws/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars: set a globally unique s3_bucket_name

terraform init
terraform plan
terraform apply
```

Outputs:
```
s3_bucket_name    = "infra-diagram-generator-your-suffix"
dynamodb_table    = "infra-diagram-history"
env_block         = <paste into .env>
```

### Step 2 — Enable Bedrock model access

In the AWS Console → Bedrock → Model access → request access for:
- **Anthropic Claude Haiku** (`anthropic.claude-haiku-20240307-v1:0`)

This is a one-time click. Takes ~2 minutes to activate.

### Step 3 — Configure .env

```bash
cp .env.example .env
# Fill in:
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your key>
AWS_SECRET_ACCESS_KEY=<your secret>
AWS_BEDROCK_ENABLED=true
AWS_S3_ENABLED=true
AWS_S3_BUCKET=infra-diagram-generator-your-suffix
AWS_DYNAMODB_ENABLED=true
AWS_DYNAMODB_TABLE=infra-diagram-history
```

### Step 4 — Run

```bash
docker-compose up --build
# or
uvicorn app.main:app --reload  # backend
npm run dev                    # frontend
```

The backend logs will confirm which services are active:
```
INFO S3 bucket ready bucket=infra-diagram-generator-your-suffix
INFO DynamoDB table ready table=infra-diagram-history
```

---

## Demo Workflow (AWS Mode)

1. Open `http://localhost:3000`
2. Paste the ecommerce sample from `infra/aws/sample-ecommerce.tf`
3. Click **Generate Diagram**
4. Agent Feed shows:
   - `Parsing Terraform HCL` → complete
   - `Generating graphviz diagram` → complete
   - `Uploading diagram to S3` → complete (presigned URL returned)
   - `Generating AI summary (AWS Bedrock)` → complete (Claude Haiku)
   - `Persisting to DynamoDB` → complete
5. Diagram PNG loads from S3 URL
6. AI summary appears in Insights panel
7. Visit `/results` — history from DynamoDB
8. Visit `/metrics` — provider breakdown from DynamoDB scan

---

## Fallback Behaviour

Each AWS service degrades gracefully:

| Scenario | Result |
|---|---|
| S3 upload fails | Warning logged, diagram served from local filesystem |
| Bedrock throttled or unavailable | Falls back to Ollama automatically |
| DynamoDB unavailable | Falls back to ChromaDB automatically |
| No AWS credentials at all | All three features use local alternatives silently |

---

## ECS Deployment (Optional)

```bash
# Build and push images, update ECS service
bash infra/aws/ecs/deploy.sh
```

See `infra/aws/ecs/task-definition.json` for the full container spec.
Replace `ACCOUNT_ID` with your AWS account ID before use.

---

## Cost Estimate

| Service | Usage Pattern | Estimated Cost |
|---|---|---|
| Bedrock Claude Haiku | ~50 summaries/day × 500 tokens | ~$0.01–0.05/day |
| S3 | 100 PNGs at ~100KB each | < $0.01/month |
| DynamoDB (PAY_PER_REQUEST) | 100 writes + 500 reads/day | < $0.01/day |
| **Total demo usage** | | **< $2/month** |

---

## Cleanup

```bash
# Remove all AWS resources
cd infra/aws/terraform
terraform destroy

# Empty S3 bucket first if non-empty
aws s3 rm s3://YOUR_BUCKET_NAME --recursive
terraform destroy
```

**Important:** S3 buckets must be emptied before Terraform can delete them.

---

## What Runs Locally vs AWS

| Always Local | Optional AWS |
|---|---|
| Terraform HCL parser | Bedrock Claude Haiku (LLM) |
| Graphviz diagram renderer | S3 diagram PNG storage |
| Next.js frontend | DynamoDB history store |
| FastAPI backend | ECS Fargate deployment |
