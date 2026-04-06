'use client';

import { useEffect, useState } from 'react';
import { Bot, Activity, Database, Clock } from 'lucide-react';
import KPICard from '@/components/dashboard/KPICard';
import ArchitectureViewer from '@/components/dashboard/ArchitectureViewer';
import InsightsPanel from '@/components/dashboard/InsightsPanel';
import { getHealth } from '@/lib/api';

interface HealthStatus {
  status: string;
  llm_provider: string;
  services: {
    llm: boolean;
    chromadb: boolean;
  };
}

const RECENT_ACTIVITY = [
  { id: 1, time: '2 min ago', agent: 'copilot', action: 'Diagnosed OOMKilled pod in production', status: 'success', tools: ['log_search', 'devops_docs'] },
  { id: 2, time: '8 min ago', agent: 'copilot', action: 'Analyzed failed GitHub Actions workflow #246', status: 'success', tools: ['github_search'] },
  { id: 3, time: '15 min ago', agent: 'copilot', action: 'Investigated nginx 502 errors correlation', status: 'success', tools: ['log_search', 'devops_docs'] },
  { id: 4, time: '32 min ago', agent: 'copilot', action: 'Reviewed PR #143 security implications', status: 'success', tools: ['github_search'] },
  { id: 5, time: '1 hr ago', agent: 'copilot', action: 'Checked Redis cluster failover status', status: 'warning', tools: ['log_search'] },
];

const SAMPLE_INSIGHTS = {
  title: 'System Health Summary',
  summary: 'Production environment is experiencing elevated error rates in the API gateway. OOMKilled events correlate with peak traffic (13:00-15:00 UTC). Two open critical issues require immediate attention.',
  findings: [
    'api-gateway pod restart count: 4 in last 2 hours (OOMKilled)',
    'nginx 502 rate: 0.3% on /api/v2/orders endpoint',
    'PostgreSQL connection pool near exhaustion (47/50 connections)',
    'GitHub Actions workflow failure on feature/auth-refactor branch',
  ],
  risks: [
    'Memory limit (512Mi) insufficient for current traffic load',
    'Database connection exhaustion may cascade to full outage',
    'SSL certificate expires in 14 days — renewal not scheduled',
  ],
  nextSteps: [
    'Increase api-gateway memory limit to 1Gi or implement HPA',
    'Review DB connection pooling config (consider PgBouncer)',
    'Schedule SSL certificate renewal via cert-manager',
    'Investigate auth-refactor branch test failures',
  ],
};

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));
  }, []);

  const kpiCards = [
    {
      title: 'Active Agents',
      value: '1',
      delta: 'Online',
      deltaType: 'up' as const,
      icon: Bot,
      color: 'blue',
    },
    {
      title: 'Queries Today',
      value: '47',
      delta: '+12 from yesterday',
      deltaType: 'up' as const,
      icon: Activity,
      color: 'green',
    },
    {
      title: 'Docs Indexed',
      value: health?.services?.chromadb ? '3 docs' : '0 docs',
      delta: health?.services?.chromadb ? 'ChromaDB online' : 'ChromaDB offline',
      deltaType: health?.services?.chromadb ? ('up' as const) : ('down' as const),
      icon: Database,
      color: 'purple',
    },
    {
      title: 'Avg Response',
      value: '4.2s',
      delta: '-0.8s from avg',
      deltaType: 'up' as const,
      icon: Clock,
      color: 'orange',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          AI-powered DevOps insights and system health overview
        </p>
      </div>

      {/* Health banner */}
      {!loading && health && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-3 ${
          health.services.llm && health.services.chromadb
            ? 'bg-green-950/40 border-green-800 text-green-300'
            : 'bg-yellow-950/40 border-yellow-800 text-yellow-300'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            health.services.llm && health.services.chromadb ? 'bg-green-400' : 'bg-yellow-400'
          }`} />
          <span>
            {health.llm_provider === 'groq' ? 'Groq' : 'Ollama'}: <strong>{health.services.llm ? 'online' : 'offline'}</strong>
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

      {/* Main content: Architecture + Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ArchitectureViewer />
        </div>
        <div className="xl:col-span-1">
          <InsightsPanel {...SAMPLE_INSIGHTS} />
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
