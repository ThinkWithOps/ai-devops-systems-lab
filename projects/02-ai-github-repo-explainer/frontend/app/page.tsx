'use client';

import { useEffect, useState } from 'react';
import { BookOpen, MessageSquare, Database, Clock, Plus } from 'lucide-react';
import KPICard from '@/components/dashboard/KPICard';
import ArchitectureViewer from '@/components/dashboard/ArchitectureViewer';
import { getHealth, listRepos, type RepoInfo } from '@/lib/api';
import Link from 'next/link';

interface HealthStatus {
  status: string;
  llm_provider: string;
  services: { llm: boolean; chromadb: boolean };
}

const RECENT_ACTIVITY = [
  { id: 1, time: '5 min ago', action: 'Answered: "How is routing implemented in FastAPI?"', repo: 'tiangolo/fastapi', tools: ['search_repo'], status: 'success' },
  { id: 2, time: '12 min ago', action: 'Indexed repository: tiangolo/fastapi', repo: 'tiangolo/fastapi', tools: ['ingestion'], status: 'success' },
  { id: 3, time: '25 min ago', action: 'Answered: "What does this repo do?"', repo: 'vercel/next.js', tools: ['search_repo', 'get_repo_metadata'], status: 'success' },
  { id: 4, time: '1 hr ago', action: 'Indexed repository: vercel/next.js', repo: 'vercel/next.js', tools: ['ingestion'], status: 'success' },
  { id: 5, time: '2 hr ago', action: 'Answered: "What testing framework is used?"', repo: 'pallets/flask', tools: ['search_repo'], status: 'success' },
];

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [h, r] = await Promise.allSettled([getHealth(), listRepos()]);
        if (h.status === 'fulfilled') setHealth(h.value);
        if (r.status === 'fulfilled') setRepos(r.value.repos || []);
      } catch {
        // Non-fatal
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalChunks = repos.reduce((sum, r) => sum + (r.chunk_count || 0), 0);

  const kpiCards = [
    {
      title: 'Repos Indexed',
      value: repos.length.toString(),
      delta: repos.length > 0 ? `${repos.length} ready for chat` : 'Add your first repo',
      deltaType: repos.length > 0 ? ('up' as const) : ('neutral' as const),
      icon: BookOpen,
      color: 'violet',
    },
    {
      title: 'Questions Answered',
      value: '47',
      delta: '+8 today',
      deltaType: 'up' as const,
      icon: MessageSquare,
      color: 'blue',
    },
    {
      title: 'Chunks Indexed',
      value: totalChunks > 0 ? totalChunks.toLocaleString() : '0',
      delta: health?.services?.chromadb ? 'ChromaDB online' : 'ChromaDB offline',
      deltaType: health?.services?.chromadb ? ('up' as const) : ('down' as const),
      icon: Database,
      color: 'orange',
    },
    {
      title: 'Avg Response',
      value: '2.4s',
      delta: 'Groq fast inference',
      deltaType: 'up' as const,
      icon: Clock,
      color: 'green',
    },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto flex-1">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          AI-powered GitHub repository analysis — paste any repo, ask any question
        </p>
      </div>

      {/* Health banner */}
      {!loading && health && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-3 ${
          health.services.llm && health.services.chromadb
            ? 'bg-green-950/40 border-green-800 text-green-300'
            : 'bg-yellow-950/40 border-yellow-800 text-yellow-300'
        }`}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            health.services.llm && health.services.chromadb ? 'bg-green-400' : 'bg-yellow-400'
          }`} />
          <span>
            LLM ({health.llm_provider === 'groq' ? 'Groq' : 'Ollama'}): <strong>{health.services.llm ? 'online' : 'offline'}</strong>
            {' · '}
            ChromaDB: <strong>{health.services.chromadb ? 'online' : 'offline'}</strong>
          </span>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <KPICard key={card.title} {...card} />
        ))}
      </div>

      {/* Quick start + Architecture */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ArchitectureViewer />
        </div>

        <div className="xl:col-span-1 space-y-4">
          {/* Quick start */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-slate-100 font-semibold text-base mb-3">Quick Start</h2>
            <p className="text-slate-400 text-sm mb-4">
              Paste a GitHub repo URL to index it, then chat with the AI to understand the codebase.
            </p>
            <Link href="/explore">
              <button className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" />
                Analyze a Repository
              </button>
            </Link>
          </div>

          {/* Indexed repos */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-slate-100 font-semibold text-base">Indexed Repos</h2>
              <span className="text-xs text-slate-500">{repos.length} total</span>
            </div>

            {repos.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">
                No repos indexed yet.{' '}
                <Link href="/explore" className="text-violet-400 hover:text-violet-300 underline">
                  Add one
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {repos.slice(0, 5).map((repo) => (
                  <div key={repo.repo_name} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="min-w-0">
                      <p className="text-slate-200 text-sm font-medium truncate">{repo.repo_name}</p>
                      <p className="text-slate-500 text-xs">{repo.chunk_count} chunks</p>
                    </div>
                    <Link href={`/chat?repo=${encodeURIComponent(repo.repo_name)}`}>
                      <button className="text-xs bg-violet-600/20 text-violet-400 border border-violet-800/50 hover:bg-violet-600/30 px-2.5 py-1 rounded-lg transition-colors ml-2 flex-shrink-0">
                        Chat
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-slate-100 font-semibold text-base mb-4">Recent Agent Activity</h2>
        <div className="space-y-3">
          {RECENT_ACTIVITY.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
            >
              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                item.status === 'success' ? 'bg-green-400' : 'bg-yellow-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm">{item.action}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-slate-500 text-xs">{item.time}</span>
                  <span className="text-slate-600 text-xs">·</span>
                  <span className="text-slate-500 text-xs font-mono">{item.repo}</span>
                  {item.tools.map((tool) => (
                    <span
                      key={tool}
                      className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
