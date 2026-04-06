import asyncio
import logging
from typing import AsyncGenerator, Any, Optional

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.callbacks.base import BaseCallbackHandler

from app.config import get_settings
from app.agents.tools.search_tool import SearchRepoTool
from app.agents.tools.github_tool import GetRepoMetadataTool

logger = logging.getLogger(__name__)


def _build_llm(settings):
    """Return Groq LLM if API key is set, otherwise fall back to Ollama."""
    if settings.groq_api_key:
        from langchain_groq import ChatGroq
        return ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            temperature=0.1,
            streaming=True,
        )
    from langchain_ollama import ChatOllama
    return ChatOllama(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=0.1,
        streaming=True,
    )


SYSTEM_PROMPT = """You are an expert AI assistant specialized in explaining and analyzing GitHub repositories. \
You help developers understand unfamiliar codebases by searching the indexed repository content.

You have two tools available:
- search_repo: Search the indexed repository content for code, documentation, configuration, and explanations
- get_repo_metadata: Fetch live GitHub stats (stars, forks, language, description, topics)

Tool usage rules — follow these EXACTLY:
- Questions about repository code, structure, architecture, implementation, how something works, entry points, \
  auth, tests, dependencies in code → use search_repo
- Questions about stars, forks, popularity, language stats, topics, license, when created → use get_repo_metadata
- You may call search_repo multiple times with different queries to gather comprehensive information
- For general "what does this repo do?" questions → use BOTH search_repo (README/main files) AND get_repo_metadata

When answering:
1. Always cite the specific files where you found the information (e.g., "In `src/main.py`...")
2. Show relevant code snippets when helpful
3. Be precise and technical — developers asking these questions are professionals
4. If the repository is not yet indexed, tell the user to paste the URL in the Explore tab to ingest it first
5. Structure longer answers with clear sections

If a repo_name is provided in the query context, always pass it to search_repo to filter results to that repo."""


class StreamingCallbackHandler(BaseCallbackHandler):
    def __init__(self, event_queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        self.queue = event_queue
        self.loop = loop

    def on_tool_start(self, serialized: dict[str, Any], input_str: str, **kwargs):
        tool_name = serialized.get("name", "unknown_tool")
        self.loop.call_soon_threadsafe(
            self.queue.put_nowait,
            {"type": "tool_call", "content": tool_name, "metadata": {"input": str(input_str)[:200]}},
        )

    def on_tool_end(self, output: str, **kwargs):
        self.loop.call_soon_threadsafe(
            self.queue.put_nowait,
            {"type": "tool_result", "content": str(output)[:500], "metadata": {}},
        )

    def on_llm_new_token(self, token: str, **kwargs):
        # Skip tool call chunks — they are internal LLM function call encodings, not user-facing text
        chunk = kwargs.get("chunk")
        if chunk and hasattr(chunk, "tool_call_chunks") and chunk.tool_call_chunks:
            return
        if not token:
            return
        self.loop.call_soon_threadsafe(
            self.queue.put_nowait,
            {"type": "token", "content": token, "metadata": {}},
        )


class RepoAgent:
    def __init__(self):
        self.settings = get_settings()
        self.llm = _build_llm(self.settings)
        self.tools = [SearchRepoTool(), GetRepoMetadataTool()]
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

    def _build_agent_executor(self, callback_handler: BaseCallbackHandler) -> AgentExecutor:
        agent = create_tool_calling_agent(self.llm, self.tools, self.prompt)
        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,
            max_iterations=8,
            max_execution_time=90,
            handle_parsing_errors=True,
            callbacks=[callback_handler],
        )

    async def astream_response(
        self, query: str, repo_name: Optional[str] = None
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Stream agent response events. Yields dicts with keys: type, content, metadata.
        Types: token, tool_call, tool_result, error
        """
        event_queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_event_loop()
        callback_handler = StreamingCallbackHandler(event_queue, loop)

        # Enrich query with repo context if provided
        enriched_query = query
        if repo_name:
            enriched_query = f"[Repo context: {repo_name}]\n\n{query}"

        async def run_agent():
            try:
                executor = self._build_agent_executor(callback_handler)
                result = await loop.run_in_executor(
                    None,
                    lambda: executor.invoke({"input": enriched_query}),
                )
                output = result.get("output", "")
                if output:
                    await event_queue.put({"type": "token", "content": output, "metadata": {}})
            except Exception as e:
                error_msg = str(e)
                if "429" in error_msg:
                    await event_queue.put({
                        "type": "error",
                        "content": "Rate limit hit. Please wait 30 seconds and try again.",
                        "metadata": {},
                    })
                else:
                    logger.error(f"Agent error: {error_msg}")
                    await event_queue.put({
                        "type": "error",
                        "content": f"Agent error: {error_msg}",
                        "metadata": {},
                    })
            finally:
                await event_queue.put(None)

        task = asyncio.create_task(run_agent())

        while True:
            try:
                event = await asyncio.wait_for(event_queue.get(), timeout=120.0)
                if event is None:
                    break
                yield event
            except asyncio.TimeoutError:
                yield {"type": "error", "content": "Agent timed out after 120s", "metadata": {}}
                break

        # Ensure task is complete
        try:
            await asyncio.wait_for(task, timeout=5.0)
        except (asyncio.TimeoutError, Exception):
            pass
