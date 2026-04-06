import ArchitectureViewer from '@/components/dashboard/ArchitectureViewer';

const COMPONENTS = [
  {
    name: 'Next.js Frontend',
    layer: 'Frontend',
    color: 'blue',
    description: 'React 18 + Next.js 14 app with Tailwind CSS. Provides chat interface, dashboard, log viewer, and metrics. Streams SSE from the backend.',
  },
  {
    name: 'FastAPI Backend',
    layer: 'API',
    color: 'green',
    description: 'Python FastAPI server with SSE streaming. Hosts REST endpoints for chat, GitHub data, and logs. Orchestrates the LangChain agent.',
  },
  {
    name: 'LangChain Agent',
    layer: 'AI',
    color: 'purple',
    description: 'ReAct-pattern agent using Ollama (llama3). Calls tools iteratively: GitHub tool, log search tool, and docs retrieval tool.',
  },
  {
    name: 'Ollama / llama3',
    layer: 'LLM',
    color: 'purple',
    description: 'Local LLM inference. Runs llama3 model. Provides token-by-token streaming output. Zero external API costs.',
  },
  {
    name: 'ChromaDB',
    layer: 'VectorDB',
    color: 'orange',
    description: 'Vector database for semantic search. Stores DevOps documentation and log embeddings. Enables RAG for context-aware answers.',
  },
  {
    name: 'GitHub API',
    layer: 'External',
    color: 'gray',
    description: 'GitHub REST API v3. Provides repository info, workflow runs, pull requests, and issues. Supports mock data when no token is set.',
  },
];

const LAYER_COLORS: Record<string, string> = {
  blue: 'bg-blue-950/60 border-blue-800 text-blue-300',
  green: 'bg-green-950/60 border-green-800 text-green-300',
  purple: 'bg-purple-950/60 border-purple-800 text-purple-300',
  orange: 'bg-orange-950/60 border-orange-800 text-orange-300',
  gray: 'bg-slate-800/60 border-slate-600 text-slate-300',
};

export default function ArchitecturePage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">System Architecture</h1>
        <p className="text-slate-400 text-sm mt-1">
          How the AI DevOps Copilot components connect and communicate
        </p>
      </div>

      {/* Architecture diagram */}
      <ArchitectureViewer />

      {/* Component details */}
      <div>
        <h2 className="text-slate-300 font-semibold text-lg mb-4">Component Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Data flow */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-slate-300 font-semibold text-base mb-4">Data Flow — Query Lifecycle</h2>
        <ol className="space-y-3">
          {[
            'User types a query in the chat interface (Next.js frontend)',
            'Frontend POSTs to POST /api/chat with the query text',
            'FastAPI instantiates the CopilotAgent with the query',
            'LangChain ReAct agent decides which tool to call (GitHub, logs, or docs)',
            'Each tool result is streamed back as a Server-Sent Event (SSE)',
            'LangChain processes tool results and may call additional tools',
            'Final answer tokens are streamed to the frontend in real time',
            'Frontend renders the complete response in the chat bubble',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/60 border border-blue-700 text-blue-300 text-xs flex items-center justify-center font-bold">
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
