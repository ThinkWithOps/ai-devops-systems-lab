# Interview Prep — AI DevOps Copilot

---

## STAR Story

**Situation:**
DevOps engineers waste huge amounts of time during incidents jumping between GitHub, logs, runbooks, and terminal tools — all in separate tabs, all manually searched. There's no single place to ask "why is my pod crashing?" and get an answer grounded in your actual system data.

**Task:**
Build a conversational AI copilot specifically for DevOps engineers — one that understands your GitHub repos, searches your logs semantically, retrieves relevant runbook guidance, and streams back reasoning in real time from a single chat interface.

**Action:**
Built a full-stack AI system:
- Next.js 14 frontend with a streaming chat interface, live agent activity feed, and KPI dashboard
- FastAPI backend that orchestrates a LangChain ReAct agent with three tools: GitHub search, log search, and DevOps docs RAG
- ChromaDB as the vector store for both DevOps documentation and log entries
- Ollama running llama3 locally — zero API cost, zero data sent externally
- All services wired together in Docker Compose with persistent volumes

**Result:**
An engineer can type *"Why is my api-gateway pod OOMKilled?"* and within seconds the AI reasons through the question, calls the right tools, retrieves relevant logs and runbook guidance, and streams back a complete diagnosis — without opening a single other tab.

---

## 2-Minute Architecture Walk (Whiteboard Version)

```
Engineer types question in chat (Next.js :3000)
                    ↓
         POST /api/chat (FastAPI :8000)
                    ↓
         LangChain ReAct Agent initialized
                    ↓
         llama3 via Ollama (:11434)
         "Thought: I need to check logs"
         "Action: log_search"
         "Action Input: OOMKilled"
                    ↓
    ┌───────────────────────────────┐
    │         3 Tools               │
    │  log_search → ChromaDB        │
    │  devops_docs → ChromaDB       │
    │  github_search → GitHub API   │
    └───────────────────────────────┘
                    ↓
    Tool result injected back into LLM context
    LLM reasons again → may call another tool
    Up to 5 reasoning steps
                    ↓
    Final answer streamed token-by-token via SSE
                    ↓
    Frontend renders in real time + agent activity feed
```

**Step-by-step explanation:**

**1. Engineer types a question in the Next.js frontend (:3000)**
The UI is a SaaS-style dashboard — sidebar navigation, KPI cards at the top, and a streaming chat panel. The engineer types a question like *"Why is my api-gateway pod OOMKilled?"* and hits send. The frontend opens a streaming fetch connection to the backend — not a regular request/response, but a persistent SSE stream so it can receive events token-by-token.

**2. FastAPI receives POST /api/chat and initializes the agent**
The backend instantiates the `CopilotAgent`, which wraps a LangChain ReAct agent loaded with three tools. It calls `astream_response(query)` and starts yielding SSE events back immediately — so the user sees activity within milliseconds, not after a long wait.

**3. LangChain ReAct agent sends the query to llama3 via Ollama**
ReAct stands for Reason + Act. The agent doesn't just ask the LLM for an answer — it gives it a structured prompt that includes tool descriptions and tells it to reason step by step. llama3 responds with a "Thought / Action / Action Input" chain, deciding which tool to call first based on the question.

**4. Tool selection and execution**
The agent has three tools:
- **`log_search`** — semantically searches ChromaDB for relevant log entries matching the query
- **`devops_docs`** — RAG retrieval from a ChromaDB collection of chunked DevOps runbooks (CI/CD, Kubernetes patterns, error docs)
- **`github_search`** — queries the GitHub API for repos, PRs, workflow runs, and issues

For the OOMKilled question, the agent would call `log_search` first to find relevant log entries, then possibly `devops_docs` to retrieve Kubernetes memory limit guidance.

**5. Each tool call streamed to the frontend in real time**
As soon as a tool is called, the backend streams a `{"type": "tool_call", "content": "log_search"}` SSE event. The frontend's agent activity feed lights up showing exactly what the AI is doing — this is the visual wow moment for the YouTube demo and for an interview demo.

**6. Tool results injected back into the LLM context**
The tool results are appended to the conversation and sent back to llama3. The LLM reasons again — it may decide to call another tool (up to 5 steps) or generate the final answer if it has enough context.

**7. Final answer streamed token-by-token**
Once the LLM is ready to answer, each token is streamed as a `{"type": "token", "content": "..."}` SSE event. The frontend accumulates and renders tokens in real time — the user sees the answer being typed out live, like ChatGPT.

**8. ChromaDB as the persistent knowledge layer**
ChromaDB runs as a separate container (:8001) with two collections: `devops_docs` (pre-indexed Markdown runbooks) and `logs` (application log entries). Both persist to a Docker named volume so data survives restarts. No re-indexing needed between sessions.

**9. Ollama runs llama3 entirely locally**
Ollama runs as a container with the llama3 8B model. Zero API cost, zero data sent externally, GPU-accelerated if available. The model is stored in a persistent Docker volume so it doesn't re-download on restart.

**Key design decisions:**
- ReAct pattern chosen over a simple LLM call because it lets the model reason about which tool to use — it's not hardcoded, the LLM decides
- SSE chosen over WebSockets for streaming because it's simpler, one-directional, and works over standard HTTP
- Ollama over OpenAI because the entire stack runs locally with zero cost — critical for a portfolio demo
- ChromaDB's built-in embeddings used (no separate embedding service needed) to keep the stack simple

---

## Tech Deep Dives

### LangChain ReAct Agent

**What it is:**
A framework pattern where an LLM reasons step-by-step and decides which tools to call in a loop — Reason, Act, Observe, repeat — until it has enough information to give a final answer.

**Why you used it:**
A plain LLM call would give a generic answer from training data. ReAct lets the model interact with your actual system — it can search real logs, retrieve real runbooks, and query real GitHub data before answering. The reasoning is transparent and auditable.

**How it fits this project:**
The agent chooses between three tools based on the question. For an incident question it calls log_search and devops_docs. For a repo question it calls github_search. It chains multiple tool calls if needed, up to 5 steps, before giving the final answer.

**Follow-up question they might ask:**
> "What's the difference between ReAct and a simple prompt?"

**Your answer:**
A simple prompt sends the question to the LLM and gets one response. ReAct is a loop — the LLM can say "I need more information" and call a tool, get results, reason again, call another tool, and only answer once it has real data. It's much more reliable for questions that require looking something up.

---

### ChromaDB (Vector Database)

**What it is:**
An open-source vector database that stores text as mathematical embeddings and retrieves results by semantic similarity — finding the closest meaning match rather than exact keyword match.

**Why you used it:**
Log search by keyword is brittle — you have to know exactly what to search for. Semantic search finds relevant logs even when the exact words differ. Same for runbook retrieval — "pod restart loop" finds documentation about `CrashLoopBackOff` without needing that exact term.

**How it fits this project:**
Two collections: `devops_docs` stores chunked runbook Markdown, `logs` stores application log entries. Both are queried by the LangChain tools. Data persists via Docker volume — no re-indexing between restarts.

**Follow-up question they might ask:**
> "Why not just use Elasticsearch for log search?"

**Your answer:**
Elasticsearch excels at keyword and structured search at scale. ChromaDB excels at semantic similarity — finding conceptually related content. For a DevOps copilot where engineers ask natural language questions rather than query strings, semantic search is more useful. In production I'd probably use both: Elasticsearch for high-volume log ingestion, ChromaDB for semantic retrieval.

---

### Server-Sent Events (SSE)

**What it is:**
A web standard that keeps an HTTP connection open and lets the server push events to the client in real time — one-directional streaming from server to browser.

**Why you used it:**
LLM responses generate tokens one at a time over several seconds. Without streaming, the user stares at a spinner until the full response is ready. SSE lets the frontend render tokens as they arrive — same experience as ChatGPT.

**How it fits this project:**
The backend streams three event types: `tool_call` (which tool the agent just invoked), `tool_result` (what came back), and `token` (each word of the final answer). The frontend renders all three in real time — the agent activity feed and the chat bubble both update live.

**Follow-up question they might ask:**
> "Why SSE instead of WebSockets?"

**Your answer:**
WebSockets are bidirectional and more complex to set up. SSE is one-directional (server to client), which is exactly what's needed here — the client sends one POST request, the server streams back. SSE is simpler, works over standard HTTP/2, and is natively supported by the browser's `fetch` API with a readable stream.

---

### Ollama + llama3

**What it is:**
Ollama is a local LLM runtime that lets you run open-source models like Meta's llama3 entirely on your own machine — no API key, no cloud, no cost per token.

**Why you used it:**
For a portfolio project that needs to demo reliably without internet dependency or API costs, local inference is the right call. llama3 8B is capable enough for DevOps reasoning tasks and runs on a standard EC2 instance.

**How it fits this project:**
Ollama runs as a Docker container and exposes a local API at port 11434. LangChain's `ChatOllama` wrapper sends requests to it exactly like it would to OpenAI — so swapping to GPT-4 in production is a one-line change.

**Follow-up question they might ask:**
> "How would you swap Ollama for OpenAI in production?"

**Your answer:**
Change `ChatOllama` to `ChatOpenAI` in the agent initialization and set the API key. LangChain abstracts the LLM provider — the agent, tools, and streaming logic don't change. The main trade-off is cost vs quality: llama3 8B is free but GPT-4 gives better reasoning for complex multi-step incidents.

---

### FastAPI + SSE Streaming

**What it is:**
FastAPI is a modern async Python web framework. Combined with `sse-starlette`, it can keep HTTP connections open and push events to clients continuously.

**Why you used it:**
The LangChain agent is async — it yields events as it runs. FastAPI's async support and sse-starlette make it straightforward to forward those events directly to the browser without buffering. It also auto-generates OpenAPI docs at `/docs`, which speeds up development.

**How it fits this project:**
The `/api/chat` endpoint is a streaming generator — it yields SSE events from the agent loop (tool calls, tokens, errors) directly to the frontend. The client never waits for the full response before seeing output.

**Follow-up question they might ask:**
> "How do you handle errors mid-stream?"

**Your answer:**
If an error occurs mid-stream, the backend yields an `{"type": "error", "content": "..."}` event and closes the stream gracefully. The frontend listens for error events and displays them in the chat panel rather than leaving the user with a broken spinner.

---

## Key Numbers to Mention

- 3 AI tools: `log_search`, `devops_docs`, `github_search`
- Up to 5 ReAct reasoning steps per query
- 4 Docker services: frontend, backend, chromadb, ollama
- 2 ChromaDB collections: `devops_docs` and `logs`
- Streams first token in under 2 seconds on a warmed model
- Runs fully local — zero API cost
- llama3 8B model — ~4.7GB download, stored in persistent Docker volume

---

## Challenges & How You Fixed Them

**Challenge 1: passlib / bcrypt compatibility error on startup**
- Problem: `passlib==1.7.4` was importing `bcrypt` internals that changed in newer bcrypt versions, causing an `AttributeError` on startup.
- Fix: Pinned `bcrypt==4.0.1` in `requirements.txt`.
- Learning: Always pin transitive dependencies when using libraries that rely on internal APIs of other packages. Version mismatches surface at runtime, not install time.

**Challenge 2: Frontend port mismatch in Dockerfile**
- Problem: The ShopFlow frontend Dockerfile exposed port 3000 but the app was configured to run on a different port, causing the container to start but the UI to be unreachable.
- Fix: Set `PORT=3000` explicitly in the Dockerfile ENV.
- Learning: Always verify which port the Node.js app actually listens on — `next start` defaults to 3000 but environment variables can override it silently.

**Challenge 3: useSearchParams() causing build error in Next.js**
- Problem: `useSearchParams()` must be wrapped in a `<Suspense>` boundary in Next.js 14 App Router — without it, the build fails with a hydration error.
- Fix: Wrapped the component using `useSearchParams` in a `<Suspense>` boundary and added `output: 'standalone'` to `next.config.js` for Docker deployment.
- Learning: Next.js 14 App Router has strict rules about client-side hooks — always wrap dynamic data hooks in Suspense boundaries.

---

## Likely Interview Questions + Strong Answers

**Q: Why did you build this instead of just using ChatGPT or GitHub Copilot?**
A: ChatGPT and Copilot don't have access to your live system data — your actual logs, your specific GitHub repos, your internal runbooks. They answer from training data. This copilot connects to real tools and retrieves real context before answering. It's the difference between asking a generic consultant and asking someone who has actually read your logs.

**Q: How would you scale this to production?**
A: Several things I'd add: authentication with JWT so each engineer has their own conversation history, a job queue for long-running tool calls so they don't block the API, PostgreSQL for persistent conversation storage, rate limiting on the chat endpoint, and OpenTelemetry tracing across all services. I'd also replace llama3 with a fine-tuned model trained on internal runbooks and post-mortems for better domain accuracy. The Docker Compose setup would move to Kubernetes for horizontal scaling.

**Q: What would you do differently if you rebuilt this?**
A: I'd define a strict schema for SSE event types from day one — shared between the backend and frontend TypeScript types — instead of letting them drift. I'd also add proper conversation memory (currently each question is stateless) so the agent can reference earlier parts of the conversation. And I'd add a feedback mechanism so engineers can rate answers, which feeds into improving the runbook content over time.

**Q: How does the agent decide which tool to call?**
A: The LLM itself decides — that's the ReAct pattern. The agent's system prompt describes all three tools and their use cases. When the engineer asks a question, llama3 reasons about which tool is most relevant and outputs a structured "Action / Action Input" decision. It's not hardcoded logic — the LLM is making a reasoning decision each time.

**Q: What happens if Ollama is slow or the model isn't loaded?**
A: The first query after startup takes longer because Ollama loads the model into memory (a few seconds). After that it's cached and fast. If Ollama is down entirely, FastAPI returns an error SSE event and the frontend shows an error state. In production I'd add a health check that verifies Ollama is running and the model is loaded before accepting chat requests.
