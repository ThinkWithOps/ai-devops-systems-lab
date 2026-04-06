'use client';

import MetricsChart from '@/components/dashboard/MetricsChart';

const QUERY_VOLUME_DATA = [
  { name: '00:00', value: 3 },
  { name: '02:00', value: 1 },
  { name: '04:00', value: 0 },
  { name: '06:00', value: 2 },
  { name: '08:00', value: 8 },
  { name: '10:00', value: 14 },
  { name: '12:00', value: 18 },
  { name: '14:00', value: 22 },
  { name: '16:00', value: 16 },
  { name: '18:00', value: 11 },
  { name: '20:00', value: 7 },
  { name: '22:00', value: 4 },
];

const RESPONSE_TIME_DATA = [
  { name: '< 1s', value: 12 },
  { name: '1-2s', value: 8 },
  { name: '2-4s', value: 15 },
  { name: '4-8s', value: 7 },
  { name: '8-15s', value: 3 },
  { name: '> 15s', value: 2 },
];

const TOOL_USAGE_DATA = [
  { name: 'log_search', value: 38 },
  { name: 'github_search', value: 29 },
  { name: 'devops_docs', value: 33 },
];

const ERROR_RATE_DATA = [
  { name: 'Mon', value: 2.1 },
  { name: 'Tue', value: 1.8 },
  { name: 'Wed', value: 3.2 },
  { name: 'Thu', value: 0.9 },
  { name: 'Fri', value: 1.5 },
  { name: 'Sat', value: 0.4 },
  { name: 'Sun', value: 0.7 },
];

const KPI_STATS = [
  { label: 'Total Queries (24h)', value: '47' },
  { label: 'Avg Response Time', value: '4.2s' },
  { label: 'Tool Call Success Rate', value: '94.7%' },
  { label: 'Tokens Generated', value: '128.4K' },
];

export default function MetricsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Metrics</h1>
        <p className="text-slate-400 text-sm mt-1">
          Agent performance, query volume, and tool usage analytics
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_STATS.map((stat) => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsChart
          title="Query Volume (24h)"
          data={QUERY_VOLUME_DATA}
          type="line"
          color="#3b82f6"
        />
        <MetricsChart
          title="Response Time Distribution (queries)"
          data={RESPONSE_TIME_DATA}
          type="bar"
          color="#8b5cf6"
        />
        <MetricsChart
          title="Tool Usage Breakdown (%)"
          data={TOOL_USAGE_DATA}
          type="donut"
          color="#22c55e"
        />
        <MetricsChart
          title="Agent Error Rate (% per day)"
          data={ERROR_RATE_DATA}
          type="line"
          color="#ef4444"
        />
      </div>
    </div>
  );
}
