#!/bin/bash
set -e
exec > /var/log/copilot-setup.log 2>&1

# ── System update ────────────────────────────────────────────────────────────
apt-get update -y
apt-get install -y ca-certificates curl gnupg git

# ── Docker ───────────────────────────────────────────────────────────────────
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

# ── Write .env ────────────────────────────────────────────────────────────────
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

cat > /home/ubuntu/app/projects/01-ai-devops-copilot/.env <<ENV
GROQ_API_KEY=${groq_api_key}
GROQ_MODEL=llama3-8b-8192
CHROMA_HOST=chromadb
CHROMA_PORT=8000
NEXT_PUBLIC_API_URL=http://$PUBLIC_IP:8000
AWS_REGION=us-east-1
CLOUDWATCH_ENABLED=true
GITHUB_TOKEN=${github_token}
ENV

# ── Systemd service ───────────────────────────────────────────────────────────
cat > /etc/systemd/system/copilot.service <<'SERVICE'
[Unit]
Description=AI DevOps Copilot
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=ubuntu
WorkingDirectory=/home/ubuntu/app/projects/01-ai-devops-copilot
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable copilot

# ── Start stack ───────────────────────────────────────────────────────────────
cd /home/ubuntu/app/projects/01-ai-devops-copilot
sudo -u ubuntu docker compose up -d

echo "Setup complete. App running at http://$PUBLIC_IP:3000"
