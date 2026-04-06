# AWS Deployment Guide — AI Infrastructure Diagram Generator

## What Gets Deployed

```
EC2 t3.micro (Ubuntu 22.04)
  └── docker-compose up
        ├── frontend  (Next.js)   → port 3000
        ├── backend   (FastAPI)   → port 8000
        └── chromadb              → internal only

EC2 IAM Instance Profile
  ├── Bedrock Claude Haiku  → AI summaries (no keys needed)
  ├── S3 bucket             → diagram PNG storage
  └── DynamoDB table        → diagram history
```

No API keys stored on the instance — Bedrock, S3, and DynamoDB are accessed via the EC2 IAM instance profile automatically.

---

## Prerequisites

- AWS CLI configured (`aws configure`)
- Terraform >= 1.5 installed
- Your repo pushed to GitHub

---

## Step 1 — Enable Bedrock Model Access

In AWS Console → **Bedrock** → **Model access** → Request access for:
- **Anthropic Claude Haiku** (`anthropic.claude-haiku-20240307-v1:0`)

This is a one-time click. Takes ~2 minutes to activate. Must be done before deploying.

---

## Step 2 — Configure Terraform Variables

```bash
cd projects/03-ai-infrastructure-diagram-generator/infra/aws/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
aws_region          = "us-east-1"
instance_type       = "t3.micro"
project_name        = "ai-infra-diagram"
github_repo_url     = "https://github.com/YOUR_USERNAME/ai-devops-systems-lab"
github_token        = ""                               # leave blank if repo is public
s3_bucket_name      = "ai-infra-diagram-YOUR_SUFFIX"  # must be globally unique
dynamodb_table_name = "infra-diagram-history"
```

> **S3 bucket names are globally unique across all AWS accounts** — add your name or a random suffix.

---

## Step 3 — Deploy

```bash
terraform init
terraform plan
terraform apply
```

Terraform will:
- Generate an SSH key pair → save `.pem` file locally
- Create security group (ports 22, 3000, 8000)
- Create IAM role with Bedrock + S3 + DynamoDB permissions
- Create S3 bucket + DynamoDB table
- Launch EC2 t3.micro with a user data script that:
  - Installs Docker + Graphviz
  - Clones your repo
  - Writes `.env` with AWS settings
  - Starts the full docker-compose stack

---

## Step 4 — Wait for Setup (~3–5 minutes)

The EC2 instance runs the setup script on first boot. Check progress:

```bash
# SSH in
ssh -i infra/aws/ai-infra-diagram.pem ubuntu@$(terraform output -raw instance_public_ip)

# Watch setup log
tail -f /var/log/infra-diagram-setup.log
```

Wait until you see:
```
Setup complete.
Frontend: http://X.X.X.X:3000
```

---

## Step 5 — Open the App

```bash
terraform output frontend_url
# → http://X.X.X.X:3000
```

Open that URL in your browser. The dashboard loads with sample Terraform pre-filled.

---

## Verify Everything is Working

```bash
# Backend health check
curl http://$(terraform output -raw instance_public_ip):8000/health

# API docs
open http://$(terraform output -raw instance_public_ip):8000/docs
```

Generate a diagram — the Agent Feed should show:
- `Parsing Terraform HCL` → complete
- `Generating graphviz diagram` → complete
- `Uploading diagram to S3` → complete
- `Generating AI summary (AWS Bedrock)` → complete
- `Persisting to DynamoDB` → complete

---

## Redeploy After Code Changes

Push your changes to GitHub, then:

```bash
cd projects/03-ai-infrastructure-diagram-generator
bash infra/aws/scripts/deploy.sh
```

This SSHs into the instance, pulls latest code, and restarts docker-compose.

---

## SSH Access

```bash
ssh -i infra/aws/ai-infra-diagram.pem ubuntu@$(cd infra/aws/terraform && terraform output -raw instance_public_ip)
```

Useful commands on the instance:
```bash
# Check running containers
docker ps

# View backend logs
cd /home/ubuntu/app/projects/03-ai-infrastructure-diagram-generator
docker compose logs backend -f

# View frontend logs
docker compose logs frontend -f

# Restart stack
docker compose down && docker compose up -d --build
```

---

## Cleanup

```bash
# Empty the S3 bucket first
aws s3 rm s3://YOUR_BUCKET_NAME --recursive

# Destroy all resources
cd infra/aws/terraform
terraform destroy
```

**Resources destroyed:** EC2 instance, security group, IAM role, S3 bucket, DynamoDB table, SSH key pair.

> The `.pem` file in `infra/aws/` is local only — delete it manually after `terraform destroy`.

---

## Cost Estimate (with $100 AWS credits)

| Resource | Cost |
|---|---|
| EC2 t3.micro | ~$0.0104/hour (~$7.50/month) |
| Bedrock Claude Haiku | ~$0.05 per 100 diagrams |
| S3 (100 PNGs × 100KB) | < $0.01/month |
| DynamoDB PAY_PER_REQUEST | < $0.01/month |
| **Total** | **~$7.50/month** covered by your $100 credits |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Frontend not loading after 5 min | SSH in and check `tail -f /var/log/infra-diagram-setup.log` |
| Bedrock returns 403 | Confirm model access is enabled in AWS Console → Bedrock → Model access |
| S3 upload fails | Check bucket name is globally unique and matches `terraform.tfvars` |
| Docker compose not starting | SSH in and run `docker compose up -d --build` manually in project folder |
| Cannot SSH | Check `.pem` file permissions: `chmod 400 infra/aws/ai-infra-diagram.pem` |
