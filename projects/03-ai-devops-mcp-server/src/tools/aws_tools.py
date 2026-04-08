"""
AWS Tools
=========
Wraps boto3 calls for Cost Explorer, EC2, CloudWatch, and S3.
All tools fall back to mock data when AWS credentials are unavailable or
when KUBE_MOCK_MODE=true is set (the single env var controls all mock modes).

Prerequisites:
    AWS CLI configured  (aws configure)  OR
    Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION
"""

import os
from datetime import datetime, timedelta, timezone
from utils.helpers import mock_mode, format_table, truncate

# ── optional import ──────────────────────────────────────────────────────────

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError

    def _make_client(service: str):
        region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
        return boto3.client(service, region_name=region)

    AWS_AVAILABLE = True
except ImportError:
    AWS_AVAILABLE = False


# ── mock data ─────────────────────────────────────────────────────────────────

def _mock_aws_cost(days: int) -> str:
    return f"""[MOCK MODE] AWS Cost Report — last {days} days

Total:  $247.83

Breakdown by service:
  EC2                  $148.20  (59.8%)
  RDS                   $52.40  (21.1%)
  S3                    $18.75  ( 7.6%)
  CloudFront            $14.30  ( 5.8%)
  Lambda                 $8.10  ( 3.3%)
  Other                  $6.08  ( 2.5%)

Forecast (next 30 days):  ~$260.00
Highest cost day: 2024-01-10  ($12.40)
"""


def _mock_ec2_instances() -> str:
    rows = [
        ["i-0abc123", "web-server-01", "t3.medium", "running", "52.10.20.1"],
        ["i-0def456", "api-server-02", "t3.large", "running", "52.10.20.2"],
        ["i-0ghi789", "worker-node-01", "c5.xlarge", "running", "—"],
        ["i-0jkl012", "staging-env", "t3.small", "stopped", "—"],
        ["i-0mno345", "old-bastion", "t2.micro", "stopped", "—"],
    ]
    header = ["INSTANCE ID", "NAME", "TYPE", "STATE", "PUBLIC IP"]
    return "[MOCK MODE] EC2 Instances:\n\n" + format_table(header, rows)


def _mock_cloudwatch_alarms() -> str:
    rows = [
        ["High-CPU-web-server-01", "ALARM", "CPUUtilization > 80", "3 min ago"],
        ["RDS-FreeStorage-Low", "ALARM", "FreeStorageSpace < 10GB", "1 hr ago"],
        ["Lambda-Error-Rate", "INSUFFICIENT_DATA", "Errors > 10", "15 min ago"],
    ]
    header = ["ALARM NAME", "STATE", "CONDITION", "SINCE"]
    return (
        "[MOCK MODE] Active CloudWatch Alarms (3 found):\n\n"
        + format_table(header, rows)
        + "\n\n2 alarms need immediate attention."
    )


def _mock_s3_buckets() -> str:
    rows = [
        ["my-app-assets", "2023-03-01", "4.2 GB", "us-east-1"],
        ["my-app-backups", "2023-03-01", "18.7 GB", "us-east-1"],
        ["terraform-state-prod", "2023-01-15", "12 KB", "us-east-1"],
        ["logs-archive-2024", "2024-01-01", "52.1 GB", "us-east-1"],
    ]
    header = ["BUCKET NAME", "CREATED", "SIZE", "REGION"]
    return "[MOCK MODE] S3 Buckets:\n\n" + format_table(header, rows)


# ── real implementations ──────────────────────────────────────────────────────

def get_aws_cost(days: int = 30) -> str:
    """Return a cost breakdown by AWS service for the last *days* days."""
    if mock_mode() or not AWS_AVAILABLE:
        return _mock_aws_cost(days)

    try:
        ce = _make_client("ce")
        end = datetime.now(timezone.utc).date()
        start = (end - timedelta(days=days))

        response = ce.get_cost_and_usage(
            TimePeriod={"Start": str(start), "End": str(end)},
            Granularity="MONTHLY",
            Metrics=["UnblendedCost"],
            GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
        )

        total = 0.0
        service_costs: list[tuple[str, float]] = []

        for period in response.get("ResultsByTime", []):
            for group in period.get("Groups", []):
                service = group["Keys"][0]
                amount = float(group["Metrics"]["UnblendedCost"]["Amount"])
                if amount > 0.01:
                    service_costs.append((service, amount))
                    total += amount

        service_costs.sort(key=lambda x: x[1], reverse=True)

        rows = [
            [truncate(svc, 40), f"${amt:.2f}", f"({amt/total*100:.1f}%)"]
            for svc, amt in service_costs
        ]
        header = ["SERVICE", "COST", "%"]
        table = format_table(header, rows)

        return (
            f"AWS Cost Report — last {days} days ({start} → {end})\n\n"
            f"Total: ${total:.2f}\n\n"
            f"Breakdown:\n{table}"
        )

    except NoCredentialsError:
        return "[AWS Error] No credentials found. Run 'aws configure' or set AWS_* env vars."
    except (BotoCoreError, ClientError) as exc:
        return f"[AWS Error] {exc}"
    except Exception as exc:
        return f"[Error] {exc}"


def list_ec2_instances() -> str:
    """List all EC2 instances with ID, name tag, type, state, and public IP."""
    if mock_mode() or not AWS_AVAILABLE:
        return _mock_ec2_instances()

    try:
        ec2 = _make_client("ec2")
        response = ec2.describe_instances()

        rows = []
        for reservation in response["Reservations"]:
            for inst in reservation["Instances"]:
                instance_id = inst["InstanceId"]
                name = next(
                    (t["Value"] for t in inst.get("Tags", []) if t["Key"] == "Name"),
                    "—",
                )
                itype = inst["InstanceType"]
                state = inst["State"]["Name"]
                public_ip = inst.get("PublicIpAddress", "—")
                rows.append([instance_id, name, itype, state, public_ip])

        if not rows:
            return "No EC2 instances found in this region."

        rows.sort(key=lambda r: r[3])  # sort by state
        header = ["INSTANCE ID", "NAME", "TYPE", "STATE", "PUBLIC IP"]
        return f"EC2 Instances ({len(rows)} total):\n\n" + format_table(header, rows)

    except NoCredentialsError:
        return "[AWS Error] No credentials found."
    except (BotoCoreError, ClientError) as exc:
        return f"[AWS Error] {exc}"
    except Exception as exc:
        return f"[Error] {exc}"


def get_cloudwatch_alarms() -> str:
    """Return all CloudWatch alarms that are in ALARM or INSUFFICIENT_DATA state."""
    if mock_mode() or not AWS_AVAILABLE:
        return _mock_cloudwatch_alarms()

    try:
        cw = _make_client("cloudwatch")
        response = cw.describe_alarms(
            StateValue="ALARM",
        )
        alarms = response.get("MetricAlarms", [])

        # also fetch INSUFFICIENT_DATA
        resp2 = cw.describe_alarms(StateValue="INSUFFICIENT_DATA")
        alarms += resp2.get("MetricAlarms", [])

        if not alarms:
            return "No active CloudWatch alarms. All systems nominal."

        rows = []
        for alarm in alarms:
            name = alarm["AlarmName"]
            state = alarm["StateValue"]
            metric = alarm.get("MetricName", "—")
            updated = alarm.get("StateUpdatedTimestamp", "")
            if updated:
                updated = updated.strftime("%Y-%m-%d %H:%M UTC")
            rows.append([truncate(name, 40), state, metric, updated])

        header = ["ALARM NAME", "STATE", "METRIC", "LAST UPDATED"]
        return (
            f"Active CloudWatch Alarms ({len(alarms)} found):\n\n"
            + format_table(header, rows)
        )

    except NoCredentialsError:
        return "[AWS Error] No credentials found."
    except (BotoCoreError, ClientError) as exc:
        return f"[AWS Error] {exc}"
    except Exception as exc:
        return f"[Error] {exc}"


def list_s3_buckets() -> str:
    """List all S3 buckets. Size is fetched from CloudWatch metrics (may be 1-day delayed)."""
    if mock_mode() or not AWS_AVAILABLE:
        return _mock_s3_buckets()

    try:
        s3 = _make_client("s3")
        response = s3.list_buckets()
        buckets = response.get("Buckets", [])

        if not buckets:
            return "No S3 buckets found in this account."

        rows = []
        for bucket in buckets:
            name = bucket["Name"]
            created = bucket["CreationDate"].strftime("%Y-%m-%d")
            # try to get bucket location
            try:
                loc_resp = s3.get_bucket_location(Bucket=name)
                region = loc_resp.get("LocationConstraint") or "us-east-1"
            except Exception:
                region = "unknown"
            rows.append([name, created, region])

        header = ["BUCKET NAME", "CREATED", "REGION"]
        return (
            f"S3 Buckets ({len(buckets)} total):\n\n"
            + format_table(header, rows)
            + "\n\nNote: Bucket sizes are not fetched in real-time (CloudWatch metrics have 24h delay)."
        )

    except NoCredentialsError:
        return "[AWS Error] No credentials found."
    except (BotoCoreError, ClientError) as exc:
        return f"[AWS Error] {exc}"
    except Exception as exc:
        return f"[Error] {exc}"
