#!/usr/bin/env bash
# Redeploy the app on EC2 after a git push.
# Run from the project root: bash infra/aws/scripts/deploy.sh
set -e

PROJECT="03-ai-infrastructure-diagram-generator"
PEM=$(ls infra/aws/*.pem 2>/dev/null | head -1)

if [ -z "$PEM" ]; then
  echo "ERROR: No .pem file found in infra/aws/. Run terraform apply first."
  exit 1
fi

IP=$(cd infra/aws/terraform && terraform output -raw instance_public_ip 2>/dev/null)
if [ -z "$IP" ]; then
  echo "ERROR: Could not read instance_public_ip from Terraform state."
  exit 1
fi

echo "==> Deploying to EC2 at $IP..."

ssh -i "$PEM" -o StrictHostKeyChecking=no ubuntu@"$IP" << ENDSSH
  set -e
  cd /home/ubuntu/app
  git pull
  cd projects/$PROJECT
  docker compose down
  docker compose up -d --build
  echo "Redeploy complete."
ENDSSH

echo ""
echo "==> Done."
echo "    Frontend: http://$IP:3000"
echo "    Backend:  http://$IP:8000"
echo "    API docs: http://$IP:8000/docs"
