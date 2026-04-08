"""
Test suite for AI DevOps MCP Server tools.

All tests run in mock mode (KUBE_MOCK_MODE=true) so they work without
real Kubernetes, AWS, or Docker infrastructure.

Run:
    cd projects/03-ai-devops-mcp-server
    pip install -r requirements.txt
    KUBE_MOCK_MODE=true pytest tests/ -v
"""

import os
import sys
import pytest

# make sure src/ is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
os.environ["KUBE_MOCK_MODE"] = "true"

from tools.kubernetes_tools import (
    get_pod_status,
    get_failing_pods,
    restart_deployment,
    get_pod_logs,
    describe_pod,
)
from tools.aws_tools import (
    get_aws_cost,
    list_ec2_instances,
    get_cloudwatch_alarms,
    list_s3_buckets,
)
from tools.docker_tools import (
    list_containers,
    get_container_logs,
    restart_container,
)
from tools.terraform_tools import (
    run_terraform_plan,
    check_terraform_state,
)


# ── Kubernetes ────────────────────────────────────────────────────────────────

class TestKubernetesTools:
    def test_get_pod_status_returns_string(self):
        result = get_pod_status("default")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_get_pod_status_contains_mock_label(self):
        result = get_pod_status("default")
        assert "MOCK" in result or "pod" in result.lower() or "NAME" in result

    def test_get_pod_status_custom_namespace(self):
        result = get_pod_status("kube-system")
        assert "kube-system" in result

    def test_get_failing_pods_returns_failing_pods(self):
        result = get_failing_pods("default")
        assert isinstance(result, str)
        # mock data always has failing pods in default namespace
        assert "CrashLoopBackOff" in result or "Failed" in result

    def test_restart_deployment_returns_confirmation(self):
        result = restart_deployment("nginx", "default")
        assert "nginx" in result
        assert isinstance(result, str)

    def test_get_pod_logs_returns_logs(self):
        result = get_pod_logs("nginx-abc123", "default", 20)
        assert isinstance(result, str)
        assert len(result) > 0

    def test_describe_pod_returns_description(self):
        result = describe_pod("nginx-abc123", "default")
        assert isinstance(result, str)
        assert "nginx-abc123" in result


# ── AWS ───────────────────────────────────────────────────────────────────────

class TestAWSTools:
    def test_get_aws_cost_default_days(self):
        result = get_aws_cost()
        assert "Total" in result or "Cost" in result or "$" in result

    def test_get_aws_cost_custom_days(self):
        result = get_aws_cost(7)
        assert isinstance(result, str)
        assert "7" in result

    def test_list_ec2_instances_returns_table(self):
        result = list_ec2_instances()
        assert isinstance(result, str)
        assert "INSTANCE" in result.upper() or "i-0" in result or "MOCK" in result

    def test_get_cloudwatch_alarms_returns_alarms(self):
        result = get_cloudwatch_alarms()
        assert isinstance(result, str)
        assert "ALARM" in result.upper() or "alarm" in result.lower()

    def test_list_s3_buckets_returns_buckets(self):
        result = list_s3_buckets()
        assert isinstance(result, str)
        assert "bucket" in result.lower() or "s3" in result.lower() or "MOCK" in result


# ── Docker ────────────────────────────────────────────────────────────────────

class TestDockerTools:
    def test_list_containers_returns_table(self):
        result = list_containers()
        assert isinstance(result, str)
        assert len(result) > 0

    def test_list_containers_has_container_info(self):
        result = list_containers()
        assert "nginx" in result or "container" in result.lower() or "NAME" in result

    def test_get_container_logs_returns_logs(self):
        result = get_container_logs("nginx-proxy", 10)
        assert isinstance(result, str)
        assert "nginx-proxy" in result

    def test_restart_container_returns_confirmation(self):
        result = restart_container("nginx-proxy")
        assert isinstance(result, str)
        assert "nginx-proxy" in result
        assert "restart" in result.lower()


# ── Terraform ─────────────────────────────────────────────────────────────────

class TestTerraformTools:
    def test_run_terraform_plan_returns_plan(self):
        result = run_terraform_plan("/some/tf/dir")
        assert isinstance(result, str)
        assert "terraform" in result.lower() or "plan" in result.lower()

    def test_check_terraform_state_returns_summary(self):
        result = check_terraform_state("/some/tf/dir")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_terraform_plan_shows_directory(self):
        result = run_terraform_plan("/infra/production")
        assert "/infra/production" in result


# ── Helpers ───────────────────────────────────────────────────────────────────

class TestHelpers:
    def test_format_table_basic(self):
        from utils.helpers import format_table
        result = format_table(["NAME", "STATUS"], [["pod-1", "Running"], ["pod-2", "Failed"]])
        assert "NAME" in result
        assert "pod-1" in result
        assert "Running" in result

    def test_truncate_long_string(self):
        from utils.helpers import truncate
        result = truncate("a" * 100, 20)
        assert len(result) == 20
        assert result.endswith("…")

    def test_truncate_short_string(self):
        from utils.helpers import truncate
        result = truncate("hello", 20)
        assert result == "hello"

    def test_mock_mode_is_true(self):
        from utils.helpers import mock_mode
        assert mock_mode() is True
