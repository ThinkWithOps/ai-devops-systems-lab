"""
Terraform Tools
===============
Shells out to the `terraform` CLI binary. Both tools require Terraform to be
installed and the target directory to contain a valid .tf configuration.

Falls back to mock output when:
  - KUBE_MOCK_MODE=true
  - `terraform` binary is not found on PATH
  - The specified directory does not exist

Security note:
  The `directory` argument is validated against an allowlist if
  TERRAFORM_ALLOWED_DIRS is set in the environment (comma-separated paths).
  This prevents traversal attacks when the server is exposed over a network.
"""

import os
import shutil
import subprocess
from utils.helpers import mock_mode, truncate

# ── security allowlist ────────────────────────────────────────────────────────

def _allowed_dir(directory: str) -> bool:
    """Return True if the directory is allowed by the allowlist (or no list set)."""
    allowlist_raw = os.getenv("TERRAFORM_ALLOWED_DIRS", "")
    if not allowlist_raw.strip():
        return True  # no restriction configured
    allowed = [p.strip() for p in allowlist_raw.split(",") if p.strip()]
    directory = os.path.realpath(directory)
    return any(directory.startswith(os.path.realpath(p)) for p in allowed)


# ── helpers ───────────────────────────────────────────────────────────────────

def _terraform_available() -> bool:
    return shutil.which("terraform") is not None


def _run(args: list[str], cwd: str, timeout: int = 120) -> tuple[int, str, str]:
    """Run a subprocess and return (returncode, stdout, stderr)."""
    result = subprocess.run(
        args,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=timeout,
        env={**os.environ, "TF_IN_AUTOMATION": "1"},
    )
    return result.returncode, result.stdout, result.stderr


# ── mock data ─────────────────────────────────────────────────────────────────

def _mock_plan(directory: str) -> str:
    return f"""[MOCK MODE] Terraform plan for: {directory}

Refreshing state...

Terraform will perform the following actions:

  # aws_instance.web_server will be updated in-place
  ~ resource "aws_instance" "web_server" {{
      ~ instance_type = "t3.small" -> "t3.medium"
        id            = "i-0abc123def456"
    }}

  # aws_s3_bucket.backups will be created
  + resource "aws_s3_bucket" "backups" {{
      + bucket = "my-app-backups-prod"
      + region = "us-east-1"
    }}

Plan: 1 to add, 1 to change, 0 to destroy.

No infrastructure will be destroyed.
"""


def _mock_state(directory: str) -> str:
    return f"""[MOCK MODE] Terraform state summary for: {directory}

Tracked resources (8 total):

  aws_instance.web_server          i-0abc123def456      running
  aws_instance.api_server          i-0def456ghi789      running
  aws_db_instance.postgres         mydb.abc.rds          available
  aws_s3_bucket.assets             my-app-assets         exists
  aws_security_group.web_sg        sg-0abc123            active
  aws_vpc.main                     vpc-0def456           available
  aws_subnet.public_a              subnet-0abc           available
  aws_subnet.public_b              subnet-0def           available

State last modified: 2024-01-15 09:30 UTC
Backend: S3 (s3://terraform-state-prod/prod/terraform.tfstate)
"""


# ── real implementations ──────────────────────────────────────────────────────

def run_terraform_plan(directory: str) -> str:
    """
    Run `terraform plan` in *directory* and return the plan output.

    The plan is read-only — it will NOT apply any changes.
    """
    if mock_mode():
        return _mock_plan(directory)

    if not _allowed_dir(directory):
        return f"[Security Error] Directory '{directory}' is not in the allowed list (TERRAFORM_ALLOWED_DIRS)."

    if not os.path.isdir(directory):
        return f"[Error] Directory not found: {directory}"

    if not _terraform_available():
        return _mock_plan(directory).replace("[MOCK MODE]", "[MOCK — terraform not found]")

    tf_files = [f for f in os.listdir(directory) if f.endswith(".tf")]
    if not tf_files:
        return f"[Error] No .tf files found in '{directory}'. Is this a Terraform project?"

    try:
        # init first (idempotent)
        rc, stdout, stderr = _run(["terraform", "init", "-input=false"], directory, timeout=60)
        if rc != 0:
            return f"[Terraform Error] 'terraform init' failed:\n{stderr}"

        rc, stdout, stderr = _run(
            ["terraform", "plan", "-input=false", "-no-color"], directory, timeout=120
        )

        output = stdout or stderr
        if rc not in (0, 2):  # 0 = no changes, 2 = changes present
            return f"[Terraform Error] Plan failed (exit {rc}):\n{truncate(stderr, 2000)}"

        return f"Terraform plan for: {directory}\n\n{truncate(output, 4000)}"

    except subprocess.TimeoutExpired:
        return "[Error] Terraform plan timed out after 120 seconds."
    except Exception as exc:
        return f"[Error] {exc}"


def check_terraform_state(directory: str) -> str:
    """
    Run `terraform state list` in *directory* and return a summary of all
    tracked resources.
    """
    if mock_mode():
        return _mock_state(directory)

    if not _allowed_dir(directory):
        return f"[Security Error] Directory '{directory}' is not in the allowed list (TERRAFORM_ALLOWED_DIRS)."

    if not os.path.isdir(directory):
        return f"[Error] Directory not found: {directory}"

    if not _terraform_available():
        return _mock_state(directory).replace("[MOCK MODE]", "[MOCK — terraform not found]")

    try:
        rc, stdout, stderr = _run(
            ["terraform", "state", "list"], directory, timeout=30
        )

        if rc != 0:
            return f"[Terraform Error] 'terraform state list' failed:\n{stderr}"

        resources = [line.strip() for line in stdout.splitlines() if line.strip()]
        if not resources:
            return "Terraform state is empty — no resources tracked."

        lines = [
            f"Terraform state summary for: {directory}",
            f"Tracked resources ({len(resources)}):\n",
        ]
        for res in resources:
            lines.append(f"  {res}")

        return "\n".join(lines)

    except subprocess.TimeoutExpired:
        return "[Error] Terraform state list timed out."
    except Exception as exc:
        return f"[Error] {exc}"
