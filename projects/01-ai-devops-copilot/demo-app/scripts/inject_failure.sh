#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# inject_failure.sh — Enable a failure mode via the admin API.
#
# Usage:
#   ./scripts/inject_failure.sh kitchen_down
#   ./scripts/inject_failure.sh slow_menu
#   ./scripts/inject_failure.sh payment_timeout
#   ./scripts/inject_failure.sh reservation_conflict
#   ./scripts/inject_failure.sh db_slow
#   ./scripts/inject_failure.sh --list        # show all failure modes
#   ./scripts/inject_failure.sh --disable ALL # disable all failures
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:8001}"
FAILURES_ENDPOINT="${BACKEND_URL}/api/admin/failures"

VALID_MODES=("slow_menu" "kitchen_down" "payment_timeout" "reservation_conflict" "db_slow")

DESCRIPTIONS=(
  "slow_menu: Adds 2-second delay to GET /api/menu"
  "kitchen_down: Returns 503 on GET /api/kitchen/queue"
  "payment_timeout: 5-second timeout then payment fails"
  "reservation_conflict: Forces 409 on POST /api/reservations"
  "db_slow: Adds 1-second delay to DB operations in orders"
)

print_usage() {
  echo "=================================================="
  echo " Bella Roma — Failure Injection Script"
  echo "=================================================="
  echo ""
  echo "Usage:"
  echo "  ./inject_failure.sh <mode>                 Enable a failure mode"
  echo "  ./inject_failure.sh --disable <mode>       Disable a specific mode"
  echo "  ./inject_failure.sh --disable ALL          Disable all failure modes"
  echo "  ./inject_failure.sh --list                 Show all failure modes"
  echo "  ./inject_failure.sh --status               Show current failure states"
  echo ""
  echo "Available failure modes:"
  for desc in "${DESCRIPTIONS[@]}"; do
    echo "  - ${desc}"
  done
  echo ""
}

list_modes() {
  echo "Available failure modes:"
  for desc in "${DESCRIPTIONS[@]}"; do
    echo "  - ${desc}"
  done
}

show_status() {
  echo "Current failure states:"
  echo ""
  RESPONSE=$(curl -sf "${FAILURES_ENDPOINT}" 2>&1 || echo "ERROR")
  if [ "$RESPONSE" = "ERROR" ]; then
    echo "  ERROR: Could not connect to backend at ${BACKEND_URL}"
    echo "  Is the app running? Try: docker-compose up -d"
    exit 1
  fi
  echo "  ${RESPONSE}"
  echo ""
}

enable_mode() {
  local mode="$1"
  echo "Enabling failure mode: ${mode}"

  RESPONSE=$(curl -sf -X POST "${FAILURES_ENDPOINT}/${mode}/enable" \
    -H "Content-Type: application/json" \
    -w "\n%{http_code}" 2>&1)

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Failure mode '${mode}' is now ENABLED"
    echo "  ${BODY}"
    echo ""
    echo "The AI DevOps Copilot will now detect anomalies from this failure."
    echo "Check metrics at: ${BACKEND_URL}/metrics"
    echo "To disable: ./inject_failure.sh --disable ${mode}"
  else
    echo "ERROR: Request failed with HTTP ${HTTP_CODE}"
    echo "  ${BODY}"
    exit 1
  fi
}

disable_mode() {
  local mode="$1"
  echo "Disabling failure mode: ${mode}"

  RESPONSE=$(curl -sf -X POST "${FAILURES_ENDPOINT}/${mode}/disable" \
    -H "Content-Type: application/json" \
    -w "\n%{http_code}" 2>&1)

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Failure mode '${mode}' is now DISABLED — system recovering"
    echo "  ${BODY}"
  else
    echo "ERROR: Request failed with HTTP ${HTTP_CODE}"
    echo "  ${BODY}"
    exit 1
  fi
}

disable_all() {
  echo "Disabling all failure modes..."
  for mode in "${VALID_MODES[@]}"; do
    disable_mode "$mode"
  done
  echo ""
  echo "✓ All failure modes disabled. System restored to normal operation."
}

# ─── Main logic ───────────────────────────────────────────────────────────────

if [ $# -eq 0 ]; then
  print_usage
  exit 0
fi

case "$1" in
  --list)
    list_modes
    exit 0
    ;;
  --status)
    show_status
    exit 0
    ;;
  --disable)
    if [ $# -lt 2 ]; then
      echo "ERROR: --disable requires a mode argument (or ALL)"
      echo "Usage: ./inject_failure.sh --disable <mode|ALL>"
      exit 1
    fi
    if [ "$2" = "ALL" ]; then
      disable_all
    else
      disable_mode "$2"
    fi
    exit 0
    ;;
  --help|-h)
    print_usage
    exit 0
    ;;
  *)
    # Enable a failure mode
    mode="$1"

    # Validate mode
    valid=false
    for valid_mode in "${VALID_MODES[@]}"; do
      if [ "$mode" = "$valid_mode" ]; then
        valid=true
        break
      fi
    done

    if [ "$valid" = "false" ]; then
      echo "ERROR: Unknown failure mode '${mode}'"
      echo ""
      list_modes
      exit 1
    fi

    enable_mode "$mode"
    exit 0
    ;;
esac
