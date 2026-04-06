# Bella Roma Restaurant Demo App

A realistic restaurant ordering and reservation platform that produces operational signals (logs, metrics, incidents) for the AI DevOps Copilot platform to analyze and diagnose.

## What This App Is

Bella Roma is a full-stack restaurant management system simulating a real-world production application. It consists of:

- **Customer-facing UI**: Menu browsing, table reservations, order placement and tracking
- **Operator dashboard**: Kitchen queue management, reservation oversight, payment monitoring, and failure injection
- **Backend API**: FastAPI with structured JSON logs (structlog) and Prometheus metrics
- **Infrastructure**: PostgreSQL database, Redis cache, containerized with Docker

The application intentionally supports failure injection so that the AI DevOps Copilot can observe, analyze, and suggest remediations for realistic failure scenarios.

---

## How It Supports AI DevOps Demos

| Signal Type | What Is Produced |
|---|---|
| Structured Logs | JSON logs from structlog — every API call, order, payment, failure |
| Prometheus Metrics | Request counts, durations, kitchen queue depth, payment histograms |
| HTTP Errors | 503 kitchen_down, 409 reservation_conflict, timeout signals |
| Latency Spikes | slow_menu (2s), payment_timeout (5s), db_slow (1s) |
| Business Metrics | Revenue, order counts, reservation rates, cancellations |

The AI Copilot can:
1. Detect anomalies in Prometheus metrics (latency spikes, error rate increases)
2. Correlate log events with failure injection timestamps
3. Suggest root cause (e.g., "kitchen_down failure mode is active, disabling it will restore 503s")
4. Auto-remediate by calling the `/api/admin/failures/{mode}/disable` endpoint

---

## Prerequisites

- Docker Desktop
- `docker-compose` (V1 CLI, hyphenated)

---

## How to Run

```bash
# Clone or navigate to the project
cd projects/01-ai-devops-copilot/demo-app

# Start all services
docker-compose up --build -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

Once running:

| Service | URL |
|---|---|
| Frontend (Customer + Operator) | http://localhost:3001 |
| Backend API | http://localhost:8010 |
| Prometheus Metrics | http://localhost:8010/metrics |
| API Health Check | http://localhost:8010/api/health |

---

## Demo Scenarios

### Scenario 1: Normal Operations
Browse the menu, make a reservation, place an order, and advance it through the kitchen queue. Observe the structured logs and Prometheus metrics updating.

### Scenario 2: Kitchen Outage
1. Go to **Operator > Failures**
2. Enable `kitchen_down`
3. Watch kitchen queue return 503 errors
4. See error rate spike in metrics
5. The AI Copilot detects the anomaly and suggests disabling the failure
6. Disable `kitchen_down` — kitchen recovers

### Scenario 3: Slow Menu API
1. Enable `slow_menu` failure
2. Navigate to the Menu page — 2-second delay is visible
3. Prometheus `menu_request_duration` histogram shows P99 latency > 2s
4. AI Copilot identifies the slow endpoint and correlates with failure mode

### Scenario 4: Payment Gateway Failure
1. Enable `payment_timeout`
2. Place an order and process payment
3. Payment takes 5s then fails
4. See payment status = `failed` in the Payments tab
5. AI Copilot recommends disabling the timeout and retrying

### Scenario 5: Database Slowness
1. Enable `db_slow`
2. Place orders — each takes +1s
3. AI Copilot correlates DB query latency with the active failure mode

### Scenario 6: Reservation Conflict Storm
1. Enable `reservation_conflict`
2. Try to book any reservation — all return 409
3. Observe error logs flooding the structured log stream

---

## Failure Modes Reference

| Mode | Effect | Endpoint to Disable |
|---|---|---|
| `slow_menu` | Menu API adds 2-second delay | POST /api/admin/failures/slow_menu/disable |
| `kitchen_down` | Kitchen returns 503 Service Unavailable | POST /api/admin/failures/kitchen_down/disable |
| `payment_timeout` | Payment waits 5s then returns failed | POST /api/admin/failures/payment_timeout/disable |
| `reservation_conflict` | All reservations return 409 Conflict | POST /api/admin/failures/reservation_conflict/disable |
| `db_slow` | All DB operations add 1-second delay | POST /api/admin/failures/db_slow/disable |

---

## API Endpoints

### Menu
- `GET /api/menu` — All menu items grouped by category
- `GET /api/menu/{id}` — Single menu item

### Reservations
- `POST /api/reservations` — Create reservation
- `GET /api/reservations` — List all reservations
- `GET /api/reservations/{id}` — Single reservation
- `DELETE /api/reservations/{id}` — Cancel reservation

### Orders
- `POST /api/orders` — Place an order
- `GET /api/orders` — List orders (optional `?status=pending`)
- `GET /api/orders/{id}` — Order details
- `PUT /api/orders/{id}/status` — Update order status

### Kitchen
- `GET /api/kitchen/queue` — Active kitchen queue
- `PUT /api/kitchen/orders/{id}/advance` — Advance order status

### Payments
- `POST /api/payments/{order_id}/process` — Process payment
- `GET /api/payments` — List all payments

### Admin
- `GET /api/admin/failures` — All failure modes and status
- `POST /api/admin/failures/{mode}/enable` — Enable a failure
- `POST /api/admin/failures/{mode}/disable` — Disable a failure
- `GET /api/admin/stats` — System statistics
- `POST /api/admin/seed` — Re-seed the database

### Observability
- `GET /api/health` — Health check (DB + Redis status)
- `GET /metrics` — Prometheus metrics

---

## Cleanup

```bash
# Stop all services
docker-compose down

# Remove all data (destructive)
docker-compose down -v

# Rebuild from scratch
docker-compose up --build -d
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                     │
│           Next.js 14 + Tailwind               │
│     Customer UI + Operator Dashboard          │
│              :3001 (host)                     │
└─────────────────┬───────────────────────────┘
                  │ HTTP
┌─────────────────▼───────────────────────────┐
│                  Backend                      │
│          FastAPI + SQLAlchemy                 │
│      structlog + Prometheus metrics           │
│              :8010 (host)                     │
└──────────┬──────────────────┬───────────────┘
           │                  │
┌──────────▼──────┐  ┌────────▼──────────┐
│   PostgreSQL    │  │      Redis         │
│   :5433 (host)  │  │   :6380 (host)     │
└─────────────────┘  └────────────────────┘
```
