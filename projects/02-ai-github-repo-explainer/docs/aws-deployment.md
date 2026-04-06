# AWS Deployment — AI GitHub Repo Explainer

Deploy the full stack to AWS EC2 using Terraform.

---

## What Gets Deployed

| Service | Port | Description |
|---------|------|-------------|
| Repo Explainer Frontend | 3000 | Next.js dashboard |
| Repo Explainer Backend | 8000 | FastAPI + LangChain agent |
| ChromaDB | 8001 | Vector database |
| ShopFlow Demo Frontend | 3002 | E-commerce demo app |
| ShopFlow Demo Backend | 8020 | ShopFlow API |

## AWS Resources Created

| Resource | Detail |
|----------|--------|
| EC2 instance | `t3.small` — 2 vCPU, 2GB RAM |
| Security group | Ports 22, 3000, 3002, 8000, 8020 open |
| IAM role + instance profile | EC2 instance role |
| SSH key pair | Auto-generated, saved to `infra/aws/ai-github-repo-explainer.pem` |
| EBS volume | 30GB gp3 |

> **Cost estimate:** `t3.small` ~$0.023/hr (~$0.55/day). Stop or terminate when not recording.

---

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- AWS CLI configured (`aws configure`)
- Groq API key (free at [console.groq.com](https://console.groq.com))
- GitHub personal access token (5000 req/hr vs 60 unauthenticated)

---

## Deploy

```bash
cd projects/02-ai-github-repo-explainer/infra/aws/terraform

# terraform.tfvars is already created with your keys — just run:
terraform init
terraform plan
terraform apply
```

Terraform outputs the public IP and all URLs when complete.

---

## First Boot — Start the Stacks

SSH into the instance (use VSCode Remote SSH or Git Bash):

```bash
ssh -F "/c/Users/<you>/.ssh/config" ai-github-repo-explainer
```

> The repo is automatically cloned to `~/app` during EC2 bootstrap. You do not need to clone it manually. If the bootstrap is still running, wait until you see the repo at `~/app` before proceeding.

Start the repo explainer:

```bash
cd ~/app/projects/02-ai-github-repo-explainer
docker-compose up -d
```

This starts 3 containers:

| Container | Port | Description |
|-----------|------|-------------|
| frontend | 3000 | Next.js dashboard UI |
| backend | 8000 | FastAPI + LangChain agent + sentence-transformers |
| chromadb | 8001 | Vector database (persists indexed repos) |

Start the ShopFlow demo app:

```bash
cd ~/app/projects/02-ai-github-repo-explainer/demo-app
docker-compose up -d
```

This starts 4 containers:

| Container | Port | Description |
|-----------|------|-------------|
| shopflow-frontend | 3002 | E-commerce storefront UI |
| shopflow-backend | 8020 | FastAPI e-commerce API |
| shopflow-postgres | 5434 | PostgreSQL database |
| shopflow-redis | 6381 | Redis cache |

> First run takes 3–5 minutes — Docker pulls images and builds containers.

Check all 7 containers are running:

```bash
docker ps
```

---

## Demo Flow

1. Open `http://<EC2_IP>:3002` — ShopFlow e-commerce app
2. Open `http://<EC2_IP>:3000` — Repo Explainer dashboard
3. Go to **Explore** → paste the ShopFlow GitHub repo URL → Analyze
4. Go to **Chat** → select the repo → ask questions about the codebase

---

## Cleanup

```bash
cd infra/aws/terraform
terraform destroy
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Frontend unreachable | Wait for `docker ps` to show all containers healthy |
| sentence-transformers OOM | Use `t3.small` minimum — `t2.micro` has insufficient RAM |
| GitHub rate limit during ingestion | Ensure `GITHUB_TOKEN` is set in `.env` on the instance |
| ChromaDB data lost after redeploy | Expected — re-ingest repos after each deploy |
