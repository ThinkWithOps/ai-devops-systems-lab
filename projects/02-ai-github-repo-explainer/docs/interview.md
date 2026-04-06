# Interview Prep — AI GitHub Repo Explainer

---

## STAR Story

**Situation:**
When joining a new team or reviewing an unfamiliar open-source project, engineers spend hours just trying to understand the codebase — reading folders, tracing imports, guessing at service boundaries. There's no fast way to ask *"how does checkout work?"* and get a real answer from the actual code.

**Task:**
Build an AI-powered tool that can ingest any GitHub repository, index its contents, and let engineers ask natural language questions about the architecture, services, and implementation — and get answers grounded in the actual code.

**Action:**
Built a full-stack RAG (Retrieval-Augmented Generation) system:
- Next.js frontend with a split-pane IDE-style layout
- FastAPI backend that clones repos, chunks files, and manages indexing
- Sentence Transformers to convert code chunks into vector embeddings
- ChromaDB as the vector store for fast semantic search
- LangChain to orchestrate retrieval + LLM reasoning
- GitHub GraphQL API to browse repo file trees without cloning

**Result:**
You can paste any public GitHub URL, index it in under a minute, then ask questions like *"How is authentication handled?"* or *"What does the payment service do?"* and get accurate, cited answers from the actual source files — without opening a single file manually.

---

## 2-Minute Architecture Walk (Whiteboard Version)

Use this when asked: *"Walk me through your architecture."*

```
User pastes GitHub URL
        ↓
Frontend (Next.js :3000)
        ↓
Backend API (FastAPI :8000)
        ↓
   [Ingest flow]                        [Query flow]
Clone repo → chunk files          Question → embed question
        ↓                                   ↓
Sentence Transformers             Sentence Transformers
(embed each chunk)                (embed the question)
        ↓                                   ↓
ChromaDB (store vectors)    →   ChromaDB (similarity search)
                                            ↓
                                  Top-K relevant chunks
                                            ↓
                                  LangChain + LLM (Ollama/Groq)
                                            ↓
                                  Answer with source citations
                                            ↓
                                      Frontend UI
```

**Step-by-step explanation:**

**1. User pastes a GitHub URL into the frontend (Next.js :3000)**
The frontend is a split-pane dashboard. Left side is the repo explorer and ingest panel. Right side is the chat interface. The user pastes a URL like `https://github.com/ThinkWithOps/shopflow` and clicks Analyze.

**2. Frontend calls the backend ingest API (FastAPI :8000)**
The frontend sends a POST request to `/ingest` and opens a Server-Sent Events connection to stream progress in real time. The user sees live updates — "Cloning repo... Chunking files... Embedding chunks..." — instead of staring at a spinner.

**3. Backend clones the repo and chunks the files**
FastAPI clones the repo to a temp folder, walks every file, and splits the content into overlapping chunks (~500 tokens each with ~50 token overlap). The overlap ensures that if an important concept spans two chunks, neither half loses its context.

**4. Sentence Transformers converts each chunk into a vector embedding**
Each chunk is passed through the `all-MiniLM-L6-v2` model which outputs a list of 384 numbers. These numbers mathematically encode the *meaning* of that chunk. Code that does similar things will have similar vectors — even if the exact words differ.

**5. Vectors + metadata stored in ChromaDB (:8001)**
Each embedding is stored in ChromaDB alongside its metadata: file path, chunk index, raw text. ChromaDB persists this to a Docker volume on disk, so the indexed data survives container restarts. You index once, query forever.

**6. User asks a question in the chat panel**
The question — e.g. *"How does the checkout flow work?"* — is sent to the backend `/chat` endpoint.

**7. The question is also embedded using Sentence Transformers**
The question goes through the same embedding model and becomes a vector. Now both the question and every code chunk exist in the same mathematical space.

**8. ChromaDB runs a similarity search**
ChromaDB compares the question vector against all stored chunk vectors using cosine similarity — essentially measuring the angle between vectors. The top-5 closest chunks are returned. These are the most semantically relevant pieces of code to the question.

**9. LangChain builds the prompt and calls the LLM**
LangChain takes the question + the 5 retrieved chunks and injects them into a prompt template: *"Answer the question using only the context below. If you don't know, say so."* This prompt goes to Ollama (local) or Groq (fast cloud). The LLM never sees the full repo — only the relevant slices.

**10. Answer returned to the frontend with source citations**
The response includes the answer and which files/chunks it came from. The user can verify the answer by clicking the source — it highlights the exact chunk in the file explorer.

**Key design decisions:**
- Indexing and querying are completely separate flows — index once, query many times
- The LLM never sees the full codebase — only top-K chunks, keeping it fast and accurate
- Runs fully local with Ollama — zero API cost during demo
- ChromaDB persists via Docker volume so re-indexing is not needed on restart

---

## Tech Deep Dives

### LangChain

**What it is:**
A framework for building applications that chain together LLM calls, tool use, and data retrieval in a structured way.

**Why you used it:**
Without LangChain, you'd manually write the prompt construction, retrieval injection, and LLM call every time. LangChain gives you a clean RAG chain: retrieve → inject → generate.

**How it fits this project:**
It runs the RetrievalQA chain — takes the user's question, fetches relevant chunks from ChromaDB, injects them into the prompt context, and returns a grounded answer.

**Follow-up question they might ask:**
> "Could you have done this without LangChain?"

**Your answer:**
Yes — LangChain is a convenience layer. You could call the embedding model and LLM directly. But LangChain handles prompt templating, chain composition, and retrieval integration cleanly. For a demo project, it lets you move faster without reinventing that plumbing.

---

### ChromaDB (Vector Database)

**What it is:**
An open-source vector database — it stores embeddings (numbers that represent meaning) and lets you search by semantic similarity instead of exact keyword match.

**Why you used it:**
A regular database like PostgreSQL can't answer "find me the code most relevant to authentication" — it can only do exact or pattern matches. ChromaDB finds the closest meaning match using vector math (cosine similarity).

**How it fits this project:**
Every code chunk from the repo is stored as a vector in ChromaDB. When a user asks a question, the question is also embedded and ChromaDB returns the top-K chunks with the closest meaning — those become the context for the LLM.

**Follow-up question they might ask:**
> "What's the difference between ChromaDB and Pinecone?"

**Your answer:**
Both are vector databases. ChromaDB is open-source and runs locally — perfect for demos and local-first development with no API cost. Pinecone is managed, cloud-hosted, and scales to billions of vectors. For this project, ChromaDB was the right choice because the entire stack runs on a single EC2 instance.

---

### Sentence Transformers

**What it is:**
A Python library that converts text (sentences, code snippets) into dense vector embeddings using pre-trained transformer models — without needing an OpenAI API key.

**Why you used it:**
It runs fully local. No API cost, no rate limits, no data leaving the server. The `all-MiniLM-L6-v2` model is fast, small, and works well for code and documentation similarity.

**How it fits this project:**
Used in two places: during ingest (embed every chunk before storing in ChromaDB) and during query (embed the user's question before searching ChromaDB).

**Follow-up question they might ask:**
> "Why not use OpenAI embeddings?"

**Your answer:**
OpenAI embeddings are higher quality but cost money per token and require an API key. For a local-first portfolio project, Sentence Transformers gives good enough quality at zero cost. In production, you'd evaluate whether the quality gain from OpenAI embeddings justifies the cost.

---

### FastAPI

**What it is:**
A modern Python web framework for building APIs — fast, async-capable, and auto-generates OpenAPI docs.

**Why you used it:**
It's the standard for Python AI/ML backends. Async support handles long-running tasks like repo cloning and indexing without blocking other requests. The auto-generated docs at `/docs` make it easy to test endpoints during development.

**How it fits this project:**
Handles three main flows: repo ingest (clone + chunk + embed + store), repo listing/deletion, and chat queries. The ingest endpoint uses Server-Sent Events (SSE) to stream progress back to the frontend in real time.

**Follow-up question they might ask:**
> "How did you handle the long-running ingest without timing out?"

**Your answer:**
Used Server-Sent Events — the frontend opens a persistent connection and the backend streams progress events as it processes each file. The user sees live progress instead of waiting for a single slow response.

---

### RAG (Retrieval-Augmented Generation)

**What it is:**
A pattern where instead of asking an LLM to answer from memory (which leads to hallucination), you first *retrieve* relevant documents and then *augment* the LLM's prompt with that real context before generating the answer.

**Why you used it:**
An LLM has no knowledge of a private or unfamiliar GitHub repo. RAG solves this — you give the LLM the actual relevant code as context, so its answer is grounded in reality, not guesswork.

**How it fits this project:**
The entire question-answering flow is RAG: embed question → search ChromaDB → inject top chunks into prompt → LLM generates answer citing those chunks.

**Follow-up question they might ask:**
> "How do you prevent the AI from making things up?"

**Your answer:**
The prompt explicitly instructs the LLM to answer only from the provided context and say "I don't know" if the context doesn't contain the answer. It's not perfect — hallucination is still possible — but grounding responses in retrieved code chunks significantly reduces it compared to asking a raw LLM.

---

## Key Numbers to Mention

- Indexes a ~50-file repo in under 30 seconds
- Chunks split at ~500 tokens with overlap to preserve context across boundaries
- Top-5 chunks retrieved per query (configurable)
- 3 core services: frontend (3000), backend (8000), ChromaDB (8001)
- Runs fully local with Ollama — zero API cost
- Supports any public GitHub repo URL

---

## Challenges & How You Fixed Them

**Challenge 1: TypeScript type errors blocking Docker build**
- Problem: The frontend `IngestProgressEvent` type didn't include `file`, `file_path`, or `indexed_at` fields that the backend was emitting — caused type errors during `next build` inside Docker.
- Fix: Added the missing optional fields to the interface in `lib/api.ts`.
- Learning: Always keep frontend types in sync with backend SSE event shapes. A shared contract file (or OpenAPI codegen) would prevent this at scale.

**Challenge 2: Delete repo returning 404 for repos with slashes in the name**
- Problem: Repo names like `ThinkWithOps/shopflow` contain a `/` — FastAPI treated it as a path separator and routed to the wrong endpoint.
- Fix: Changed the route parameter to `{repo_name:path}` which tells FastAPI to capture everything including slashes.
- Learning: URL path parameters with special characters need explicit path type annotation in FastAPI. Always test with real-world input, not just simple strings.

**Challenge 3: Docker layer caching serving stale code**
- Problem: After fixing TypeScript errors and pushing, the server was still building from a cached layer that had the old code.
- Fix: `docker-compose build --no-cache frontend` to force a full rebuild.
- Learning: Docker caches aggressively. When a fix isn't showing up after `git pull + docker-compose up --build`, always try `--no-cache` before assuming the code is wrong.

---

## Likely Interview Questions + Strong Answers

**Q: Why did you build this instead of just using GitHub Copilot or asking ChatGPT about the repo?**
A: ChatGPT and Copilot don't have access to private repos or repos they haven't been trained on. More importantly, they answer from general knowledge, not from the actual code. This tool reads and indexes the real files — so answers are grounded in what's actually there, not what the model guesses. It also works on any repo without needing to paste files manually.

**Q: How would you scale this to production?**
A: A few things I'd add: authentication so users can only access their own indexed repos, a job queue (like Celery + Redis) so ingest runs async in the background, persistent storage for ChromaDB (already using a Docker volume, but I'd move to a managed vector DB like Pinecone for scale), rate limiting on the ingest endpoint, and monitoring on query latency. The current architecture is single-server — for real scale I'd containerize and put it behind a load balancer.

**Q: What would you do differently if you rebuilt this?**
A: I'd define a shared schema between the backend SSE events and the frontend TypeScript types from day one — probably using OpenAPI codegen or a shared Pydantic-to-TypeScript tool. I hit type mismatch bugs during deployment that could have been caught at compile time. I'd also add proper error boundaries in the frontend so partial ingest failures are visible to the user.

**Q: How does the AI know which information is relevant?**
A: When you ask a question, it's converted into a vector embedding — essentially a list of numbers that encodes its meaning. ChromaDB then does a cosine similarity search across all the stored code chunk embeddings and returns the ones with the closest meaning. It's like a semantic search — "how does checkout work" finds chunks about payments and cart logic even if the word "checkout" doesn't literally appear in every chunk.

**Q: What happens if the LLM gives a wrong answer?**
A: That's a real risk. The mitigation here is the retrieval step — the LLM is always working from actual code chunks, not memory. The prompt also instructs it to cite its sources and say "I don't know" if the context doesn't contain the answer. In a production system I'd add a confidence score, a "show sources" panel so users can verify, and feedback buttons to flag bad answers for review.
