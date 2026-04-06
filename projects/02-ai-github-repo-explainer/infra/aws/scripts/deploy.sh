#!/bin/bash
# deploy.sh — pull latest code and restart the stack on EC2
# Usage: ./deploy.sh [EC2_PUBLIC_IP] [KEY_FILE]
# If no args given, reads IP and key from Terraform outputs automatically.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"

# Auto-detect from Terraform if no args provided
if [[ -z "$1" ]]; then
  echo "No IP provided — reading from Terraform outputs..."
  EC2_IP=$(cd "$TERRAFORM_DIR" && terraform output -raw instance_public_ip)
  KEY_FILE=$(cd "$TERRAFORM_DIR" && terraform output -raw private_key_path)
else
  EC2_IP=$1
  KEY_FILE=$2
fi

if [[ -z "$EC2_IP" || -z "$KEY_FILE" ]]; then
  echo "Usage: $0 [EC2_PUBLIC_IP] [KEY_FILE]"
  echo "Or run from infra/aws/terraform after 'terraform apply' with no args."
  exit 1
fi

echo "Deploying to $EC2_IP..."

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ubuntu@"$EC2_IP" bash <<'REMOTE'
set -e
cd /home/ubuntu/app
git pull

cd projects/02-ai-github-repo-explainer
docker compose up -d --build

echo "Deploy complete."
docker-compose ps
REMOTE

echo ""
echo "Repo Explainer: http://$EC2_IP:3000"
echo "Backend:        http://$EC2_IP:8000"
echo "API Docs:       http://$EC2_IP:8000/docs"
echo "ShopFlow Demo:  http://$EC2_IP:3002"
