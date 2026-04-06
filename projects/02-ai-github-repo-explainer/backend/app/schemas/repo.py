from pydantic import BaseModel
from typing import Optional


class IngestRequest(BaseModel):
    repo_url: str


class RepoInfo(BaseModel):
    name: str
    owner: str
    description: Optional[str] = None
    stars: int = 0
    forks: int = 0
    language: Optional[str] = None
    file_count: int = 0
    indexed_at: Optional[str] = None
    topics: list[str] = []


class FileTreeItem(BaseModel):
    path: str
    type: str  # "blob" | "tree"
    size: Optional[int] = None
