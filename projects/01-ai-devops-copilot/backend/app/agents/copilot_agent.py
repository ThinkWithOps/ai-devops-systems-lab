import asyncio
from typing import AsyncGenerator, Any
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.callbacks.base import BaseCallbackHandler

from app.config import get_settings
from app.agents.tools.github_tool import GitHubTool
from app.agents.tools.log_tool import LogSearchTool
from app.agents.tools.docs_tool import DocsRetrievalTool
from app.agents.tools.restaurant_tool import RestaurantMonitorTool


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


SYSTEM_PROMPT = """You are an expert DevOps and software engineering AI assistant with knowledge of AWS, Docker, Kubernetes, CI/CD, Terraform, Linux, Python, monitoring, and security.

You have live access to the Bella Roma restaurant app via the restaurant_monitor tool.

Tool usage rules — use ONE tool maximum per question, only when truly needed:
- Question mentions "restaurant", "Bella Roma", "menu", "kitchen", "payment", "order" → restaurant_monitor
- Question asks about specific logs or errors → log_search
- Question asks about GitHub repos or workflows → github_search
- Question asks for a specific runbook or doc → devops_docs
- Everything else → answer DIRECTLY from your knowledge, NO tools at all

Most questions do NOT need tools. Only use a tool if you need live data you cannot know otherwise.

Be concise and give actionable answers with commands and code examples."""


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


class CopilotAgent:
    def __init__(self):
        self.settings = get_settings()
        self.llm = _build_llm(self.settings)
        self.tools = [GitHubTool(), LogSearchTool(), DocsRetrievalTool(), RestaurantMonitorTool()]
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
            max_execution_time=60,
            handle_parsing_errors=True,
            callbacks=[callback_handler],
        )

    async def astream_response(self, query: str) -> AsyncGenerator[dict[str, Any], None]:
        event_queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_event_loop()
        callback_handler = StreamingCallbackHandler(event_queue, loop)

        async def run_agent():
            try:
                executor = self._build_agent_executor(callback_handler)
                result = await loop.run_in_executor(
                    None,
                    lambda: executor.invoke({"input": query}),
                )
                output = result.get("output", "")
                if output:
                    await event_queue.put({"type": "token", "content": output, "metadata": {}})
            except Exception as e:
                error_msg = str(e)
                if "429" in error_msg:
                    await event_queue.put({"type": "error", "content": "Rate limit hit. Please wait 30 seconds and try again.", "metadata": {}})
                else:
                    await event_queue.put({"type": "error", "content": f"Agent error: {error_msg}", "metadata": {}})
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
                yield {"type": "error", "content": "Agent timed out", "metadata": {}}
                break

        # Ensure task is complete
        try:
            await asyncio.wait_for(task, timeout=5.0)
        except (asyncio.TimeoutError, Exception):
            pass
