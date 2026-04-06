# ShopFlow — Ecommerce Demo App

A realistic ecommerce platform used as a demo target for the **AI GitHub Repo Explainer** (Project 02).

## What It Is

ShopFlow is a full-stack ecommerce application with:
- Customer storefront (browse, cart, checkout)
- Order and payment tracking
- Operator dashboard with failure injection
- Prometheus metrics + structured logs

It serves two purposes:
1. **Running app** — a live ecommerce platform you can interact with
2. **AI demo target** — paste its GitHub URL into the AI GitHub Repo Explainer and ask the AI to explain its architecture, services, and code

---

## Ports

| Service | Port |
|---------|------|
| Frontend (storefront) | 3002 |
| Backend API | 8020 |
| PostgreSQL | 5434 |
| Redis | 6381 |

---

## Quick Start

```bash
cd projects/02-ai-github-repo-explainer/demo-app
cp .env.example .env
docker-compose up -d --build
```

Seed the database (first run):
```bash
curl -X POST http://localhost:8020/api/admin/seed
```

Open the storefront: `http://localhost:3002`
Open the operator panel: `http://localhost:3002/operator`

---

## Demo Scenario — AI GitHub Repo Explainer

1. Start this app with `docker-compose up -d`
2. Open the AI GitHub Repo Explainer at `http://localhost:3000`
3. Paste this repo URL into the Explore tab
4. Ask the AI:
   - *"What services does this ecommerce app have?"*
   - *"How does the payment flow work?"*
   - *"What's the database schema?"*
   - *"How are failure modes injected?"*
   - *"What does the checkout service do?"*

---

## Failure Modes

Inject failures via the operator dashboard at `http://localhost:3002/operator`:

| Mode | Effect |
|------|--------|
| `payment_timeout` | Payments take 5s then fail |
| `inventory_mismatch` | All inventory checks fail |
| `slow_products` | Product catalog adds 2s delay |
| `checkout_error` | Checkout returns 500 error |
| `db_slow` | Database operations add 1s delay |

Or via API:
```bash
curl -X POST http://localhost:8020/api/admin/failures/payment_timeout/enable
curl -X POST http://localhost:8020/api/admin/failures/payment_timeout/disable
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service health check |
| GET | `/api/products` | List all products |
| GET | `/api/products/{id}` | Product detail |
| GET/POST | `/api/cart` | Cart operations |
| POST | `/api/checkout` | Place an order |
| GET | `/api/orders` | List orders |
| GET | `/api/orders/{id}` | Order detail |
| POST | `/api/payments/{order_id}/process` | Process payment |
| GET | `/api/admin/failures` | List failure modes |
| POST | `/api/admin/failures/{mode}/enable` | Enable a failure |
| POST | `/api/admin/failures/{mode}/disable` | Disable a failure |
| GET | `/api/admin/stats` | Business stats |
| POST | `/api/admin/seed` | Seed demo data |
| GET | `/metrics` | Prometheus metrics |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend API | FastAPI + Python 3.11 |
| Database | PostgreSQL |
| Cache | Redis (cart sessions) |
| Metrics | Prometheus |
| Deployment | Docker Compose |

---

## Project Structure

```text
demo-app/
  frontend/               # Next.js storefront
    app/
      page.tsx            # Homepage / storefront
      products/           # Product listing + detail
      cart/               # Cart view
      checkout/           # Checkout flow
      orders/             # Order confirmation
      operator/           # Operator dashboard + failure injection
    components/
      Navbar.tsx
      ProductCard.tsx
      CartItem.tsx
      FailureToggle.tsx
      StatusBadge.tsx
    lib/api.ts
  backend/
    app/
      api/routes/         # products, cart, checkout, orders, payments, admin, metrics
      services/           # product, cart, order, payment, inventory, failure
      middleware/         # Prometheus metrics
      models.py           # SQLAlchemy models
      schemas/            # Pydantic schemas
      main.py
      config.py
      database.py
      seed.py
  docker-compose.yml
  .env.example
```

---

## Cleanup

```bash
docker-compose down
docker-compose down -v   # also removes database volume
```
