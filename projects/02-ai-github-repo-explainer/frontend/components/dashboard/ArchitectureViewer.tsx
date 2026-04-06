'use client';

import { ArrowRight } from 'lucide-react';

const FLOW_STEPS = [
  {
    id: 'browser',
    label: 'Browser',
    sublabel: 'User pastes repo URL',
    color: 'bg-blue-950/60 border-blue-800 text-blue-300',
  },
  {
    id: 'frontend',
    label: 'Next.js 14',
    sublabel: 'React UI + SSE client',
    color: 'bg-blue-950/60 border-blue-700 text-blue-300',
  },
  {
    id: 'fastapi',
    label: 'FastAPI',
    sublabel: 'REST + SSE streaming',
    color: 'bg-green-950/60 border-green-800 text-green-300',
  },
  {
    id: 'agent',
    label: 'LangChain Agent',
    sublabel: 'create_tool_calling_agent',
    color: 'bg-violet-950/60 border-violet-800 text-violet-300',
  },
];

const TOOLS = [
  {
    id: 'search',
    label: 'search_repo',
    sublabel: 'ChromaDB semantic search',
    color: 'bg-orange-950/60 border-orange-800 text-orange-300',
  },
  {
    id: 'metadata',
    label: 'get_repo_metadata',
    sublabel: 'GitHub REST API',
    color: 'bg-slate-800/60 border-slate-600 text-slate-300',
  },
];

const STORAGE = [
  {
    id: 'chroma',
    label: 'ChromaDB',
    sublabel: 'all-MiniLM-L6-v2 embeddings',
    color: 'bg-orange-950/60 border-orange-800 text-orange-300',
  },
  {
    id: 'github',
    label: 'GitHub REST API',
    sublabel: 'File tree + content',
    color: 'bg-slate-800/60 border-slate-600 text-slate-300',
  },
];

export default function ArchitectureViewer() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h2 className="text-slate-100 font-semibold text-base mb-5">System Architecture</h2>

      {/* Main request flow */}
      <div className="mb-6">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">Chat Request Flow</p>
        <div className="flex items-center gap-2 flex-wrap">
          {FLOW_STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center gap-2">
              <div className={`rounded-lg border px-3 py-2 text-center min-w-[110px] ${step.color}`}>
                <div className="text-sm font-semibold">{step.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{step.sublabel}</div>
              </div>
              {i < FLOW_STEPS.length - 1 && (
                <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tool layer */}
      <div className="mb-6">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">Agent Tools</p>
        <div className="flex items-start gap-4">
          <div className="w-6 border-t-2 border-dashed border-slate-700 mt-5" />
          <div className="flex gap-3 flex-wrap">
            {TOOLS.map((tool) => (
              <div key={tool.id} className={`rounded-lg border px-3 py-2 min-w-[160px] ${tool.color}`}>
                <div className="text-sm font-mono font-semibold">{tool.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{tool.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Storage layer */}
      <div className="mb-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">Data Sources</p>
        <div className="flex gap-3 flex-wrap">
          {STORAGE.map((store) => (
            <div key={store.id} className={`rounded-lg border px-3 py-2 min-w-[160px] ${store.color}`}>
              <div className="text-sm font-semibold">{store.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{store.sublabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ingestion pipeline */}
      <div className="mt-5 border-t border-slate-800 pt-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">Ingestion Pipeline (one-time per repo)</p>
        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
          {[
            'GitHub URL',
            'Fetch tree (REST)',
            'Fetch 50 key files',
            'Chunk (100 lines)',
            'Embed (MiniLM)',
            'Store → ChromaDB',
          ].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <span className="bg-slate-800 border border-slate-700 rounded px-2 py-1">{step}</span>
              {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
