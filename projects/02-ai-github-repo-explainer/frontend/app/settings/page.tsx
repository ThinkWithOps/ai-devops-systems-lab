'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { getHealth } from '@/lib/api';

interface HealthStatus {
  status: string;
  llm_provider: string;
  services: { llm: boolean; chromadb: boolean };
}

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  const StatusIcon = ({ ok }: { ok: boolean }) =>
    ok ? (
      <CheckCircle className="w-4 h-4 text-green-400" />
    ) : (
      <XCircle className="w-4 h-4 text-red-400" />
    );

  return (
    <div className="p-6 space-y-6 overflow-y-auto flex-1 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">
          Configuration and system status for the AI GitHub Repo Explainer
        </p>
      </div>

      {/* Service status */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-slate-200 font-semibold text-base mb-4">Service Status</h2>
        <div className="space-y-3">
          {[
            {
              name: 'LLM',
              description: health?.llm_provider === 'groq' ? 'Groq (llama-3.1-8b-instant)' : 'Ollama (llama3)',
              ok: health?.services.llm ?? false,
            },
            {
              name: 'ChromaDB',
              description: 'Vector database for semantic search',
              ok: health?.services.chromadb ?? false,
            },
            {
              name: 'GitHub REST API',
              description: 'Public API — add GITHUB_TOKEN for higher rate limits (5000/hr)',
              ok: true,
            },
            {
              name: 'sentence-transformers',
              description: 'all-MiniLM-L6-v2 — local embeddings, no API key needed',
              ok: true,
            },
          ].map((svc) => (
            <div key={svc.name} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <StatusIcon ok={svc.ok} />
              <div className="flex-1">
                <p className="text-slate-200 text-sm font-medium">{svc.name}</p>
                <p className="text-slate-500 text-xs">{svc.description}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                svc.ok
                  ? 'bg-green-900/40 text-green-400 border-green-800'
                  : 'bg-red-900/40 text-red-400 border-red-800'
              }`}>
                {svc.ok ? 'Online' : 'Offline'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration reference */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-slate-200 font-semibold text-base mb-4">Environment Variables</h2>
        <p className="text-slate-400 text-sm mb-4">
          Set these in <code className="text-violet-300 bg-slate-800 px-1.5 py-0.5 rounded text-xs">backend/.env</code> or in Docker Compose environment.
        </p>
        <div className="space-y-2">
          {[
            { key: 'GROQ_API_KEY', desc: 'Required for Groq LLM (fast). Get free key at console.groq.com', required: true },
            { key: 'GITHUB_TOKEN', desc: 'Optional. Increases rate limit from 60 to 5000 req/hr', required: false },
            { key: 'GROQ_MODEL', desc: 'Default: llama-3.1-8b-instant', required: false },
            { key: 'CHROMA_HOST', desc: 'ChromaDB hostname. Default: localhost (chromadb in Docker)', required: false },
            { key: 'CHROMA_PORT', desc: 'ChromaDB port. Default: 8001', required: false },
            { key: 'OLLAMA_BASE_URL', desc: 'Fallback LLM. Default: http://localhost:11434', required: false },
            { key: 'OLLAMA_MODEL', desc: 'Ollama model name. Default: llama3', required: false },
          ].map((env) => (
            <div key={env.key} className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0">
              <code className="text-violet-300 text-xs bg-slate-800 px-2 py-1 rounded font-mono flex-shrink-0 mt-0.5">
                {env.key}
              </code>
              <div className="flex-1">
                <p className="text-slate-400 text-xs">{env.desc}</p>
              </div>
              {env.required && (
                <span className="text-xs text-red-400 flex-shrink-0 mt-0.5">Required</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Rate limit info */}
      <div className="bg-yellow-950/30 border border-yellow-800 rounded-xl p-5">
        <h2 className="text-yellow-300 font-semibold text-sm mb-2">GitHub Rate Limits</h2>
        <p className="text-yellow-400 text-xs leading-relaxed">
          Without a GitHub token, the API allows 60 requests/hour. Indexing a large repo can consume 50+ requests.
          Set <code className="bg-yellow-900/40 px-1 rounded">GITHUB_TOKEN</code> to increase to 5,000 requests/hour.
          Get a free token at GitHub Settings &rarr; Developer settings &rarr; Personal access tokens.
        </p>
      </div>
    </div>
  );
}
