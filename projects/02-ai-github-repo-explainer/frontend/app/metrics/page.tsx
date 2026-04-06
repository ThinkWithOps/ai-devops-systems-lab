'use client';

import { Database, MessageSquare, Clock, TrendingUp } from 'lucide-react';
import MetricsChart from '@/components/dashboard/MetricsChart';
import KPICard from '@/components/dashboard/KPICard';

const DAILY_QUERIES = [
  { name: 'Mon', queries: 8 },
  { name: 'Tue', queries: 15 },
  { name: 'Wed', queries: 22 },
  { name: 'Thu', queries: 12 },
  { name: 'Fri', queries: 31 },
  { name: 'Sat', queries: 9 },
  { name: 'Sun', queries: 14 },
];

const REPOS_OVER_TIME = [
  { name: 'Week 1', repos: 1 },
  { name: 'Week 2', repos: 3 },
  { name: 'Week 3', repos: 5 },
  { name: 'Week 4', repos: 8 },
  { name: 'Week 5', repos: 11 },
  { name: 'Week 6', repos: 14 },
];

const RESPONSE_TIMES = [
  { name: '08:00', time: 1.8 },
  { name: '10:00', time: 2.1 },
  { name: '12:00', time: 2.4 },
  { name: '14:00', time: 1.9 },
  { name: '16:00', time: 2.3 },
  { name: '18:00', time: 2.0 },
  { name: '20:00', time: 1.7 },
];

const TOOL_USAGE = [
  { name: 'search_repo', calls: 89 },
  { name: 'get_repo_metadata', calls: 34 },
];

const kpis = [
  {
    title: 'Total Queries',
    value: '111',
    delta: '+31 this week',
    deltaType: 'up' as const,
    icon: MessageSquare,
    color: 'violet',
  },
  {
    title: 'Repos Indexed',
    value: '14',
    delta: '+3 this week',
    deltaType: 'up' as const,
    icon: Database,
    color: 'orange',
  },
  {
    title: 'Avg Response Time',
    value: '2.0s',
    delta: '-0.4s vs last week',
    deltaType: 'up' as const,
    icon: Clock,
    color: 'green',
  },
  {
    title: 'Tool Call Rate',
    value: '1.1x',
    delta: 'Per query average',
    deltaType: 'neutral' as const,
    icon: TrendingUp,
    color: 'blue',
  },
];

export default function MetricsPage() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto flex-1">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Metrics</h1>
        <p className="text-slate-400 text-sm mt-1">
          Usage statistics, performance data, and system health trends
        </p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} />
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsChart
          title="Daily Query Volume"
          type="bar"
          data={DAILY_QUERIES}
          dataKey="queries"
          xKey="name"
          color="#7c3aed"
        />
        <MetricsChart
          title="Repositories Indexed Over Time"
          type="line"
          data={REPOS_OVER_TIME}
          dataKey="repos"
          xKey="name"
          color="#f97316"
        />
        <MetricsChart
          title="Average Response Time (seconds)"
          type="line"
          data={RESPONSE_TIMES}
          dataKey="time"
          xKey="name"
          color="#22c55e"
          unit="s"
        />
        <MetricsChart
          title="Tool Call Volume"
          type="bar"
          data={TOOL_USAGE}
          dataKey="calls"
          xKey="name"
          color="#3b82f6"
        />
      </div>

      {/* Summary table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-slate-200 font-semibold text-base mb-4">Tool Performance Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-2 px-3 text-xs text-slate-500 uppercase tracking-wide font-medium">Tool</th>
                <th className="text-left py-2 px-3 text-xs text-slate-500 uppercase tracking-wide font-medium">Total Calls</th>
                <th className="text-left py-2 px-3 text-xs text-slate-500 uppercase tracking-wide font-medium">Avg Latency</th>
                <th className="text-left py-2 px-3 text-xs text-slate-500 uppercase tracking-wide font-medium">Success Rate</th>
                <th className="text-left py-2 px-3 text-xs text-slate-500 uppercase tracking-wide font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[
                { tool: 'search_repo', calls: 89, latency: '40ms', success: '99.1%', desc: 'ChromaDB cosine similarity search' },
                { tool: 'get_repo_metadata', calls: 34, latency: '210ms', success: '97.8%', desc: 'GitHub REST API metadata fetch' },
              ].map((row) => (
                <tr key={row.tool} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-mono text-violet-300 text-xs">{row.tool}</td>
                  <td className="py-3 px-3 text-slate-300">{row.calls}</td>
                  <td className="py-3 px-3 text-slate-300">{row.latency}</td>
                  <td className="py-3 px-3 text-green-400">{row.success}</td>
                  <td className="py-3 px-3 text-slate-500 text-xs">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
