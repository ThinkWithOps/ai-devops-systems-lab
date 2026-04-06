"""
Prometheus metrics middleware for ShopFlow ecommerce.

Exposes metrics at /metrics for scraping by Prometheus.
Tracks HTTP request rates, latencies, order counts, payment durations,
failure mode states, and inventory levels.
"""
import time
from prometheus_client import Counter, Histogram, Gauge, CONTENT_TYPE_LATEST, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# HTTP request metrics
ecommerce_requests_total = Counter(
    "ecommerce_requests_total",
    "Total HTTP requests to ShopFlow API",
    ["method", "endpoint", "status_code"],
)

ecommerce_request_duration_seconds = Histogram(
    "ecommerce_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

# Order metrics
ecommerce_orders_total = Counter(
    "ecommerce_orders_total",
    "Total orders created",
    ["status"],
)

# Payment metrics
ecommerce_payment_duration_seconds = Histogram(
    "ecommerce_payment_duration_seconds",
    "Payment processing time in seconds",
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
)

# Failure mode gauge
ecommerce_active_failures = Gauge(
    "ecommerce_active_failures",
    "Whether a failure mode is currently active (1=active, 0=inactive)",
    ["mode"],
)

# Inventory gauge
ecommerce_inventory_level = Gauge(
    "ecommerce_inventory_level",
    "Current stock level per product",
    ["product_id", "product_name"],
)


def normalize_path(path: str) -> str:
    """Normalize dynamic path segments to reduce cardinality."""
    import re
    path = re.sub(r"/\d+", "/{id}", path)
    return path


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Middleware that records per-request Prometheus metrics."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        method = request.method
        endpoint = normalize_path(request.url.path)

        try:
            response = await call_next(request)
            status_code = str(response.status_code)
        except Exception as exc:
            status_code = "500"
            raise exc
        finally:
            duration = time.time() - start_time
            ecommerce_requests_total.labels(
                method=method,
                endpoint=endpoint,
                status_code=status_code,
            ).inc()
            ecommerce_request_duration_seconds.labels(
                method=method,
                endpoint=endpoint,
            ).observe(duration)

        return response


def update_failure_gauges():
    """Update Prometheus gauges to reflect current failure mode states."""
    from app.services.failure_service import failure_service
    failures = failure_service.get_failures()
    for mode, info in failures.items():
        ecommerce_active_failures.labels(mode=mode).set(1 if info["active"] else 0)
