"""
Prometheus metrics definitions for the Bella Roma Restaurant API.

All metrics are defined here and exported as a singleton.
They are exposed via the /metrics endpoint using prometheus_client.
"""
from prometheus_client import Counter, Histogram, Gauge

# ─── Request Metrics ──────────────────────────────────────────────────────────

http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests processed",
    ["method", "endpoint", "status"],
)

# ─── Business Metrics ─────────────────────────────────────────────────────────

orders_total = Counter(
    "restaurant_orders_total",
    "Total orders by status transition",
    ["status"],
)

reservations_total = Counter(
    "restaurant_reservations_total",
    "Total reservations by outcome",
    ["status"],
)

# ─── Performance Metrics ──────────────────────────────────────────────────────

payment_duration = Histogram(
    "restaurant_payment_duration_seconds",
    "Time taken to process payments",
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
)

menu_request_duration = Histogram(
    "restaurant_menu_request_duration_seconds",
    "Time taken to serve menu requests",
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0],
)

# ─── Operational Gauges ───────────────────────────────────────────────────────

kitchen_queue_depth = Gauge(
    "restaurant_kitchen_queue_depth",
    "Number of orders currently in the kitchen queue (pending + preparing)",
)

active_failures = Gauge(
    "restaurant_active_failures",
    "Whether a failure mode is currently active (1=active, 0=inactive)",
    ["mode"],
)


class MetricsService:
    """Convenience wrapper exposing all metric objects."""

    def __init__(self):
        self.orders_total = orders_total
        self.reservations_total = reservations_total
        self.payment_duration = payment_duration
        self.kitchen_queue_depth = kitchen_queue_depth
        self.menu_request_duration = menu_request_duration
        self.active_failures = active_failures
        self.http_requests_total = http_requests_total

    def record_failure_state(self, mode: str, is_active: bool):
        """Update the Prometheus gauge for a failure mode."""
        self.active_failures.labels(mode=mode).set(1 if is_active else 0)

    def update_all_failure_states(self, states: dict):
        """Sync all failure mode gauges from a dict of {mode: {active: bool}}."""
        for mode, info in states.items():
            self.active_failures.labels(mode=mode).set(
                1 if info.get("active", False) else 0
            )


# Singleton instance
metrics = MetricsService()
