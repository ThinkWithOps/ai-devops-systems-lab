import logging
from typing import Optional, Type

from langchain.tools import BaseTool
from pydantic import BaseModel, Field

from app.services.vector_service import VectorService

logger = logging.getLogger(__name__)


class SearchRepoInput(BaseModel):
    query: str = Field(description="The search query to find relevant code and documentation in the repository")
    repo_name: Optional[str] = Field(
        default=None,
        description="Optional: filter search to a specific repository (format: owner/repo). Leave empty to search all indexed repos."
    )


class SearchRepoTool(BaseTool):
    name: str = "search_repo"
    description: str = (
        "Search the indexed GitHub repository for code, documentation, configuration files, and explanations. "
        "Use this tool to answer ANY question about how the repository works, its structure, implementation details, "
        "dependencies, architecture, entry points, or any specific file/function. "
        "Always use this tool when the user asks about the repository content."
    )
    args_schema: Type[BaseModel] = SearchRepoInput

    def _run(self, query: str, repo_name: Optional[str] = None) -> str:
        """Search ChromaDB for relevant repository content."""
        try:
            vs = VectorService()
            results = vs.search(query, repo_name=repo_name, n_results=5)

            if not results:
                if repo_name:
                    return (
                        f"No results found for query '{query}' in repository '{repo_name}'. "
                        "The repository may not be indexed yet. Ask the user to ingest it first."
                    )
                return f"No results found for query '{query}'. No repositories may be indexed yet."

            output_parts = [f"Found {len(results)} relevant code sections:\n"]
            for i, result in enumerate(results, 1):
                file_path = result.get("file_path", "unknown")
                repo = result.get("repo_name", "unknown")
                score = result.get("relevance_score", 0.0)
                text = result.get("text", "")

                # Truncate very long chunks for readability in context window
                if len(text) > 1500:
                    text = text[:1500] + "\n... [truncated]"

                output_parts.append(
                    f"--- Result {i} ---\n"
                    f"Repository: {repo}\n"
                    f"File: {file_path}\n"
                    f"Relevance: {score:.2f}\n"
                    f"Content:\n{text}\n"
                )

            return "\n".join(output_parts)
        except Exception as e:
            logger.error(f"SearchRepoTool error: {e}")
            return f"Search failed: {str(e)}"

    async def _arun(self, query: str, repo_name: Optional[str] = None) -> str:
        return self._run(query, repo_name=repo_name)
