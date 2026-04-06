import re
from collections import deque
from datetime import datetime, timezone
from typing import Any


SAMPLE_LOGS = [
    {"timestamp": "2024-03-15T10:01:05Z", "severity": "INFO", "service": "nginx", "message": "GET /api/v2/orders 200 45ms - upstream: api-gateway:8000"},
    {"timestamp": "2024-03-15T10:01:12Z", "severity": "WARN", "service": "postgres", "message": "slow query detected: SELECT * FROM orders WHERE user_id=? took 3842ms (threshold: 1000ms)"},
    {"timestamp": "2024-03-15T10:01:20Z", "severity": "ERROR", "service": "api-gateway", "message": "Connection pool exhausted: max_connections=50 reached. Requests queuing."},
    {"timestamp": "2024-03-15T10:01:35Z", "severity": "INFO", "service": "github-actions", "message": "Workflow run #247 started: CI/CD Pipeline on branch main (push event)"},
    {"timestamp": "2024-03-15T10:02:00Z", "severity": "WARN", "service": "k8s-scheduler", "message": "Pod api-gateway-7d8f9-xk2p failed readiness probe: HTTP GET /health returned 503"},
    {"timestamp": "2024-03-15T10:02:15Z", "severity": "ERROR", "service": "redis", "message": "NOAUTH Authentication required. Client attempted command without auth. IP: 10.0.1.45"},
    {"timestamp": "2024-03-15T10:02:30Z", "severity": "INFO", "service": "nginx", "message": "POST /api/v2/auth/login 200 120ms - user authenticated successfully"},
    {"timestamp": "2024-03-15T10:02:45Z", "severity": "ERROR", "service": "nginx", "message": "502 Bad Gateway - upstream api-gateway:8000 failed to respond within 30s timeout"},
    {"timestamp": "2024-03-15T10:03:00Z", "severity": "WARN", "service": "k8s-node", "message": "Node worker-3 memory pressure: used 87% of 16Gi available. Consider scaling."},
    {"timestamp": "2024-03-15T10:03:15Z", "severity": "INFO", "service": "github-actions", "message": "Step 'Run unit tests' completed in 45s - 234 passed, 0 failed"},
    {"timestamp": "2024-03-15T10:03:30Z", "severity": "ERROR", "service": "postgres", "message": "FATAL: remaining connection slots are reserved for non-replication superuser connections"},
    {"timestamp": "2024-03-15T10:03:45Z", "severity": "WARN", "service": "api-gateway", "message": "Rate limit approaching for client IP 203.0.113.42: 950/1000 requests in current window"},
    {"timestamp": "2024-03-15T10:04:00Z", "severity": "INFO", "service": "k8s-deployment", "message": "Rolling update started for deployment api-gateway: 0/3 pods updated"},
    {"timestamp": "2024-03-15T10:04:15Z", "severity": "ERROR", "service": "k8s-pod", "message": "OOMKilled: Container api-gateway exceeded memory limit of 512Mi. Restarting. (restart count: 4)"},
    {"timestamp": "2024-03-15T10:04:30Z", "severity": "WARN", "service": "github-actions", "message": "Step 'Docker build' took 8m32s - consider caching base layers"},
    {"timestamp": "2024-03-15T10:04:45Z", "severity": "INFO", "service": "nginx", "message": "SSL certificate for api.acme-corp.com expires in 14 days. Renewal recommended."},
    {"timestamp": "2024-03-15T10:05:00Z", "severity": "ERROR", "service": "data-pipeline", "message": "Kafka consumer lag exceeds threshold: topic=orders partition=2 lag=45231 (max: 10000)"},
    {"timestamp": "2024-03-15T10:05:15Z", "severity": "INFO", "service": "k8s-deployment", "message": "Deployment api-gateway successfully rolled out: 3/3 pods ready"},
    {"timestamp": "2024-03-15T10:05:30Z", "severity": "WARN", "service": "postgres", "message": "Checkpoint occurring too frequently (every 42s). Consider increasing checkpoint_segments."},
    {"timestamp": "2024-03-15T10:05:45Z", "severity": "ERROR", "service": "api-gateway", "message": "Upstream service user-service unreachable: dial tcp 10.0.2.15:8080: connect: connection refused"},
]


class LogService:
    def __init__(self):
        self._buffer: deque[dict[str, Any]] = deque(maxlen=1000)
        # Pre-populate with sample logs
        for log in SAMPLE_LOGS:
            self._buffer.append(log)

    def get_recent_logs(self, limit: int = 50) -> list[dict[str, Any]]:
        logs = list(self._buffer)
        return logs[-limit:][::-1]  # Most recent first

    def search_logs(self, query: str) -> list[dict[str, Any]]:
        query_lower = query.lower()
        results = []
        for log in reversed(list(self._buffer)):
            message = log.get("message", "").lower()
            service = log.get("service", "").lower()
            severity = log.get("severity", "").lower()
            if (
                query_lower in message
                or query_lower in service
                or query_lower in severity
                or query_lower == "recent"
            ):
                results.append(log)
        return results

    def parse_log_line(self, line: str) -> dict[str, Any]:
        # Try to parse structured log format: [SEVERITY] service: message
        pattern = r"\[(\w+)\]\s+(\S+):\s+(.+)"
        match = re.match(pattern, line)
        if match:
            return {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "severity": match.group(1).upper(),
                "service": match.group(2),
                "message": match.group(3),
            }
        # Fallback: treat entire line as message
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "severity": "INFO",
            "service": "unknown",
            "message": line.strip(),
        }

    def add_log(self, log: dict[str, Any]) -> None:
        self._buffer.append(log)

    def add_raw_line(self, line: str) -> None:
        self._buffer.append(self.parse_log_line(line))
