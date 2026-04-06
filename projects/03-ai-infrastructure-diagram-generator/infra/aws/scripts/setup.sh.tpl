#!/bin/bash
set -e
exec > /var/log/infra-diagram-setup.log 2>&1

# ── System update ─────────────────────────────────────────────────────────────
apt-get update -y
apt-get install -y ca-certificates curl gnupg git

# ── Install Graphviz (required for diagram rendering) ─────────────────────────
apt-get install -y graphviz graphviz-dev

# ── Docker ────────────────────────────────────────────────────────────────────
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

usermod -aG docker ubuntu
systemctl enable docker
systemctl start docker

# ── Clone repo ────────────────────────────────────────────────────────────────
%{ if github_token != "" }
git clone https://${github_token}@${trimprefix(github_repo_url, "https://")} /home/ubuntu/app
%{ else }
git clone ${github_repo_url} /home/ubuntu/app
%{ endif }

chown -R ubuntu:ubuntu /home/ubuntu/app

# ── Get public IP ─────────────────────────────────────────────────────────────
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# ── Write .env ────────────────────────────────────────────────────────────────
cat > /home/ubuntu/app/projects/03-ai-infrastructure-diagram-generator/.env <<ENV
# LLM — Bedrock via EC2 IAM instance profile (no keys needed)
GROQ_API_KEY=
OPENAI_API_KEY=

# ChromaDB (local container)
CHROMA_HOST=chromadb
CHROMA_PORT=8000
CHROMA_COLLECTION=infra_diagrams

# App
LOG_LEVEL=info
MAX_UPLOAD_SIZE_MB=10

# Frontend
NEXT_PUBLIC_API_URL=http://$PUBLIC_IP:8000

# AWS — credentials picked up from EC2 instance profile automatically
AWS_REGION=${aws_region}

# Bedrock — primary LLM
AWS_BEDROCK_ENABLED=true

# S3 — diagram storage
AWS_S3_ENABLED=true
AWS_S3_BUCKET=${s3_bucket}

# DynamoDB — diagram history
AWS_DYNAMODB_ENABLED=true
AWS_DYNAMODB_TABLE=${dynamodb_table}
ENV

chown ubuntu:ubuntu /home/ubuntu/app/projects/03-ai-infrastructure-diagram-generator/.env

# ── Systemd service ───────────────────────────────────────────────────────────
cat > /etc/systemd/system/infra-diagram.service <<'SERVICE'
[Unit]
Description=AI Infrastructure Diagram Generator
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=ubuntu
WorkingDirectory=/home/ubuntu/app/projects/03-ai-infrastructure-diagram-generator
ExecStart=/usr/bin/docker compose up -d --build
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable infra-diagram

# ── Start the stack ───────────────────────────────────────────────────────────
cd /home/ubuntu/app/projects/03-ai-infrastructure-diagram-generator
sudo -u ubuntu docker compose up -d --build

echo "Setup complete."
echo "Frontend: http://$PUBLIC_IP:3000"
echo "Backend:  http://$PUBLIC_IP:8000"
echo "API docs: http://$PUBLIC_IP:8000/docs"
