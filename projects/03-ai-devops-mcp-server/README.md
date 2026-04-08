# AI DevOps MCP Server 🔧🤖

> Control Kubernetes, AWS, Docker, and Terraform with plain English inside Claude Desktop

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-purple.svg)](https://modelcontextprotocol.io)

**YouTube Tutorial:** *(coming soon — [@ThinkWithOps](https://youtube.com/@thinkwithops))*

---

## 📋 Table of Contents

- [Project Description](#project-description)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Demo Infrastructure (EC2 + k3s)](#demo-infrastructure-ec2--k3s)
- [How to Install and Run](#how-to-install-and-run)
- [How to Use](#how-to-use)
- [Project Structure](#project-structure)
- [What This Teaches](#what-this-teaches)
- [Challenges](#challenges)
- [License](#license)
- [Contact](#contact)

---

## Project Description

DevOps engineers waste time switching between `kubectl`, the AWS console, `docker`, and `terraform` — all separate tools, all separate mental contexts. This MCP server connects Claude Desktop directly to your real infrastructure so you can control everything with plain English in a single chat window.

No frontend. No FastAPI. No database. The interface is Claude Desktop itself.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Desktop (client)                     │
│                                                                  │
│   "Give me a health report of my infrastructure"                │
│                          │                                       │
│            MCP Protocol (stdio pipe)                            │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│          src/server.py  (MCP Server — runs on your laptop)      │
│                                                                  │
│   list_tools()  ←──── Claude queries available tools            │
│   call_tool()   ←──── Claude calls a specific tool              │
│                                                                  │
│   ┌────────────────┐  ┌───────────┐  ┌────────┐  ┌──────────┐  │
│   │ kubernetes_    │  │ aws_      │  │docker_ │  │terraform_│  │
│   │ tools.py       │  │ tools.py  │  │tools.py│  │tools.py  │  │
│   └───────┬────────┘  └─────┬─────┘  └───┬────┘  └────┬─────┘  │
└───────────┼─────────────────┼────────────┼────────────┼─────────┘
            │                 │            │            │
            │ reads           │ reads      │ reads      │ reads
            │ ~/.kube/        │ ~/.aws/    │ local      │ directory
            │ mcp-demo-config │ credentials│ Docker     │ path you
            │ (has EC2 IP)    │ (aws cli)  │ daemon     │ provide
            │                 │            │            │
   ┌────────▼──────┐  ┌───────▼──────┐  ┌─▼──────┐  ┌─▼──────────┐
   │  k3s on EC2   │  │  AWS APIs    │  │ Local  │  │ terraform  │
   │  (3.239.84.50)│  │  (real data) │  │ Docker │  │    CLI     │
   └───────────────┘  └──────────────┘  └────────┘  └────────────┘

Claude never connects to AWS or Kubernetes directly.
It only talks to server.py over stdio.
server.py uses your local credentials to reach real infrastructure.

Mock mode (KUBE_MOCK_MODE=true):
  All tools return realistic pre-built sample data.
  No real infrastructure required — works for demos out of the box.
```

---

## Tech Stack

| Technology | Role |
|------------|------|
| MCP SDK (`mcp`) | Protocol — connects Claude Desktop to Python tools |
| Kubernetes Python Client | Read pods, restart deployments, fetch logs |
| boto3 | AWS costs, EC2, CloudWatch alarms, S3 |
| Docker SDK for Python | List and manage containers |
| terraform CLI | Plan and state via subprocess |

---

## Demo Infrastructure (EC2 + k3s)

The `infra/terraform/` folder spins up a single `t3.small` EC2 instance with:

**Kubernetes (k3s):**
- **nginx** deployment — 2 healthy pods
- **broken-app** deployment — intentionally crashes, gives you a real CrashLoopBackOff to demo
- **redis** deployment — healthy background service

**Docker (on the same EC2):**
- **web-server** — nginx container on port 80
- **cache-service** — redis container
- **api-service** — nginx container on port 8080

Docker daemon is exposed on port 2375 so the MCP server can connect remotely.

```bash
cd infra/terraform

cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — set your region and key path

terraform init
terraform apply
```

After ~2 minutes, copy the kubeconfig and set the Docker host:

```bash
# Copy kubeconfig
scp -i ~/.ssh/id_rsa ubuntu@<EC2_IP>:/etc/rancher/k3s/k3s.yaml ~/.kube/mcp-demo-config
sed -i 's/127.0.0.1/<EC2_IP>/g' ~/.kube/mcp-demo-config

# Verify Kubernetes
export KUBECONFIG=~/.kube/mcp-demo-config
kubectl get pods

# Verify Docker (remote)
docker -H tcp://<EC2_IP>:2375 ps
```

Then update your Claude Desktop config with both:
```json
"env": {
  "KUBE_MOCK_MODE": "false",
  "KUBECONFIG": "C:\\Users\\YOUR_USERNAME\\.kube\\mcp-demo-config",
  "DOCKER_HOST": "tcp://<EC2_IP>:2375",
  "AWS_DEFAULT_REGION": "us-east-1"
}
```

> **Cost:** `t3.small` ~$0.023/hr. Run `terraform destroy` when done.

---

## How to Install and Run

### Prerequisites

| Requirement | Why |
|---|---|
| Python 3.11+ | Server runtime |
| [Claude Desktop](https://claude.ai/download) | MCP client |
| `kubectl` + kubeconfig | Kubernetes tools *(optional)* |
| AWS CLI configured | AWS tools *(optional)* — run `aws configure` to set credentials stored at `~/.aws/credentials` |
| Docker running | Docker tools *(optional)* |
| `terraform` on PATH | Terraform tools *(optional)* |

Each tool falls back to mock data gracefully if the service isn't available.

### Steps

```bash
# 1. Navigate to the project
cd projects/03-ai-devops-mcp-server

# 2. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
# Edit .env — set AWS_DEFAULT_REGION, KUBE_MOCK_MODE, etc.

# 5. Run the tests to verify everything works (no real infra needed)
KUBE_MOCK_MODE=true pytest tests/ -v
```

### Connect to Claude Desktop

**Step 1** — Download and install Claude Desktop from [claude.ai/download](https://claude.ai/download)

**Step 2** — Find your config file:

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

**Step 3** — Find your full Python path (run this in terminal):
```bash
where python   # Windows
which python   # Mac/Linux
```

**Step 4** — Add the `mcpServers` block to the config file. Keep any existing content (like `preferences`) and add alongside it:

```json
{
  "preferences": {
    "...existing preferences..."
  },
  "mcpServers": {
    "ai-devops": {
      "command": "C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Programs\\Python\\Python310\\python.exe",
      "args": [
        "D:\\path\\to\\projects\\03-ai-devops-mcp-server\\src\\server.py"
      ],
      "env": {
        "KUBE_MOCK_MODE": "false",
        "AWS_DEFAULT_REGION": "us-east-1",
        "KUBECONFIG": "C:\\Users\\YOUR_USERNAME\\.kube\\mcp-demo-config"
      }
    }
  }
}
```

> **Important:** Use the full Python path from Step 3, not just `python`. Claude Desktop has a limited PATH and may not find `python` otherwise.

**Step 5** — Fully restart Claude Desktop (kill all Claude processes via Task Manager, then reopen)

**Step 6** — The MCP server connects automatically. No hammer icon needed — just open a chat and type your question. Claude will call the tools automatically.

> **To verify it's connected:** Check `%APPDATA%\Claude\logs\mcp-server-ai-devops.log` — you should see `Server started and connected successfully`.

---

## How to Use

Open Claude Desktop and type in plain English. Claude will automatically call the right tools and explain the results.

**Try these demo scenarios:**

- `"Give me a health report of my infrastructure"` — calls K8s, AWS, and Docker simultaneously, returns a unified summary
- `"Which pods are failing right now?"` — filters to only crashed or erroring pods
- `"What did AWS cost me this month?"` — per-service cost breakdown with percentages
- `"Restart the nginx deployment"` — rolling restart, confirms when complete
- `"Are there any active CloudWatch alarms?"` — lists all alarms in ALARM state
- `"Show me the Terraform plan for /opt/infra"` — runs plan, Claude explains each proposed change

---

## Project Structure

```
03-ai-devops-mcp-server/
├── src/
│   ├── server.py                       # MCP entry point — tool registry + dispatcher
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── kubernetes_tools.py         # get_pod_status, get_failing_pods, restart_deployment, get_pod_logs, describe_pod
│   │   ├── aws_tools.py                # get_aws_cost, list_ec2_instances, get_cloudwatch_alarms, list_s3_buckets
│   │   ├── docker_tools.py             # list_containers, get_container_logs, restart_container
│   │   └── terraform_tools.py          # run_terraform_plan, check_terraform_state
│   └── utils/
│       ├── __init__.py
│       └── helpers.py                  # mock_mode(), format_table(), truncate()
├── infra/
│   └── terraform/
│       ├── main.tf                     # EC2 instance + security group
│       ├── variables.tf                # Region, instance type, key path
│       ├── outputs.tf                  # Public IP, SSH command, kubeconfig command
│       ├── user_data.sh.tpl            # Bootstraps k3s + deploys demo apps on EC2
│       └── terraform.tfvars.example    # Copy to terraform.tfvars and fill in
├── config/
│   └── claude_desktop_config.json      # Drop-in MCP config for Claude Desktop
├── tests/
│   └── test_tools.py                   # 22 tests — all run without real infrastructure
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## What This Teaches

| What You Built | Skill |
|---|---|
| MCP server with 14 tools | MCP protocol + tool registration |
| Kubernetes client integration | K8s API automation |
| boto3 Cost Explorer + EC2 + CloudWatch | AWS SDK usage |
| Docker SDK container management | Docker automation |
| Terraform CLI via subprocess | IaC scripting |
| Async dispatch over sync SDKs | Python async patterns |
| Mock mode with realistic sample data | Demo engineering |

---

## Challenges

- **JSON Schema strictness** — missing `"type": "object"` in `inputSchema` causes Claude Desktop to silently skip the tool with no error message
- **Sync SDKs in an async server** — boto3, kubernetes, and docker are all blocking; wrapped each in `asyncio.to_thread()` to avoid stalling the MCP event loop
- **Error handling scope** — catching SDK errors at import time causes the whole server to crash if one service is down; errors must be caught inside each tool call
- **Subprocess path security** — `terraform` accepts a user-supplied directory; added `TERRAFORM_ALLOWED_DIRS` allowlist with `os.path.realpath()` traversal check
- **Use full Python path in Claude Desktop config** — `"command": "python"` fails silently because Claude Desktop has a limited PATH; use the full path e.g. `C:\Users\...\Python310\python.exe`
- **No hammer icon** — newer versions of Claude Desktop don't show a hammer icon; the MCP server connects automatically via config, verify via the log file at `%APPDATA%\Claude\logs\mcp-server-ai-devops.log`
- **t3.micro is too small for k3s** — 1GB RAM causes TLS timeouts and slow API responses; use `t3.small` (2GB) minimum
- **k3s TLS cert missing public IP** — by default k3s only includes the private IP in its cert; must pass `--tls-san <PUBLIC_IP>` during install or kubectl connection fails with x509 error

---

## License

MIT — free to use for learning and personal projects.

---

## Contact

- **YouTube:** [@ThinkWithOps](https://youtube.com/@thinkwithops)
- **LinkedIn:** [b-vijaya](https://www.linkedin.com/in/b-vijaya/)

---

**⭐ Star the repo and subscribe if this helped you!**
