#!/usr/bin/env bash
set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  AI DevOps Copilot — Setup Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ---- Check prerequisites ----
echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"

if ! command -v docker &>/dev/null; then
  echo -e "${RED}[ERROR] Docker is not installed. Install from https://docs.docker.com/get-docker/${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓ Docker found: $(docker --version | cut -d' ' -f3 | tr -d ',')${NC}"

if ! command -v docker compose &>/dev/null && ! command -v docker-compose &>/dev/null; then
  echo -e "${RED}[ERROR] docker-compose is not installed.${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓ docker-compose found${NC}"

# ---- Set up .env ----
echo -e "\n${YELLOW}[2/6] Setting up environment file...${NC}"
cd "$PROJECT_DIR"

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "  ${GREEN}✓ Created .env from .env.example${NC}"
  echo -e "  ${YELLOW}  Note: Set GITHUB_TOKEN in .env for real GitHub data (optional)${NC}"
else
  echo -e "  ${GREEN}✓ .env already exists — skipping${NC}"
fi

# ---- Start Docker services ----
echo -e "\n${YELLOW}[3/6] Starting Docker services...${NC}"

if command -v docker compose &>/dev/null; then
  COMPOSE_CMD="docker compose"
else
  COMPOSE_CMD="docker-compose"
fi

$COMPOSE_CMD up -d --build
echo -e "  ${GREEN}✓ Services started${NC}"

# ---- Wait for services to be ready ----
echo -e "\n${YELLOW}[4/6] Waiting for services to be healthy...${NC}"

wait_for_service() {
  local name=$1
  local url=$2
  local max_attempts=${3:-30}
  local attempt=0

  echo -n "  Waiting for $name"
  while [ $attempt -lt $max_attempts ]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo -e " ${GREEN}✓${NC}"
      return 0
    fi
    echo -n "."
    sleep 2
    ((attempt++))
  done
  echo -e " ${RED}TIMEOUT${NC}"
  return 1
}

wait_for_service "ChromaDB" "http://localhost:8001/api/v1/heartbeat" 30
wait_for_service "FastAPI backend" "http://localhost:8000/api/health" 30

echo -e "  ${GREEN}✓ All services are ready${NC}"

# ---- Seed ChromaDB ----
echo -e "\n${YELLOW}[5/6] Seeding ChromaDB with documentation...${NC}"

if command -v python3 &>/dev/null; then
  # Try to install chromadb if not available
  python3 -c "import chromadb" 2>/dev/null || pip3 install chromadb --quiet

  CHROMA_HOST=localhost CHROMA_PORT=8001 python3 vectorstore/ingest.py
  echo -e "  ${GREEN}✓ ChromaDB seeded with DevOps documentation and sample logs${NC}"
else
  echo -e "  ${YELLOW}⚠ Python3 not found locally. Seeding via Docker container...${NC}"
  $COMPOSE_CMD exec backend python3 /app/vectorstore/ingest.py || \
    echo -e "  ${YELLOW}⚠ Could not seed automatically. Run manually: docker compose exec backend python3 vectorstore/ingest.py${NC}"
fi

# ---- Pull Ollama model ----
echo -e "\n${YELLOW}[6/6] Setting up Ollama LLM...${NC}"
echo -e "  ${YELLOW}Pulling llama3 model (this may take several minutes on first run)...${NC}"

if docker exec ai-devops-copilot-ollama-1 ollama pull llama3 2>/dev/null || \
   docker exec "$(docker ps --filter name=ollama --format '{{.Names}}' | head -1)" ollama pull llama3 2>/dev/null; then
  echo -e "  ${GREEN}✓ llama3 model is ready${NC}"
else
  echo -e "  ${YELLOW}⚠ Could not pull llama3 automatically. Run manually:${NC}"
  echo -e "  ${YELLOW}  docker exec \$(docker ps --filter name=ollama --format '{{.Names}}' | head -1) ollama pull llama3${NC}"
fi

# ---- Summary ----
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "  Access URLs:"
echo -e "  ${BLUE}• Frontend:  http://localhost:3000${NC}"
echo -e "  ${BLUE}• Backend:   http://localhost:8000${NC}"
echo -e "  ${BLUE}• API Docs:  http://localhost:8000/docs${NC}"
echo -e "  ${BLUE}• ChromaDB:  http://localhost:8001${NC}"
echo -e "  ${BLUE}• Ollama:    http://localhost:11434${NC}"
echo ""
echo -e "  If llama3 wasn't pulled automatically, run:"
echo -e "  ${YELLOW}  docker exec \$(docker ps --filter name=ollama --format '{{.Names}}' | head -1) ollama pull llama3${NC}"
echo ""
echo -e "  To view logs:"
echo -e "  ${YELLOW}  docker compose logs -f${NC}"
echo ""
