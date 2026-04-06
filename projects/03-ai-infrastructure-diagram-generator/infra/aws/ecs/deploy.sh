#!/usr/bin/env bash
# Deploy backend + frontend images to ECR and update ECS service.
# Prerequisites: AWS CLI configured, Docker running, ECR repos created.
set -e

REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
PROJECT="infra-diagram"

echo "==> Logging in to ECR..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

# Create ECR repos if they don't exist
for REPO in "${PROJECT}-backend" "${PROJECT}-frontend"; do
  aws ecr describe-repositories --repository-names "$REPO" --region "$REGION" 2>/dev/null \
    || aws ecr create-repository --repository-name "$REPO" --region "$REGION"
done

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

echo "==> Building and pushing backend..."
docker build -t "${ECR_REGISTRY}/${PROJECT}-backend:latest" "${ROOT}/backend"
docker push "${ECR_REGISTRY}/${PROJECT}-backend:latest"

echo "==> Building and pushing frontend..."
docker build -t "${ECR_REGISTRY}/${PROJECT}-frontend:latest" "${ROOT}/frontend"
docker push "${ECR_REGISTRY}/${PROJECT}-frontend:latest"

echo "==> Updating ECS service (if exists)..."
CLUSTER="${PROJECT}-cluster"
SERVICE="${PROJECT}-service"
aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" --force-new-deployment --region "$REGION" 2>/dev/null \
  && echo "ECS service updated." \
  || echo "ECS service not found — deploy manually or via Terraform."

echo "==> Done."
