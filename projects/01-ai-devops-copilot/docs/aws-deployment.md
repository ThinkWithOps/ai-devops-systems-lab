# AWS Deployment — AI DevOps Copilot

Deploy the full stack to a single EC2 instance using Terraform.
Everything runs via Docker Compose V2 — no local LLM needed (uses Groq API).

---

## Architecture on AWS

```
Internet
    │
    ▼
EC2 Instance (m7i-flex.large — Free Tier eligible, 8GB RAM)
    │
    ├── Next.js frontend    :3000
    ├── FastAPI backend     :8000  ◄─── Groq API (LLM)
    └── ChromaDB            :8001  ◄─── IAM role ──► CloudWatch Logs (read)
```

**LLM:** Groq API (free tier, ~800 tok/s) — no GPU or local Ollama needed.

---

## Prerequisites (local machine)

- [Terraform](https://developer.hashicorp.com/terraform/install) installed
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) installed
- [Groq API key](https://console.groq.com) (free)

---

## One-time: Create IAM User and Access Keys

1. **AWS Console → IAM → Users → Create User**
2. Username: `terraform-deployer`
3. Attach policies directly:
   - `AmazonEC2FullAccess`
   - `IAMFullAccess` ← required for Terraform to create the EC2 IAM role
   - `CloudWatchReadOnlyAccess`
4. Open the user → **Security credentials → Create access key**
5. Use case: **CLI** → copy the keys

Configure AWS CLI:

```bash
aws configure
# AWS Access Key ID:     <paste>
# AWS Secret Access Key: <paste>
# Default region:        us-east-1
# Default output format: json
```

---

## Step 1 — Instance Type

> **Important:** Use `m7i-flex.large` — it is Free Tier eligible on new AWS accounts and has 8GB RAM (minimum needed for this stack).
> `t2.micro` and `t3.micro` may not be available on new accounts.

To check which instance types are free tier eligible on your account:

```bash
aws ec2 describe-instance-types --filters "Name=free-tier-eligible,Values=true" --query "InstanceTypes[].InstanceType" --output text > free-tier-instances.txt
```

---

## Step 2 — Configure Terraform

```bash
cd projects/01-ai-devops-copilot/infra/aws/terraform
```

Create `secrets.tfvars` (never commit this file):

```hcl
aws_region      = "us-east-1"
instance_type   = "m7i-flex.large"
github_repo_url = "https://github.com/youruser/ai-devops-systems-lab"
github_token    = ""
groq_api_key    = "gsk_your_key_here"
```

---

## Step 3 — Deploy

```bash
# Download required Terraform providers (run once)
terraform init

# Dry run — review what will be created
terraform plan -var-file="secrets.tfvars"

# Create all AWS resources
terraform apply -var-file="secrets.tfvars"
```

Terraform outputs:

```
frontend_url     = "http://<IP>:3000"
backend_url      = "http://<IP>:8000"
ssh_command      = "ssh -i infra/aws/ai-devops-copilot.pem ubuntu@<IP>"
private_key_path = "infra/aws/ai-devops-copilot.pem"
```

SSH key is auto-generated and saved locally. No manual key pair creation needed.

---

## Step 4 — First-time setup on EC2

> The repo is automatically cloned to `~/app` during EC2 bootstrap. You do not need to clone it manually in most cases. SSH in, verify it exists, then start the stack.

The bootstrap script runs automatically but may not complete fully.
SSH in and run these steps manually if needed:

```bash
ssh -i infra/aws/ai-devops-copilot.pem ubuntu@<EC2_PUBLIC_IP>
```

**Check if repo was cloned:**
```bash
ls /home/ubuntu/app
```

If empty, clone manually:
```bash
git clone https://github.com/youruser/ai-devops-systems-lab /home/ubuntu/app
```

**Fix permissions:**
```bash
sudo chown -R ubuntu:ubuntu /home/ubuntu/app
```

**Create `.env` file:**
```bash
cat > /home/ubuntu/app/projects/01-ai-devops-copilot/.env << 'EOF'
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama3-8b-8192
CHROMA_HOST=chromadb
CHROMA_PORT=8000
NEXT_PUBLIC_API_URL=http://<EC2_PUBLIC_IP>:8000
AWS_REGION=us-east-1
CLOUDWATCH_ENABLED=true
EOF
```

**Install Docker Compose V2 (if not already installed):**
```bash
sudo apt-get install -y docker-compose-plugin
docker compose version
```

**Start the stack:**
```bash
cd /home/ubuntu/app/projects/01-ai-devops-copilot
docker compose up -d
```

**Check logs:**
```bash
docker compose logs -f
```

When you see `Application startup complete.` the app is ready.

---

## Step 5 — Access the app

| URL | Purpose |
|-----|---------|
| `http://<EC2_IP>:3000` | Frontend dashboard |
| `http://<EC2_IP>:8000/docs` | FastAPI Swagger docs |
| `http://<EC2_IP>:8000/api/health` | Health check |

---

## Update after code push

```bash
cd projects/01-ai-devops-copilot/infra/aws/scripts
chmod +x deploy.sh
./deploy.sh          # auto-reads IP + key from Terraform outputs
```

---

## Cost Management

> **Always stop the instance when not demoing to preserve credits.**

| Action | How |
|--------|-----|
| Stop instance (keeps data) | AWS Console → EC2 → Stop |
| Start instance again | AWS Console → EC2 → Start |
| Destroy everything | `terraform destroy -var-file="secrets.tfvars"` |

**Estimated cost (m7i-flex.large):**

| Usage | Cost |
|-------|------|
| 2 hrs demo recording | ~$0.00 (Free Tier) |
| 8 hrs/day × 5 days | ~Free Tier covered |

---

## Local Fallback

Always works without AWS:

```bash
cd projects/01-ai-devops-copilot
docker compose up -d
```

Set `CLOUDWATCH_ENABLED=false` in `.env` to use in-memory sample logs.
