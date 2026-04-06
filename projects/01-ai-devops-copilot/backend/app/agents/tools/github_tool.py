import asyncio
import json
from typing import Optional, Type
from langchain.tools import BaseTool
from pydantic import BaseModel, Field

from app.services.github_service import GitHubService


class GitHubInput(BaseModel):
    action: str = Field(
        description="Action to perform: 'repos', 'workflows', 'prs', or 'issues'"
    )
    repo: Optional[str] = Field(
        default=None,
        description="Repository in owner/name format, e.g. 'acme-corp/api-gateway'",
    )


class GitHubTool(BaseTool):
    name: str = "github_search"
    description: str = (
        "Search GitHub for repositories, workflow runs, pull requests, and issues. "
        "Input: JSON with 'action' (repos/workflows/prs/issues) and optional 'repo' field."
    )
    args_schema: Type[BaseModel] = GitHubInput

    def _run(self, action: str, repo: Optional[str] = None) -> str:
        svc = GitHubService()
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self._async_run(svc, action, repo))
        finally:
            loop.close()

    async def _async_run(self, svc: GitHubService, action: str, repo: Optional[str]) -> str:
        action = action.strip().lower()
        try:
            if action == "repos":
                repos = await svc.get_repos()
                lines = [f"Found {len(repos)} repositories:"]
                for r in repos[:10]:
                    lines.append(
                        f"  - {r.get('full_name', r.get('name'))}: "
                        f"{r.get('description', 'No description')} "
                        f"[{r.get('language', 'unknown')}] "
                        f"Issues: {r.get('open_issues_count', 0)}"
                    )
                return "\n".join(lines)

            elif action == "workflows" and repo:
                runs = await svc.get_workflow_runs(repo)
                lines = [f"Recent workflow runs for {repo}:"]
                for run in runs[:10]:
                    status = run.get("conclusion") or run.get("status")
                    lines.append(
                        f"  - Run #{run.get('run_number')}: {run.get('name')} "
                        f"[{status}] branch={run.get('head_branch')} "
                        f"event={run.get('event')} at {run.get('created_at')}"
                    )
                return "\n".join(lines)

            elif action == "prs" and repo:
                prs = await svc.get_prs(repo)
                lines = [f"Pull requests for {repo}:"]
                for pr in prs[:10]:
                    lines.append(
                        f"  - PR #{pr.get('number')}: {pr.get('title')} "
                        f"[{pr.get('state')}] by {pr.get('user')} "
                        f"({pr.get('head_branch')} -> {pr.get('base_branch')})"
                    )
                return "\n".join(lines)

            elif action == "issues" and repo:
                issues = await svc.get_issues(repo)
                lines = [f"Issues for {repo}:"]
                for issue in issues[:10]:
                    labels = ", ".join(issue.get("labels", []))
                    lines.append(
                        f"  - Issue #{issue.get('number')}: {issue.get('title')} "
                        f"[{issue.get('state')}] labels={labels} comments={issue.get('comments', 0)}"
                    )
                return "\n".join(lines)

            else:
                return (
                    f"Invalid action '{action}'. Valid actions: repos, workflows, prs, issues. "
                    "For workflows/prs/issues, also provide 'repo' field."
                )
        except Exception as e:
            return f"GitHub API error: {str(e)}"

    async def _arun(self, action: str, repo: Optional[str] = None) -> str:
        svc = GitHubService()
        return await self._async_run(svc, action, repo)
