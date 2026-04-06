#!/usr/bin/env bash
set -e

echo "==> Setting up AI Infrastructure Diagram Generator"

# Copy env
cp .env.example .env
echo "==> Created .env from .env.example"

# Check Ollama
if command -v ollama &> /dev/null; then
  echo "==> Pulling llama3 model..."
  ollama pull llama3
else
  echo "WARNING: Ollama not found. Install from https://ollama.com and run: ollama pull llama3"
fi

# Install backend deps (local dev)
if command -v pip &> /dev/null; then
  echo "==> Installing backend Python dependencies..."
  pip install -r backend/requirements.txt
fi

# Install frontend deps
if command -v npm &> /dev/null; then
  echo "==> Installing frontend npm dependencies..."
  cd frontend && npm install && cd ..
fi

echo ""
echo "==> Setup complete."
echo "    Run with Docker:  docker-compose up --build"
echo "    Or manually:"
echo "      Terminal 1 — backend:  cd backend && uvicorn app.main:app --reload"
echo "      Terminal 2 — frontend: cd frontend && npm run dev"
echo "      ChromaDB:  docker run -p 8001:8000 chromadb/chroma"
