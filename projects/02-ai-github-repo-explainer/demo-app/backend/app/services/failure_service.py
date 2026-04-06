"""
FailureService — controls injectable failure modes for demo/testing purposes.

Failure modes allow the operator dashboard to simulate real-world outages
and degraded service scenarios without modifying application code.
"""
from typing import Any


class FailureService:
    """
    Manages toggleable failure modes that simulate real-world production issues.

    Each failure mode maps to a specific service behavior:
    - payment_timeout: Payment processor hangs for 5s then fails
    - inventory_mismatch: Stock checks return incorrect availability
    - slow_products: Product catalog queries delayed by 2 seconds
    - checkout_error: Order creation fails with a 500 error
    - db_slow: Database queries simulated as slow (1s delay)
    """

    FAILURE_MODES = {
        "payment_timeout": {
            "description": "Payment processor times out after 5 seconds",
            "service": "PaymentService",
            "impact": "Orders cannot be completed",
        },
        "inventory_mismatch": {
            "description": "Inventory checks return incorrect stock levels",
            "service": "InventoryService",
            "impact": "Items may appear in/out of stock incorrectly",
        },
        "slow_products": {
            "description": "Product catalog queries delayed by 2 seconds",
            "service": "ProductService",
            "impact": "Storefront loads slowly",
        },
        "checkout_error": {
            "description": "Order creation fails with internal server error",
            "service": "OrderService",
            "impact": "Users cannot place orders",
        },
        "db_slow": {
            "description": "Database queries delayed by 1 second",
            "service": "Database",
            "impact": "All data operations are slow",
        },
    }

    def __init__(self):
        self._active: dict[str, bool] = {mode: False for mode in self.FAILURE_MODES}

    def get_failures(self) -> dict[str, Any]:
        """Return all failure modes with their current active status and metadata."""
        result = {}
        for mode, meta in self.FAILURE_MODES.items():
            result[mode] = {
                "active": self._active[mode],
                "description": meta["description"],
                "service": meta["service"],
                "impact": meta["impact"],
            }
        return result

    def enable(self, mode: str) -> bool:
        """Enable a failure mode. Returns True if successful."""
        if mode not in self._active:
            return False
        self._active[mode] = True
        return True

    def disable(self, mode: str) -> bool:
        """Disable a failure mode. Returns True if successful."""
        if mode not in self._active:
            return False
        self._active[mode] = False
        return True

    def is_active(self, mode: str) -> bool:
        """Check if a specific failure mode is currently active."""
        return self._active.get(mode, False)

    def get_active_count(self) -> int:
        """Return the number of currently active failure modes."""
        return sum(1 for active in self._active.values() if active)

    def get_active_modes(self) -> list[str]:
        """Return list of currently active failure mode names."""
        return [mode for mode, active in self._active.items() if active]

    def disable_all(self) -> None:
        """Disable all failure modes."""
        for mode in self._active:
            self._active[mode] = False


# Singleton instance — shared across the application
failure_service = FailureService()
