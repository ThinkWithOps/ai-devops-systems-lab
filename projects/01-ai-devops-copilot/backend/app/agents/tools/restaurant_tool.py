from typing import Type
from langchain.tools import BaseTool
from pydantic import BaseModel, Field
import httpx

from app.config import get_settings


class RestaurantMonitorInput(BaseModel):
    action: str = Field(
        description=(
            "What to check: "
            "'failures' — which failure modes are active (slow_menu, kitchen_down, etc), "
            "'metrics' — live performance data (latency, error rates, queue depth), "
            "'health' — is the restaurant service up, "
            "'stats' — business stats (orders, revenue, reservations)"
        )
    )


class RestaurantMonitorTool(BaseTool):
    name: str = "restaurant_monitor"
    description: str = (
        "Monitor the Bella Roma restaurant application. "
        "Use this tool to check active failure modes, live performance metrics, "
        "service health, and business statistics. "
        "Always check 'failures' first when diagnosing restaurant issues."
    )
    args_schema: Type[BaseModel] = RestaurantMonitorInput

    def _run(self, action: str) -> str:
        settings = get_settings()
        base_url = settings.restaurant_api_url.rstrip("/")

        try:
            action = action.strip().lower()

            if action == "failures":
                resp = httpx.get(f"{base_url}/api/admin/failures", timeout=5)
                resp.raise_for_status()
                data = resp.json()
                failures = data.get("failures", {})
                active = [m for m, info in failures.items() if info["active"]]
                lines = [
                    f"Restaurant failure modes — {len(active)} active out of {len(failures)} total:",
                ]
                for mode, info in failures.items():
                    status = "🔴 ACTIVE" if info["active"] else "✅ inactive"
                    lines.append(f"  {mode}: {status} — {info['description']}")
                if active:
                    lines.append(f"\nACTIVE FAILURES DETECTED: {', '.join(active)}")
                    lines.append("These are intentionally injected failures for demo/chaos engineering.")
                return "\n".join(lines)

            elif action == "health":
                resp = httpx.get(f"{base_url}/api/health", timeout=5)
                resp.raise_for_status()
                data = resp.json()
                return (
                    f"Restaurant service health: status={data.get('status')} "
                    f"database={data.get('database')} redis={data.get('redis')}"
                )

            elif action == "stats":
                resp = httpx.get(f"{base_url}/api/admin/stats", timeout=5)
                resp.raise_for_status()
                data = resp.json()
                lines = [
                    "Restaurant business stats:",
                    f"  Total orders: {data.get('total_orders')}",
                    f"  Total reservations: {data.get('total_reservations')}",
                    f"  Total payments: {data.get('total_payments')}",
                    f"  Revenue today: £{data.get('revenue_today')}",
                    f"  Active failures: {data.get('active_failures')}",
                    f"  Order statuses: {data.get('order_statuses')}",
                    f"  Payment statuses: {data.get('payment_statuses')}",
                ]
                return "\n".join(lines)

            elif action == "metrics":
                resp = httpx.get(f"{base_url}/metrics", timeout=5)
                resp.raise_for_status()
                # Extract only restaurant-specific and request metrics
                relevant_prefixes = (
                    "restaurant_",
                    "http_requests_total",
                )
                lines = ["Live Prometheus metrics from restaurant app:"]
                for line in resp.text.split("\n"):
                    if line.startswith("#") or not line.strip():
                        continue
                    if any(line.startswith(p) for p in relevant_prefixes):
                        lines.append(f"  {line.strip()}")
                return "\n".join(lines[:40])

            else:
                return (
                    "Invalid action. Valid options: "
                    "'failures', 'metrics', 'health', 'stats'"
                )

        except httpx.ConnectError:
            return (
                f"Cannot connect to restaurant app at {base_url}. "
                "The service may be down or the URL may be incorrect."
            )
        except Exception as e:
            return f"Restaurant monitor error: {str(e)}"

    async def _arun(self, action: str) -> str:
        return self._run(action)
