"""
AI DevOps MCP Server
====================
A Model Context Protocol server that gives Claude Desktop direct control
over real DevOps infrastructure — Kubernetes, AWS, Docker, and Terraform.

Usage:
    python src/server.py

Claude Desktop will call this server automatically once configured.
"""

import asyncio
import os
import sys
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

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

# ── Server setup ────────────────────────────────────────────────────────────

app = Server("ai-devops-mcp-server")

# ── Tool registry ────────────────────────────────────────────────────────────

TOOLS: list[Tool] = [
    # Kubernetes
    Tool(
        name="get_pod_status",
        description="List all pods in a Kubernetes namespace with their current status, restarts, and age.",
        inputSchema={
            "type": "object",
            "properties": {
                "namespace": {
                    "type": "string",
                    "description": "Kubernetes namespace (default: 'default')",
                    "default": "default",
                }
            },
        },
    ),
    Tool(
        name="get_failing_pods",
        description="List only the pods that are failing, crashed, or in a bad state in a namespace.",
        inputSchema={
            "type": "object",
            "properties": {
                "namespace": {
                    "type": "string",
                    "description": "Kubernetes namespace (default: 'default')",
                    "default": "default",
                }
            },
        },
    ),
    Tool(
        name="restart_deployment",
        description="Perform a rolling restart of a Kubernetes deployment.",
        inputSchema={
            "type": "object",
            "required": ["name"],
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name of the deployment to restart",
                },
                "namespace": {
                    "type": "string",
                    "description": "Kubernetes namespace (default: 'default')",
                    "default": "default",
                },
            },
        },
    ),
    Tool(
        name="get_pod_logs",
        description="Fetch the most recent log lines from a pod.",
        inputSchema={
            "type": "object",
            "required": ["pod_name"],
            "properties": {
                "pod_name": {"type": "string", "description": "Name of the pod"},
                "namespace": {
                    "type": "string",
                    "description": "Kubernetes namespace (default: 'default')",
                    "default": "default",
                },
                "lines": {
                    "type": "integer",
                    "description": "Number of log lines to return (default: 50)",
                    "default": 50,
                },
            },
        },
    ),
    Tool(
        name="describe_pod",
        description="Get the full description of a Kubernetes pod including events and conditions.",
        inputSchema={
            "type": "object",
            "required": ["pod_name"],
            "properties": {
                "pod_name": {"type": "string", "description": "Name of the pod"},
                "namespace": {
                    "type": "string",
                    "description": "Kubernetes namespace (default: 'default')",
                    "default": "default",
                },
            },
        },
    ),
    # AWS
    Tool(
        name="get_aws_cost",
        description="Fetch the AWS cost report for the last N days broken down by service.",
        inputSchema={
            "type": "object",
            "properties": {
                "days": {
                    "type": "integer",
                    "description": "Number of days to look back (default: 30)",
                    "default": 30,
                }
            },
        },
    ),
    Tool(
        name="list_ec2_instances",
        description="List all EC2 instances with their ID, name, type, state, and public IP.",
        inputSchema={"type": "object", "properties": {}},
    ),
    Tool(
        name="get_cloudwatch_alarms",
        description="List all active CloudWatch alarms — alarms in ALARM or INSUFFICIENT_DATA state.",
        inputSchema={"type": "object", "properties": {}},
    ),
    Tool(
        name="list_s3_buckets",
        description="List all S3 buckets with their creation date and approximate size.",
        inputSchema={"type": "object", "properties": {}},
    ),
    # Docker
    Tool(
        name="list_containers",
        description="List all running Docker containers with their name, image, status, and ports.",
        inputSchema={"type": "object", "properties": {}},
    ),
    Tool(
        name="get_container_logs",
        description="Fetch the most recent log lines from a Docker container.",
        inputSchema={
            "type": "object",
            "required": ["container_name"],
            "properties": {
                "container_name": {
                    "type": "string",
                    "description": "Name or ID of the container",
                },
                "lines": {
                    "type": "integer",
                    "description": "Number of log lines to return (default: 50)",
                    "default": 50,
                },
            },
        },
    ),
    Tool(
        name="restart_container",
        description="Restart a Docker container by name.",
        inputSchema={
            "type": "object",
            "required": ["container_name"],
            "properties": {
                "container_name": {
                    "type": "string",
                    "description": "Name or ID of the container to restart",
                }
            },
        },
    ),
    # Terraform
    Tool(
        name="run_terraform_plan",
        description="Run 'terraform plan' in a directory and return the planned changes.",
        inputSchema={
            "type": "object",
            "required": ["directory"],
            "properties": {
                "directory": {
                    "type": "string",
                    "description": "Absolute path to the Terraform directory",
                }
            },
        },
    ),
    Tool(
        name="check_terraform_state",
        description="Show a summary of all resources tracked in the Terraform state file.",
        inputSchema={
            "type": "object",
            "required": ["directory"],
            "properties": {
                "directory": {
                    "type": "string",
                    "description": "Absolute path to the Terraform directory",
                }
            },
        },
    ),
]

# ── Handler: list tools ──────────────────────────────────────────────────────

@app.list_tools()
async def list_tools() -> list[Tool]:
    return TOOLS

# ── Handler: call tool ───────────────────────────────────────────────────────

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Dispatch incoming tool calls to the correct implementation."""

    try:
        result = await _dispatch(name, arguments)
    except Exception as exc:  # never crash the server
        result = f"[ERROR] Unexpected failure in tool '{name}': {exc}"

    return [TextContent(type="text", text=str(result))]


async def _dispatch(name: str, args: dict) -> str:
    """Route tool name → implementation function."""

    # Kubernetes
    if name == "get_pod_status":
        return await asyncio.to_thread(get_pod_status, args.get("namespace", "default"))
    if name == "get_failing_pods":
        return await asyncio.to_thread(get_failing_pods, args.get("namespace", "default"))
    if name == "restart_deployment":
        return await asyncio.to_thread(
            restart_deployment, args["name"], args.get("namespace", "default")
        )
    if name == "get_pod_logs":
        return await asyncio.to_thread(
            get_pod_logs,
            args["pod_name"],
            args.get("namespace", "default"),
            args.get("lines", 50),
        )
    if name == "describe_pod":
        return await asyncio.to_thread(
            describe_pod, args["pod_name"], args.get("namespace", "default")
        )

    # AWS
    if name == "get_aws_cost":
        return await asyncio.to_thread(get_aws_cost, args.get("days", 30))
    if name == "list_ec2_instances":
        return await asyncio.to_thread(list_ec2_instances)
    if name == "get_cloudwatch_alarms":
        return await asyncio.to_thread(get_cloudwatch_alarms)
    if name == "list_s3_buckets":
        return await asyncio.to_thread(list_s3_buckets)

    # Docker
    if name == "list_containers":
        return await asyncio.to_thread(list_containers)
    if name == "get_container_logs":
        return await asyncio.to_thread(
            get_container_logs, args["container_name"], args.get("lines", 50)
        )
    if name == "restart_container":
        return await asyncio.to_thread(restart_container, args["container_name"])

    # Terraform
    if name == "run_terraform_plan":
        return await asyncio.to_thread(run_terraform_plan, args["directory"])
    if name == "check_terraform_state":
        return await asyncio.to_thread(check_terraform_state, args["directory"])

    return f"[ERROR] Unknown tool: {name}"


# ── Entry point ──────────────────────────────────────────────────────────────

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
