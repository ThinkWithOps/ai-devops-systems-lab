#!/bin/bash
set -e
exec > /var/log/repo-explainer-setup.log 2>&1

# ── System update ─────────────────────────────────────────────────────────────
apt-get update -y
apt-get install -y ca-certificates curl gnupg git

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

# ── Write .env for repo explainer ─────────────────────────────────────────────
cat > /home/ubuntu/app/projects/02-ai-github-repo-explainer/.env <<ENV
GROQ_API_KEY=${groq_api_key}
GROQ_MODEL=llama-3.1-8b-instant
CHROMA_HOST=chromadb
CHROMA_PORT=8000
NEXT_PUBLIC_API_URL=http://$PUBLIC_IP:8000
GITHUB_TOKEN=${github_token}
ENV

# ── Write .env for ShopFlow demo app ──────────────────────────────────────────
cat > /home/ubuntu/app/projects/02-ai-github-repo-explainer/demo-app/.env <<ENV
NEXT_PUBLIC_API_URL=http://$PUBLIC_IP:8020
ENV

# ── Start ShopFlow demo app ───────────────────────────────────────────────────
cd /home/ubuntu/app/projects/02-ai-github-repo-explainer/demo-app
sudo -u ubuntu docker compose up -d

# ── Systemd service for repo explainer ───────────────────────────────────────
cat > /etc/systemd/system/repo-explainer.service <<'SERVICE'
[Unit]
Description=AI GitHub Repo Explainer
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=ubuntu
WorkingDirectory=/home/ubuntu/app/projects/02-ai-github-repo-explainer
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable repo-explainer

# ── Start repo explainer stack ────────────────────────────────────────────────
cd /home/ubuntu/app/projects/02-ai-github-repo-explainer
sudo -u ubuntu docker compose up -d

echo "Setup complete."
echo "Repo Explainer: http://$PUBLIC_IP:3000"
echo "ShopFlow Demo:  http://$PUBLIC_IP:3002"
