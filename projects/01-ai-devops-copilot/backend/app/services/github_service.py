import httpx
from typing import Any
from app.config import get_settings


MOCK_REPOS = [
    {
        "id": 1001,
        "name": "api-gateway",
        "full_name": "acme-corp/api-gateway",
        "description": "Main API gateway service using Kong and FastAPI",
        "private": False,
        "html_url": "https://github.com/acme-corp/api-gateway",
        "language": "Python",
        "stargazers_count": 42,
        "forks_count": 8,
        "open_issues_count": 5,
        "default_branch": "main",
        "updated_at": "2024-03-15T10:30:00Z",
    },
    {
        "id": 1002,
        "name": "frontend-app",
        "full_name": "acme-corp/frontend-app",
        "description": "React/Next.js customer-facing frontend",
        "private": False,
        "html_url": "https://github.com/acme-corp/frontend-app",
        "language": "TypeScript",
        "stargazers_count": 18,
        "forks_count": 3,
        "open_issues_count": 12,
        "default_branch": "main",
        "updated_at": "2024-03-15T09:15:00Z",
    },
    {
        "id": 1003,
        "name": "data-pipeline",
        "full_name": "acme-corp/data-pipeline",
        "description": "Kafka + Spark data ingestion pipeline",
        "private": True,
        "html_url": "https://github.com/acme-corp/data-pipeline",
        "language": "Python",
        "stargazers_count": 7,
        "forks_count": 1,
        "open_issues_count": 3,
        "default_branch": "main",
        "updated_at": "2024-03-14T18:00:00Z",
    },
    {
        "id": 1004,
        "name": "infra-terraform",
        "full_name": "acme-corp/infra-terraform",
        "description": "Terraform IaC for AWS EKS, RDS, and networking",
        "private": True,
        "html_url": "https://github.com/acme-corp/infra-terraform",
        "language": "HCL",
        "stargazers_count": 3,
        "forks_count": 0,
        "open_issues_count": 1,
        "default_branch": "main",
        "updated_at": "2024-03-13T12:00:00Z",
    },
]

MOCK_WORKFLOW_RUNS = [
    {
        "id": 9001,
        "name": "CI/CD Pipeline",
        "head_branch": "main",
        "head_sha": "a1b2c3d4e5f6",
        "status": "completed",
        "conclusion": "success",
        "workflow_id": 101,
        "run_number": 247,
        "event": "push",
        "created_at": "2024-03-15T10:00:00Z",
        "updated_at": "2024-03-15T10:08:32Z",
        "html_url": "https://github.com/acme-corp/api-gateway/actions/runs/9001",
        "duration_seconds": 512,
    },
    {
        "id": 9002,
        "name": "CI/CD Pipeline",
        "head_branch": "feature/auth-refactor",
        "head_sha": "f6e5d4c3b2a1",
        "status": "completed",
        "conclusion": "failure",
        "workflow_id": 101,
        "run_number": 246,
        "event": "pull_request",
        "created_at": "2024-03-15T08:30:00Z",
        "updated_at": "2024-03-15T08:35:14Z",
        "html_url": "https://github.com/acme-corp/api-gateway/actions/runs/9002",
        "duration_seconds": 314,
    },
    {
        "id": 9003,
        "name": "Deploy to Production",
        "head_branch": "main",
        "head_sha": "b3c4d5e6f7a8",
        "status": "completed",
        "conclusion": "success",
        "workflow_id": 102,
        "run_number": 89,
        "event": "workflow_dispatch",
        "created_at": "2024-03-14T16:00:00Z",
        "updated_at": "2024-03-14T16:12:45Z",
        "html_url": "https://github.com/acme-corp/api-gateway/actions/runs/9003",
        "duration_seconds": 765,
    },
    {
        "id": 9004,
        "name": "Security Scan",
        "head_branch": "main",
        "head_sha": "c4d5e6f7a8b9",
        "status": "completed",
        "conclusion": "cancelled",
        "workflow_id": 103,
        "run_number": 55,
        "event": "schedule",
        "created_at": "2024-03-14T00:00:00Z",
        "updated_at": "2024-03-14T00:03:22Z",
        "html_url": "https://github.com/acme-corp/api-gateway/actions/runs/9004",
        "duration_seconds": 202,
    },
]

MOCK_PRS = [
    {
        "id": 5001,
        "number": 143,
        "title": "feat: add JWT refresh token rotation",
        "state": "open",
        "user": "alice-dev",
        "body": "Implements RFC-compliant refresh token rotation to improve session security.",
        "head_branch": "feature/jwt-refresh",
        "base_branch": "main",
        "created_at": "2024-03-14T09:00:00Z",
        "updated_at": "2024-03-15T10:20:00Z",
        "html_url": "https://github.com/acme-corp/api-gateway/pull/143",
        "draft": False,
        "mergeable": True,
        "reviews_count": 2,
        "commits_count": 4,
    },
    {
        "id": 5002,
        "number": 142,
        "title": "fix: resolve race condition in request queue",
        "state": "open",
        "user": "bob-sre",
        "body": "Fixes the race condition causing intermittent 500s under high load.",
        "head_branch": "fix/queue-race",
        "base_branch": "main",
        "created_at": "2024-03-13T14:30:00Z",
        "updated_at": "2024-03-15T08:00:00Z",
        "html_url": "https://github.com/acme-corp/api-gateway/pull/142",
        "draft": False,
        "mergeable": False,
        "reviews_count": 1,
        "commits_count": 7,
    },
    {
        "id": 5003,
        "number": 141,
        "title": "chore: upgrade dependencies to latest LTS",
        "state": "closed",
        "user": "carol-devops",
        "body": "Bumps all non-breaking dependencies. Python 3.12 compatibility verified.",
        "head_branch": "chore/dep-upgrades",
        "base_branch": "main",
        "created_at": "2024-03-11T11:00:00Z",
        "updated_at": "2024-03-12T15:45:00Z",
        "html_url": "https://github.com/acme-corp/api-gateway/pull/141",
        "draft": False,
        "mergeable": None,
        "reviews_count": 3,
        "commits_count": 2,
    },
]

MOCK_ISSUES = [
    {
        "id": 7001,
        "number": 88,
        "title": "API Gateway OOMKilled in production during peak hours",
        "state": "open",
        "user": "bob-sre",
        "body": "The api-gateway pod is getting OOMKilled every day between 13:00-15:00 UTC. Memory limit is 512Mi.",
        "labels": ["bug", "production", "high-priority"],
        "assignees": ["alice-dev", "bob-sre"],
        "created_at": "2024-03-15T07:00:00Z",
        "updated_at": "2024-03-15T10:15:00Z",
        "html_url": "https://github.com/acme-corp/api-gateway/issues/88",
        "comments": 6,
    },
    {
        "id": 7002,
        "number": 87,
        "title": "Intermittent 502 Bad Gateway errors from nginx upstream",
        "state": "open",
        "user": "carol-devops",
        "body": "Seeing ~0.3% 502 error rate on /api/v2/orders endpoint. Correlates with DB connection spikes.",
        "labels": ["bug", "nginx", "investigation"],
        "assignees": ["carol-devops"],
        "created_at": "2024-03-14T16:30:00Z",
        "updated_at": "2024-03-15T09:00:00Z",
        "html_url": "https://github.com/acme-corp/api-gateway/issues/87",
        "comments": 3,
    },
    {
        "id": 7003,
        "number": 85,
        "title": "Redis connection refused after cluster failover",
        "state": "closed",
        "user": "alice-dev",
        "body": "After the Redis sentinel failover last week, some services weren't updated with new primary address.",
        "labels": ["bug", "redis", "resolved"],
        "assignees": ["alice-dev"],
        "created_at": "2024-03-10T10:00:00Z",
        "updated_at": "2024-03-12T14:00:00Z",
        "html_url": "https://github.com/acme-corp/api-gateway/issues/85",
        "comments": 12,
    },
]


class GitHubService:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.settings.github_token:
            self.headers["Authorization"] = f"Bearer {self.settings.github_token}"

    def _use_mock(self) -> bool:
        return not bool(self.settings.github_token)

    async def get_repos(self) -> list[dict[str, Any]]:
        if self._use_mock():
            return MOCK_REPOS
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.base_url}/user/repos",
                headers=self.headers,
                params={"sort": "updated", "per_page": 30},
            )
            resp.raise_for_status()
            return resp.json()

    async def get_workflow_runs(self, repo: str) -> list[dict[str, Any]]:
        if self._use_mock():
            return MOCK_WORKFLOW_RUNS
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.base_url}/repos/{repo}/actions/runs",
                headers=self.headers,
                params={"per_page": 20},
            )
            resp.raise_for_status()
            return resp.json().get("workflow_runs", [])

    async def get_prs(self, repo: str) -> list[dict[str, Any]]:
        if self._use_mock():
            return MOCK_PRS
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.base_url}/repos/{repo}/pulls",
                headers=self.headers,
                params={"state": "all", "per_page": 20, "sort": "updated"},
            )
            resp.raise_for_status()
            return resp.json()

    async def get_issues(self, repo: str) -> list[dict[str, Any]]:
        if self._use_mock():
            return MOCK_ISSUES
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.base_url}/repos/{repo}/issues",
                headers=self.headers,
                params={"state": "all", "per_page": 20, "sort": "updated"},
            )
            resp.raise_for_status()
            return resp.json()

    async def get_repo_summary(self, repo: str) -> dict[str, Any]:
        if self._use_mock():
            return {
                "repo": MOCK_REPOS[0],
                "recent_runs": MOCK_WORKFLOW_RUNS[:3],
                "open_prs": [p for p in MOCK_PRS if p["state"] == "open"],
                "open_issues": [i for i in MOCK_ISSUES if i["state"] == "open"],
            }
        runs = await self.get_workflow_runs(repo)
        prs = await self.get_prs(repo)
        issues = await self.get_issues(repo)
        return {
            "repo": repo,
            "recent_runs": runs[:5],
            "open_prs": [p for p in prs if p.get("state") == "open"],
            "open_issues": [i for i in issues if i.get("state") == "open"],
        }
