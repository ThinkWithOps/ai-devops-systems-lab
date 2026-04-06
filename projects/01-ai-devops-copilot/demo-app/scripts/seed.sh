#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# seed.sh — Wait for the backend to be healthy, then seed the database.
# Usage: ./scripts/seed.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:8001}"
HEALTH_ENDPOINT="${BACKEND_URL}/api/health"
SEED_ENDPOINT="${BACKEND_URL}/api/admin/seed"
MAX_RETRIES=30
RETRY_INTERVAL=3

echo "=================================================="
echo " Bella Roma Restaurant — Database Seeder"
echo "=================================================="
echo ""
echo "Waiting for backend at: ${HEALTH_ENDPOINT}"

retries=0
until curl -sf "${HEALTH_ENDPOINT}" > /dev/null 2>&1; do
  retries=$((retries + 1))
  if [ $retries -ge $MAX_RETRIES ]; then
    echo "ERROR: Backend did not become healthy after $((MAX_RETRIES * RETRY_INTERVAL)) seconds."
    echo "Check docker-compose logs: docker-compose logs backend"
    exit 1
  fi
  echo "  Attempt ${retries}/${MAX_RETRIES} — backend not ready yet, retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

echo ""
echo "✓ Backend is healthy!"
echo ""
echo "Triggering database seed..."

RESPONSE=$(curl -sf -X POST "${SEED_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Seed complete!"
  echo "  Response: ${BODY}"
else
  echo "⚠ Seed request returned HTTP ${HTTP_CODE}"
  echo "  Response: ${BODY}"
  echo "  (This may be normal if the database was already seeded)"
fi

echo ""
echo "=================================================="
echo " Bella Roma is ready! Access at:"
echo "   Frontend: http://localhost:3001"
echo "   Backend:  http://localhost:8001"
echo "   API Docs: http://localhost:8001/docs"
echo "   Metrics:  http://localhost:8001/metrics"
echo "=================================================="
