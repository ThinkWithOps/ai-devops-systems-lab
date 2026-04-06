# Bella Roma Restaurant App — Operations Runbook

## Architecture Overview

The Bella Roma restaurant app runs as a Docker Compose stack:
- **Frontend**: Next.js on port 3001
- **Backend API**: FastAPI on port 8010 (internal: 8001)
- **Database**: PostgreSQL on port 5433
- **Cache**: Redis on port 6380

## Failure Modes and Remediation

### slow_menu — Menu API Latency (2s delay)

**Symptom:** Menu page takes 2+ seconds to load. Prometheus metric `restaurant_menu_request_duration_seconds` shows P99 > 2s.

**Cause:** `slow_menu` failure mode is active — artificial 2-second delay injected into `GET /api/menu`.

**Fix:**
1. Go to `http://<ip>:3001/operator` → Failures tab
2. Disable `slow_menu` toggle
3. Or via API: `POST http://<ip>:8010/api/admin/failures/slow_menu/disable`
4. Verify: reload menu page — should respond in <100ms

**To detect with AI Copilot:** Ask "Why is the restaurant menu API slow?" — it will check restaurant_monitor(failures) and find slow_menu active.

---

### kitchen_down — Kitchen Returns 503

**Symptom:** Kitchen queue page shows error. `GET /api/kitchen/queue` returns HTTP 503.

**Cause:** `kitchen_down` failure mode is active — all kitchen requests rejected.

**Fix:**
1. Operator dashboard → Failures → Disable `kitchen_down`
2. Or: `POST http://<ip>:8010/api/admin/failures/kitchen_down/disable`
3. Verify: kitchen queue loads successfully

**Impact:** Orders cannot be tracked in kitchen. Food service halted.

---

### payment_timeout — Payments Take 5s Then Fail

**Symptom:** Payment processing takes 5 seconds and fails. Payment status shows `failed` or `timeout`.

**Cause:** `payment_timeout` failure mode active — simulates payment gateway timeout.

**Fix:**
1. Disable `payment_timeout` in operator dashboard
2. Or: `POST http://<ip>:8010/api/admin/failures/payment_timeout/disable`
3. Reprocess pending payments

**Impact:** Revenue loss, customer frustration. Check `payment_statuses` in stats endpoint.

---

### reservation_conflict — All Reservations Return 409

**Symptom:** Any reservation attempt fails with HTTP 409 Conflict.

**Cause:** `reservation_conflict` failure mode active — simulates booking system bug.

**Fix:**
1. Disable `reservation_conflict` in operator dashboard
2. Customers can retry reservations after fix

---

### db_slow — Database Operations Add 1s Delay

**Symptom:** Order creation takes 1+ seconds. Affects all DB-heavy operations.

**Cause:** `db_slow` failure mode active — artificial 1-second delay before all database operations.

**Fix:**
1. Disable `db_slow` in operator dashboard
2. Monitor `restaurant_orders_total` rate to confirm recovery

## Health Check Endpoints

```bash
# Overall health
curl http://<ip>:8010/api/health
# Expected: {"status": "ok", "database": true, "redis": true}

# Active failures
curl http://<ip>:8010/api/admin/failures
# Check "active_count" field

# Business stats
curl http://<ip>:8010/api/admin/stats

# Prometheus metrics
curl http://<ip>:8010/metrics | grep restaurant_
```

## Container Management

```bash
# View all restaurant containers
docker ps | grep restaurant

# View backend logs
docker logs restaurant-backend --tail=50 -f

# Restart specific service
docker compose -f /home/ubuntu/app/projects/01-ai-devops-copilot/demo-app/docker-compose.yml restart backend

# Rebuild after code change
docker compose -f /home/ubuntu/app/projects/01-ai-devops-copilot/demo-app/docker-compose.yml up -d --build backend

# Re-seed database
curl -X POST http://localhost:8010/api/admin/seed
```

## Demo Scenario: Full Incident Lifecycle

1. **Inject failure**: Enable `kitchen_down` in operator dashboard
2. **Observe**: Kitchen queue page shows 503 error
3. **Check metrics**: `http://<ip>:8010/metrics` shows 503 error rate rising
4. **AI diagnosis**: Ask copilot "What is wrong with the restaurant app right now?"
5. **Copilot detects**: Uses `restaurant_monitor(failures)` → finds `kitchen_down: ACTIVE`
6. **Remediation**: Copilot recommends disabling `kitchen_down`
7. **Fix**: Disable in operator dashboard
8. **Recovery**: Kitchen queue loads, error rate returns to 0

## Key Prometheus Metrics

| Metric | Type | What it means |
|---|---|---|
| `restaurant_active_failures{mode="*"}` | Gauge | 1=active failure, 0=healthy |
| `restaurant_menu_request_duration_seconds` | Histogram | Menu API latency |
| `restaurant_payment_duration_seconds` | Histogram | Payment processing time |
| `restaurant_kitchen_queue_depth` | Gauge | Orders in kitchen queue |
| `restaurant_orders_total{status="*"}` | Counter | Order counts by status |
| `restaurant_reservations_total{status="*"}` | Counter | Reservation counts |
| `http_requests_total{status="503"}` | Counter | 503 errors (kitchen_down) |
| `http_requests_total{status="409"}` | Counter | 409 errors (reservation_conflict) |
