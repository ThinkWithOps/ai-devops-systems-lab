"""
Docker Tools
============
Uses the official Docker SDK for Python to interact with the local Docker daemon.
Falls back to mock data when Docker is not running or the SDK is not installed.

Set KUBE_MOCK_MODE=true to force mock mode.
"""

import os
from utils.helpers import mock_mode, format_table, truncate

# ── optional import ──────────────────────────────────────────────────────────

try:
    import docker
    from docker.errors import DockerException, NotFound, APIError

    def _get_docker_client():
        """
        Connect to Docker daemon.
        Set DOCKER_HOST=tcp://<EC2_IP>:2375 to connect to a remote daemon.
        Leave unset to use the local Docker daemon.
        """
        docker_host = os.getenv("DOCKER_HOST")
        if docker_host:
            return docker.DockerClient(base_url=docker_host)
        return docker.from_env()

    DOCKER_AVAILABLE = True
except ImportError:
    DOCKER_AVAILABLE = False


# ── mock data ─────────────────────────────────────────────────────────────────

def _mock_list_containers() -> str:
    rows = [
        ["nginx-proxy", "nginx:1.25", "Up 2 days", "0.0.0.0:80->80/tcp"],
        ["api-service", "myapp/api:latest", "Up 5 hours", "0.0.0.0:8000->8000/tcp"],
        ["redis-cache", "redis:7-alpine", "Up 7 days", "127.0.0.1:6379->6379/tcp"],
        ["postgres-db", "postgres:15", "Up 7 days", "127.0.0.1:5432->5432/tcp"],
        ["prometheus", "prom/prometheus:latest", "Up 3 days", "0.0.0.0:9090->9090/tcp"],
    ]
    header = ["NAME", "IMAGE", "STATUS", "PORTS"]
    return "[MOCK MODE] Running containers (5):\n\n" + format_table(header, rows)


def _mock_container_logs(container_name: str, lines: int) -> str:
    sample = [
        '2024-01-15 10:20:00 172.18.0.1 - - [15/Jan/2024] "GET /health HTTP/1.1" 200',
        '2024-01-15 10:20:05 172.18.0.1 - - [15/Jan/2024] "POST /api/v1/deploy HTTP/1.1" 202',
        '2024-01-15 10:20:10 ERROR   upstream connect error — retrying',
        '2024-01-15 10:20:15 172.18.0.1 - - [15/Jan/2024] "GET /metrics HTTP/1.1" 200',
    ]
    return (
        f"[MOCK MODE] Last {lines} lines from container '{container_name}':\n\n"
        + "\n".join(sample[-lines:])
    )


def _mock_restart_container(container_name: str) -> str:
    return (
        f"[MOCK MODE] Container '{container_name}' restarted successfully.\n"
        "Container is back up and accepting connections."
    )


# ── real implementations ──────────────────────────────────────────────────────

def list_containers() -> str:
    """List all running Docker containers with name, image, status, and port bindings."""
    if mock_mode() or not DOCKER_AVAILABLE:
        return _mock_list_containers()

    try:
        client = _get_docker_client()
        containers = client.containers.list()

        if not containers:
            return "No running containers found. Is Docker running?"

        rows = []
        for c in containers:
            name = c.name
            image = truncate(c.image.tags[0] if c.image.tags else c.image.short_id, 35)
            status = c.status
            ports = _format_ports(c.ports)
            rows.append([name, image, status, ports])

        header = ["NAME", "IMAGE", "STATUS", "PORTS"]
        return (
            f"Running containers ({len(containers)}):\n\n"
            + format_table(header, rows)
        )

    except DockerException as exc:
        return f"[Docker Error] Cannot connect to Docker daemon: {exc}"
    except Exception as exc:
        return f"[Error] {exc}"


def get_container_logs(container_name: str, lines: int = 50) -> str:
    """Return the last *lines* log lines from container *container_name*."""
    if mock_mode() or not DOCKER_AVAILABLE:
        return _mock_container_logs(container_name, lines)

    try:
        client = _get_docker_client()
        container = client.containers.get(container_name)
        log_bytes = container.logs(tail=lines, timestamps=True)
        log_text = log_bytes.decode("utf-8", errors="replace").strip()

        if not log_text:
            return f"No logs available for container '{container_name}'."
        return f"Last {lines} lines from container '{container_name}':\n\n{log_text}"

    except NotFound:
        return f"[Docker Error] Container '{container_name}' not found."
    except DockerException as exc:
        return f"[Docker Error] {exc}"
    except Exception as exc:
        return f"[Error] {exc}"


def restart_container(container_name: str) -> str:
    """Restart container *container_name* and confirm when it is back up."""
    if mock_mode() or not DOCKER_AVAILABLE:
        return _mock_restart_container(container_name)

    try:
        client = _get_docker_client()
        container = client.containers.get(container_name)
        image = container.image.tags[0] if container.image.tags else "unknown"
        container.restart(timeout=30)
        container.reload()
        return (
            f"Container '{container_name}' restarted successfully.\n"
            f"Image:  {image}\n"
            f"Status: {container.status}"
        )

    except NotFound:
        return f"[Docker Error] Container '{container_name}' not found."
    except APIError as exc:
        return f"[Docker API Error] {exc.explanation}"
    except DockerException as exc:
        return f"[Docker Error] {exc}"
    except Exception as exc:
        return f"[Error] {exc}"


# ── helpers ───────────────────────────────────────────────────────────────────

def _format_ports(ports: dict) -> str:
    """Turn Docker SDK port dict into a human-readable string."""
    if not ports:
        return "—"
    parts = []
    for container_port, host_bindings in ports.items():
        if host_bindings:
            for binding in host_bindings:
                parts.append(f"{binding['HostIp']}:{binding['HostPort']}->{container_port}")
        else:
            parts.append(container_port)
    return ", ".join(parts[:3])  # cap at 3 to avoid super wide rows
