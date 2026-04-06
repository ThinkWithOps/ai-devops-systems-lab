from typing import Type
from langchain.tools import BaseTool
from pydantic import BaseModel, Field

from app.services.vector_service import VectorService
from app.services.log_service import LogService


class LogSearchInput(BaseModel):
    query: str = Field(description="Search query to find relevant log entries")


class LogSearchTool(BaseTool):
    name: str = "log_search"
    description: str = (
        "Search application and infrastructure logs for errors, patterns, and anomalies. "
        "Input: search query string describing what to look for in logs."
    )
    args_schema: Type[BaseModel] = LogSearchInput

    def _run(self, query: str) -> str:
        vector_svc = VectorService()
        log_svc = LogService()

        results = []

        # Try vector search first
        try:
            vector_results = vector_svc.search_logs(query, n_results=5)
            for r in vector_results:
                meta = r.get("metadata", {})
                results.append({
                    "timestamp": meta.get("timestamp", ""),
                    "severity": meta.get("severity", "INFO"),
                    "service": meta.get("service", "unknown"),
                    "message": meta.get("message", r.get("document", "")),
                    "source": "vector",
                })
        except Exception:
            pass

        # Also search in-memory logs
        mem_results = log_svc.search_logs(query)[:5]
        for r in mem_results:
            results.append({**r, "source": "memory"})

        if not results:
            return f"No log entries found matching query: '{query}'"

        lines = [f"Found {len(results)} log entries for query '{query}':"]
        for entry in results[:10]:
            severity = entry.get("severity", "INFO")
            service = entry.get("service", "unknown")
            timestamp = entry.get("timestamp", "")
            message = entry.get("message", "")
            lines.append(f"  [{severity}] {timestamp} {service}: {message}")

        return "\n".join(lines)

    async def _arun(self, query: str) -> str:
        return self._run(query)
