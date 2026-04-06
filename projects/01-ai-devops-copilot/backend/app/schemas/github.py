from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class Repository(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    private: bool = False
    html_url: str
    language: Optional[str] = None
    stargazers_count: int = 0
    forks_count: int = 0
    open_issues_count: int = 0
    default_branch: str = "main"
    updated_at: str


class WorkflowRun(BaseModel):
    id: int
    name: str
    head_branch: str
    head_sha: str
    status: str  # queued | in_progress | completed
    conclusion: Optional[str] = None  # success | failure | cancelled | skipped
    workflow_id: int
    run_number: int
    event: str
    created_at: str
    updated_at: str
    html_url: str
    duration_seconds: Optional[int] = None


class PullRequest(BaseModel):
    id: int
    number: int
    title: str
    state: str  # open | closed | merged
    user: str
    body: Optional[str] = None
    head_branch: str
    base_branch: str
    created_at: str
    updated_at: str
    html_url: str
    draft: bool = False
    mergeable: Optional[bool] = None
    reviews_count: int = 0
    commits_count: int = 0


class GitHubIssue(BaseModel):
    id: int
    number: int
    title: str
    state: str  # open | closed
    user: str
    body: Optional[str] = None
    labels: list[str] = []
    assignees: list[str] = []
    created_at: str
    updated_at: str
    html_url: str
    comments: int = 0
