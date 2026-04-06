from fastapi import APIRouter, Path
from app.services.github_service import GitHubService

router = APIRouter()
_github_service: GitHubService | None = None


def get_github_service() -> GitHubService:
    global _github_service
    if _github_service is None:
        _github_service = GitHubService()
    return _github_service


@router.get("/github/repos")
async def list_repos():
    svc = get_github_service()
    repos = await svc.get_repos()
    return {"repos": repos}


@router.get("/github/workflows/{repo:path}")
async def list_workflows(repo: str):
    svc = get_github_service()
    runs = await svc.get_workflow_runs(repo)
    return {"workflow_runs": runs}


@router.get("/github/prs/{repo:path}")
async def list_prs(repo: str):
    svc = get_github_service()
    prs = await svc.get_prs(repo)
    return {"pull_requests": prs}


@router.get("/github/issues/{repo:path}")
async def list_issues(repo: str):
    svc = get_github_service()
    issues = await svc.get_issues(repo)
    return {"issues": issues}
