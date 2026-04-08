"""
Kubernetes Tools
================
All tools interact with the cluster via the official kubernetes Python client.
If kubectl / kubeconfig is not available the tools fall back to mock data so
Claude Desktop can still demonstrate a realistic conversation.

Set KUBE_MOCK_MODE=true to force mock mode regardless of cluster availability.
"""

import os
from datetime import datetime, timezone
from utils.helpers import mock_mode, format_table, truncate

# ── optional import ──────────────────────────────────────────────────────────

try:
    from kubernetes import client, config as kube_config
    from kubernetes.client.rest import ApiException

    def _load_kube_config() -> bool:
        """Try in-cluster config first, then local kubeconfig."""
        try:
            kube_config.load_incluster_config()
            return True
        except Exception:
            pass
        try:
            kube_config.load_kube_config()
            return True
        except Exception:
            return False

    KUBE_AVAILABLE = _load_kube_config()
except ImportError:
    KUBE_AVAILABLE = False


# ── helpers ──────────────────────────────────────────────────────────────────

def _age(start_time) -> str:
    """Return a human-readable age string from a datetime."""
    if start_time is None:
        return "unknown"
    now = datetime.now(timezone.utc)
    delta = now - start_time
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m"
    if seconds < 86400:
        return f"{seconds // 3600}h"
    return f"{seconds // 86400}d"


def _pod_phase_emoji(phase: str) -> str:
    return {
        "Running": "✅",
        "Succeeded": "✔️",
        "Pending": "⏳",
        "Failed": "❌",
        "Unknown": "❓",
        "CrashLoopBackOff": "🔄❌",
    }.get(phase, "❓")


# ── mock data ─────────────────────────────────────────────────────────────────

def _mock_pod_list(namespace: str) -> str:
    rows = [
        ["nginx-deployment-abc12", "Running", "1/1", "0", "2d"],
        ["nginx-deployment-def34", "CrashLoopBackOff", "0/1", "14", "2d"],
        ["api-server-xyz99", "Running", "1/1", "0", "5h"],
        ["redis-master-001", "Running", "1/1", "0", "7d"],
        ["worker-job-aaa", "Failed", "0/1", "3", "1h"],
    ]
    header = ["NAME", "STATUS", "READY", "RESTARTS", "AGE"]
    return (
        f"[MOCK MODE] Pods in namespace '{namespace}':\n\n"
        + format_table(header, rows)
        + "\n\n2 pods require attention (CrashLoopBackOff, Failed)."
    )


def _mock_failing_pods(namespace: str) -> str:
    rows = [
        ["nginx-deployment-def34", "CrashLoopBackOff", "0/1", "14", "2d",
         "Back-off restarting failed container"],
        ["worker-job-aaa", "Failed", "0/1", "3", "1h",
         "OOMKilled — container exceeded memory limit"],
    ]
    header = ["NAME", "STATUS", "READY", "RESTARTS", "AGE", "REASON"]
    return (
        f"[MOCK MODE] Failing pods in namespace '{namespace}':\n\n"
        + format_table(header, rows)
    )


def _mock_restart(name: str, namespace: str) -> str:
    return (
        f"[MOCK MODE] Rolling restart triggered for deployment '{name}' "
        f"in namespace '{namespace}'.\n"
        "New pods are being scheduled. Run get_pod_status to monitor progress."
    )


def _mock_pod_logs(pod_name: str, lines: int) -> str:
    sample = [
        "2024-01-15 10:23:01 INFO  Starting application...",
        "2024-01-15 10:23:02 INFO  Connected to database",
        "2024-01-15 10:23:03 ERROR Cannot allocate memory: killed",
        "2024-01-15 10:23:03 FATAL OOMKilled — container restart imminent",
    ]
    return (
        f"[MOCK MODE] Last {lines} lines from pod '{pod_name}':\n\n"
        + "\n".join(sample[-lines:])
    )


def _mock_describe_pod(pod_name: str, namespace: str) -> str:
    return f"""[MOCK MODE] Pod description for '{pod_name}' in '{namespace}':

Name:         {pod_name}
Namespace:    {namespace}
Node:         node-1/10.0.1.5
Status:       CrashLoopBackOff
IP:           172.17.0.8
Image:        nginx:1.21

Conditions:
  Initialized       True
  Ready             False
  ContainersReady   False

Events:
  Warning  BackOff  2m   kubelet  Back-off restarting failed container
  Normal   Pulled   3m   kubelet  Container image already present
  Warning  Failed   3m   kubelet  Error: OOMKilled
"""


# ── real implementations ──────────────────────────────────────────────────────

def get_pod_status(namespace: str = "default") -> str:
    """List all pods in *namespace* with their phase, readiness, restarts, and age."""
    if mock_mode() or not KUBE_AVAILABLE:
        return _mock_pod_list(namespace)

    try:
        v1 = client.CoreV1Api()
        pods = v1.list_namespaced_pod(namespace)
        if not pods.items:
            return f"No pods found in namespace '{namespace}'."

        rows = []
        for pod in pods.items:
            phase = pod.status.phase or "Unknown"
            # check for CrashLoopBackOff in container statuses
            if pod.status.container_statuses:
                for cs in pod.status.container_statuses:
                    if cs.state and cs.state.waiting:
                        reason = cs.state.waiting.reason or ""
                        if reason in ("CrashLoopBackOff", "Error", "OOMKilled"):
                            phase = reason
            total = len(pod.spec.containers)
            ready = sum(
                1
                for cs in (pod.status.container_statuses or [])
                if cs.ready
            )
            restarts = sum(
                cs.restart_count for cs in (pod.status.container_statuses or [])
            )
            age = _age(pod.metadata.creation_timestamp)
            rows.append([
                pod.metadata.name,
                f"{_pod_phase_emoji(phase)} {phase}",
                f"{ready}/{total}",
                str(restarts),
                age,
            ])

        header = ["NAME", "STATUS", "READY", "RESTARTS", "AGE"]
        return f"Pods in namespace '{namespace}':\n\n" + format_table(header, rows)

    except ApiException as exc:
        return f"[K8s API Error] {exc.status}: {exc.reason}"
    except Exception as exc:
        return f"[Error] {exc}"


def get_failing_pods(namespace: str = "default") -> str:
    """List only pods that are not in Running or Succeeded phase."""
    if mock_mode() or not KUBE_AVAILABLE:
        return _mock_failing_pods(namespace)

    try:
        v1 = client.CoreV1Api()
        pods = v1.list_namespaced_pod(namespace)
        bad_states = {"Failed", "Unknown", "CrashLoopBackOff", "Error", "OOMKilled"}

        failing = []
        for pod in pods.items:
            phase = pod.status.phase or "Unknown"
            reason = ""
            if pod.status.container_statuses:
                for cs in pod.status.container_statuses:
                    if cs.state and cs.state.waiting:
                        r = cs.state.waiting.reason or ""
                        if r in bad_states:
                            phase = r
                            reason = cs.state.waiting.message or r
                    if cs.state and cs.state.terminated:
                        r = cs.state.terminated.reason or ""
                        if r in bad_states:
                            phase = r
                            reason = cs.state.terminated.message or r

            if phase not in ("Running", "Succeeded", "Pending"):
                restarts = sum(
                    cs.restart_count for cs in (pod.status.container_statuses or [])
                )
                age = _age(pod.metadata.creation_timestamp)
                failing.append([
                    pod.metadata.name,
                    phase,
                    str(restarts),
                    age,
                    truncate(reason, 60),
                ])

        if not failing:
            return f"All pods in namespace '{namespace}' are healthy."

        header = ["NAME", "STATUS", "RESTARTS", "AGE", "REASON"]
        return (
            f"Failing pods in namespace '{namespace}' ({len(failing)} found):\n\n"
            + format_table(header, failing)
        )

    except ApiException as exc:
        return f"[K8s API Error] {exc.status}: {exc.reason}"
    except Exception as exc:
        return f"[Error] {exc}"


def restart_deployment(name: str, namespace: str = "default") -> str:
    """Trigger a rolling restart of deployment *name* by patching its template annotation."""
    if mock_mode() or not KUBE_AVAILABLE:
        return _mock_restart(name, namespace)

    try:
        apps_v1 = client.AppsV1Api()
        now = datetime.now(timezone.utc).isoformat()
        patch = {
            "spec": {
                "template": {
                    "metadata": {
                        "annotations": {"kubectl.kubernetes.io/restartedAt": now}
                    }
                }
            }
        }
        apps_v1.patch_namespaced_deployment(name, namespace, patch)
        return (
            f"Rolling restart triggered for deployment '{name}' in namespace '{namespace}'.\n"
            f"Restart timestamp: {now}\n"
            "Use get_pod_status to monitor the rollout progress."
        )
    except ApiException as exc:
        return f"[K8s API Error] {exc.status}: {exc.reason}"
    except Exception as exc:
        return f"[Error] {exc}"


def get_pod_logs(pod_name: str, namespace: str = "default", lines: int = 50) -> str:
    """Fetch the last *lines* log lines from pod *pod_name*."""
    if mock_mode() or not KUBE_AVAILABLE:
        return _mock_pod_logs(pod_name, lines)

    try:
        v1 = client.CoreV1Api()
        log = v1.read_namespaced_pod_log(
            pod_name, namespace, tail_lines=lines, timestamps=True
        )
        if not log.strip():
            return f"No logs available for pod '{pod_name}'."
        return f"Last {lines} lines from pod '{pod_name}':\n\n{log}"
    except ApiException as exc:
        return f"[K8s API Error] {exc.status}: {exc.reason}"
    except Exception as exc:
        return f"[Error] {exc}"


def describe_pod(pod_name: str, namespace: str = "default") -> str:
    """Return a human-readable description of pod *pod_name* including events."""
    if mock_mode() or not KUBE_AVAILABLE:
        return _mock_describe_pod(pod_name, namespace)

    try:
        v1 = client.CoreV1Api()
        pod = v1.read_namespaced_pod(pod_name, namespace)
        events_resp = v1.list_namespaced_event(
            namespace, field_selector=f"involvedObject.name={pod_name}"
        )

        lines = [
            f"Name:         {pod.metadata.name}",
            f"Namespace:    {pod.metadata.namespace}",
            f"Node:         {pod.spec.node_name}",
            f"Status:       {pod.status.phase}",
            f"IP:           {pod.status.pod_ip}",
        ]

        for c in pod.spec.containers:
            lines.append(f"Image:        {c.image}")

        lines.append("\nConditions:")
        for cond in (pod.status.conditions or []):
            lines.append(f"  {cond.type:<20} {cond.status}")

        lines.append("\nRecent Events:")
        for ev in sorted(events_resp.items, key=lambda e: e.last_timestamp or datetime.min.replace(tzinfo=timezone.utc)):
            ts = _age(ev.last_timestamp) if ev.last_timestamp else "?"
            lines.append(f"  {ev.type:<8} {ev.reason:<12} {ts:<6} {ev.message}")

        return "\n".join(lines)

    except ApiException as exc:
        return f"[K8s API Error] {exc.status}: {exc.reason}"
    except Exception as exc:
        return f"[Error] {exc}"
