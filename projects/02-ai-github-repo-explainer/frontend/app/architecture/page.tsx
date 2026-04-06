import ArchitectureViewer from '@/components/dashboard/ArchitectureViewer';

const COMPONENTS = [
  {
    name: 'Next.js 14 Frontend',
    layer: 'Frontend',
    color: 'blue',
    description: 'React 18 + Next.js 14 app with Tailwind CSS. Provides repo URL input, ingestion progress UI, chat interface, and file tree viewer. Streams SSE from the backend.',
  },
  {
    name: 'FastAPI Backend',
    layer: 'API',
    color: 'green',
    description: 'Python 3.11 FastAPI server. Hosts endpoints for /repos/ingest (SSE), /repos (list/delete), /chat (SSE), and /health. Orchestrates the LangChain agent.',
  },
  {
    name: 'LangChain Agent',
    layer: 'AI',
    color: 'violet',
    description: 'Tool-calling agent using create_tool_calling_agent. Has two tools: search_repo (ChromaDB) and get_repo_metadata (GitHub API). Streams token-by-token via asyncio Queue.',
  },
  {
    name: 'Groq / llama-3.1-8b',
    layer: 'LLM',
    color: 'violet',
    description: 'Groq cloud inference for fast responses (~180 tokens/sec). Falls back to Ollama for fully local operation. Streaming enabled for real-time output.',
  },
  {
    name: 'ChromaDB',
    layer: 'VectorDB',
    color: 'orange',
    description: 'Vector database storing all repo chunks. Uses cosine similarity search with all-MiniLM-L6-v2 embeddings. Supports filtering by repo_name.',
  },
  {
    name: 'sentence-transformers',
    layer: 'Embeddings',
    color: 'orange',
    description: 'all-MiniLM-L6-v2 model for embedding file chunks. Runs 100% locally — free, no API key needed. 384-dimensional vectors, fast on CPU.',
  },
  {
    name: 'GitHub REST API',
    layer: 'External',
    color: 'gray',
    description: 'GitHub REST API v3. Fetches repo metadata, recursive file tree, and individual file contents (base64 decoded). Rate limit: 60/hr unauthenticated, 5000/hr with token.',
  },
  {
    name: 'Ingestion Pipeline',
    layer: 'Service',
    color: 'green',
    description: 'IngestionService streams SSE progress events: parse URL → fetch metadata → fetch tree → fetch 50 key files → chunk (100 lines, 10-line overlap) → embed → store in ChromaDB.',
  },
];

const LAYER_COLORS: Record<string, string> = {
  blue: 'bg-blue-950/60 border-blue-800 text-blue-300',
  green: 'bg-green-950/60 border-green-800 text-green-300',
  violet: 'bg-violet-950/60 border-violet-800 text-violet-300',
  orange: 'bg-orange-950/60 border-orange-800 text-orange-300',
  gray: 'bg-slate-800/60 border-slate-600 text-slate-300',
};

const DATA_FLOW_STEPS = [
  'User pastes GitHub repo URL in the Explore page',
  'Frontend POSTs to /api/repos/ingest, opens SSE stream for progress',
  'IngestionService fetches metadata, tree, and up to 50 key files via GitHub REST API',
  'Files are chunked (100 lines each with 10-line overlap) and embedded with all-MiniLM-L6-v2',
  'Chunks are stored in ChromaDB collection "github_repos" with repo_name metadata',
  'User opens Chat page, selects the indexed repo from the dropdown',
  'User sends a query — frontend POSTs to /api/chat with {query, repo_name}',
  'RepoAgent builds the enriched query and invokes the LangChain agent executor',
  'Agent calls search_repo tool: ChromaDB returns top 5 relevant chunks',
  'Agent calls get_repo_metadata tool (if stats are needed): GitHub API returns live data',
  'Agent reasoning tokens stream back via asyncio Queue → SSE → frontend renders in real time',
];

export default function ArchitecturePage() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto flex-1">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">System Architecture</h1>
        <p className="text-slate-400 text-sm mt-1">
          How the AI GitHub Repo Explainer components connect and communicate
        </p>
      </div>

      {/* Architecture diagram */}
      <ArchitectureViewer />

      {/* Component details */}
      <div>
        <h2 className="text-slate-300 font-semibold text-lg mb-4">Component Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMPONENTS.map((comp) => (
            <div
              key={comp.name}
              className={`rounded-xl border p-4 ${LAYER_COLORS[comp.color]}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{comp.name}</h3>
                <span className="text-xs opacity-60 bg-black/20 px-2 py-0.5 rounded">{comp.layer}</span>
              </div>
              <p className="text-xs opacity-80 leading-relaxed">{comp.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Full data flow */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-slate-300 font-semibold text-base mb-4">Complete Data Flow</h2>
        <ol className="space-y-3">
          {DATA_FLOW_STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-900/60 border border-violet-700 text-violet-300 text-xs flex items-center justify-center font-bold">
                {i + 1}
              </span>
              <span className="text-slate-300 text-sm pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
