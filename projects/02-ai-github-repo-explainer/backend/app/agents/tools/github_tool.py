import logging
from typing import Type

from langchain.tools import BaseTool
from pydantic import BaseModel, Field

from app.services.github_service import GitHubService

logger = logging.getLogger(__name__)


class GetRepoMetadataInput(BaseModel):
    repo_name: str = Field(
        description="The repository name in 'owner/repo' format, e.g. 'tiangolo/fastapi'"
    )


class GetRepoMetadataTool(BaseTool):
    name: str = "get_repo_metadata"
    description: str = (
        "Fetch live metadata about a GitHub repository: stars, forks, primary language, "
        "description, topics, license, open issues count, and last update date. "
        "Use this tool when the user asks about repository statistics, popularity, "
        "language, or general information about the project."
    )
    args_schema: Type[BaseModel] = GetRepoMetadataInput

    def _run(self, repo_name: str) -> str:
        """Fetch repository metadata from the GitHub REST API."""
        try:
            if "/" not in repo_name:
                return f"Invalid repo_name '{repo_name}'. Expected format: 'owner/repo'"

            owner, repo = repo_name.split("/", 1)
            github = GitHubService()
            meta = github.fetch_repo_metadata(owner, repo)

            topics_str = ", ".join(meta.get("topics", [])) if meta.get("topics") else "none"
            license_str = meta.get("license") or "Not specified"

            return (
                f"Repository: {meta.get('full_name')}\n"
                f"Description: {meta.get('description') or 'No description'}\n"
                f"Primary Language: {meta.get('language', 'Unknown')}\n"
                f"Stars: {meta.get('stars', 0):,}\n"
                f"Forks: {meta.get('forks', 0):,}\n"
                f"Watchers: {meta.get('watchers', 0):,}\n"
                f"Open Issues: {meta.get('open_issues', 0)}\n"
                f"Topics: {topics_str}\n"
                f"License: {license_str}\n"
                f"Default Branch: {meta.get('default_branch', 'main')}\n"
                f"Created: {meta.get('created_at', 'Unknown')}\n"
                f"Last Updated: {meta.get('updated_at', 'Unknown')}\n"
                f"GitHub URL: {meta.get('html_url', '')}\n"
            )
        except ValueError as e:
            return f"Repository not found: {e}"
        except RuntimeError as e:
            return f"GitHub API error: {e}"
        except Exception as e:
            logger.error(f"GetRepoMetadataTool error: {e}")
            return f"Failed to fetch metadata: {str(e)}"

    async def _arun(self, repo_name: str) -> str:
        return self._run(repo_name)
