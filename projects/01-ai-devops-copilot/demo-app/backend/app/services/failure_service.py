"""
Failure injection service for AI DevOps demo scenarios.

Tracks active failure modes and their state. Each failure mode
can be enabled/disabled via the admin API to simulate real-world
production incidents for the AI Copilot to detect and diagnose.
"""
import structlog

logger = structlog.get_logger()

FAILURE_MODES = {
    "slow_menu": False,
    "kitchen_down": False,
    "payment_timeout": False,
    "reservation_conflict": False,
    "db_slow": False,
}

FAILURE_DESCRIPTIONS = {
    "slow_menu": "Menu API adds a 2-second artificial delay, simulating a slow upstream dependency",
    "kitchen_down": "Kitchen queue returns HTTP 503 Service Unavailable, simulating a kitchen system crash",
    "payment_timeout": "Payment processing waits 5 seconds then fails, simulating a payment gateway timeout",
    "reservation_conflict": "All reservation attempts return HTTP 409 Conflict, simulating a booking system bug",
    "db_slow": "All database operations add a 1-second delay, simulating database performance degradation",
}


class FailureService:
    """
    Manages active failure modes for demo/chaos engineering purposes.
    State is in-memory (resets on container restart).
    """

    def __init__(self):
        self._active: dict[str, bool] = {k: v for k, v in FAILURE_MODES.items()}

    def enable(self, mode: str) -> bool:
        """Enable a failure mode. Returns True if valid mode."""
        if mode not in self._active:
            return False
        self._active[mode] = True
        logger.warning(
            "failure_mode_enabled",
            mode=mode,
            description=FAILURE_DESCRIPTIONS.get(mode, ""),
            failure_type="chaos_injection",
        )
        return True

    def disable(self, mode: str) -> bool:
        """Disable a failure mode. Returns True if valid mode."""
        if mode not in self._active:
            return False
        self._active[mode] = False
        logger.info(
            "failure_mode_disabled",
            mode=mode,
            failure_type="chaos_recovery",
        )
        return True

    def is_active(self, mode: str) -> bool:
        """Check if a failure mode is currently active."""
        return self._active.get(mode, False)

    def get_all(self) -> dict:
        """Return all failure modes with their active status and descriptions."""
        return {
            mode: {
                "active": self._active[mode],
                "description": FAILURE_DESCRIPTIONS.get(mode, ""),
            }
            for mode in self._active
        }

    def get_active_count(self) -> int:
        """Return count of currently active failure modes."""
        return sum(1 for v in self._active.values() if v)


# Singleton instance shared across the application
failure_service = FailureService()
