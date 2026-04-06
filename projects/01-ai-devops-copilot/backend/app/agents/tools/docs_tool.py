from typing import Type
from langchain.tools import BaseTool
from pydantic import BaseModel, Field

from app.services.vector_service import VectorService


FALLBACK_DOCS = {
    "oomkilled": (
        "OOMKilled Troubleshooting: The container exceeded its memory limit. "
        "1. Check current limits: kubectl get pod <name> -o yaml | grep -A4 resources. "
        "2. Review actual usage: kubectl top pod <name>. "
        "3. Increase memory limit in deployment spec. "
        "4. Profile for memory leaks using heap snapshots. "
        "5. Consider horizontal scaling instead of increasing limits."
    ),
    "502": (
        "Nginx 502 Bad Gateway: The upstream server failed to respond. "
        "1. Check upstream service health: curl http://upstream:port/health. "
        "2. Review nginx error logs: tail -f /var/log/nginx/error.log. "
        "3. Verify upstream timeout settings match application response times. "
        "4. Check for connection pool exhaustion on the backend. "
        "5. Review proxy_read_timeout and proxy_connect_timeout values."
    ),
    "cicd": (
        "CI/CD Best Practices: "
        "1. Use caching for dependencies (actions/cache). "
        "2. Run tests in parallel where possible. "
        "3. Separate build/test/deploy stages. "
        "4. Use semantic versioning for releases. "
        "5. Implement blue-green or canary deployment strategies."
    ),
}


class DocsInput(BaseModel):
    query: str = Field(description="Query about a DevOps topic, error, or concept")


class DocsRetrievalTool(BaseTool):
    name: str = "devops_docs"
    description: str = (
        "Retrieve DevOps documentation, runbooks, and troubleshooting guides. "
        "Input: query string about the DevOps topic, error message, or concept to look up."
    )
    args_schema: Type[BaseModel] = DocsInput

    def _run(self, query: str) -> str:
        vector_svc = VectorService()

        try:
            results = vector_svc.search_docs(query, n_results=3)
            if results:
                lines = [f"Found {len(results)} relevant documentation sections for '{query}':"]
                for i, result in enumerate(results, 1):
                    doc_text = result.get("document", "")
                    meta = result.get("metadata", {})
                    source = meta.get("source", f"doc-{i}")
                    score = result.get("score", 0.0)
                    lines.append(f"\n--- Document {i} (source: {source}, relevance: {score:.2f}) ---")
                    lines.append(doc_text[:600])
                return "\n".join(lines)
        except Exception as e:
            pass

        # Fallback to built-in knowledge
        query_lower = query.lower()
        for keyword, doc in FALLBACK_DOCS.items():
            if keyword in query_lower:
                return f"Relevant documentation for '{query}':\n{doc}"

        return (
            f"No specific documentation found for '{query}'. "
            "General DevOps troubleshooting steps: "
            "1. Check service logs for error messages. "
            "2. Verify resource usage (CPU, memory, disk). "
            "3. Review recent deployments and configuration changes. "
            "4. Check network connectivity and DNS resolution. "
            "5. Consult runbooks and post-mortems for similar incidents."
        )

    async def _arun(self, query: str) -> str:
        return self._run(query)
