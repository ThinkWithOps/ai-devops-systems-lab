'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Wrench, Clock, Filter } from 'lucide-react';

interface ToolCall {
  tool: string;
  input: string;
  output: string;
  durationMs: number;
}

interface AgentRun {
  id: string;
  query: string;
  status: 'success' | 'failure' | 'running';
  startedAt: string;
  durationMs: number;
  toolCalls: ToolCall[];
  finalAnswer: string;
}

const MOCK_RUNS: AgentRun[] = [
  {
    id: 'run-001',
    query: 'Why is the api-gateway pod being OOMKilled in production?',
    status: 'success',
    startedAt: '2024-03-15T10:01:00Z',
    durationMs: 8420,
    toolCalls: [
      { tool: 'log_search', input: 'OOMKilled api-gateway', output: '[ERROR] OOMKilled: Container exceeded 512Mi limit (restart count: 4)', durationMs: 340 },
      { tool: 'devops_docs', input: 'OOMKilled troubleshooting kubernetes', output: 'OOMKilled: Container exceeded memory limit. Check kubectl top pod, increase limits or use HPA.', durationMs: 210 },
    ],
    finalAnswer: 'The api-gateway container is exceeding its 512Mi memory limit during peak traffic (13-15 UTC). Recommend increasing memory limit to 1Gi and implementing HPA for auto-scaling.',
  },
  {
    id: 'run-002',
    query: 'What caused the GitHub Actions workflow failure on PR #142?',
    status: 'success',
    startedAt: '2024-03-15T09:45:00Z',
    durationMs: 5180,
    toolCalls: [
      { tool: 'github_search', input: '{"action": "workflows", "repo": "acme-corp/api-gateway"}', output: 'Run #246: CI/CD Pipeline [failure] branch=feature/auth-refactor event=pull_request', durationMs: 890 },
      { tool: 'github_search', input: '{"action": "prs", "repo": "acme-corp/api-gateway"}', output: 'PR #142: fix: resolve race condition in request queue [open] unmergeable', durationMs: 410 },
    ],
    finalAnswer: 'Workflow run #246 failed on the feature/auth-refactor branch. The PR has merge conflicts (mergeable: false) which likely caused checkout step to fail. Resolve conflicts and re-run.',
  },
  {
    id: 'run-003',
    query: 'Are there any database connection issues in the logs?',
    status: 'success',
    startedAt: '2024-03-15T09:30:00Z',
    durationMs: 4720,
    toolCalls: [
      { tool: 'log_search', input: 'database connection postgres error', output: '[ERROR] FATAL: remaining connection slots reserved for superuser. [WARN] slow query: 3842ms', durationMs: 280 },
      { tool: 'devops_docs', input: 'postgres connection pool exhausted', output: 'Consider PgBouncer for connection pooling. max_connections default is 100.', durationMs: 190 },
    ],
    finalAnswer: 'PostgreSQL is near connection exhaustion. The connection pool is at 47/50 connections. Recommend deploying PgBouncer in transaction mode and reducing application pool size.',
  },
  {
    id: 'run-004',
    query: 'Check the status of recent deployments',
    status: 'failure',
    startedAt: '2024-03-15T09:00:00Z',
    durationMs: 12000,
    toolCalls: [
      { tool: 'github_search', input: '{"action": "workflows"}', output: 'Error: repo field required for workflows action', durationMs: 150 },
    ],
    finalAnswer: 'Agent failed to retrieve deployment status — repo name not specified. Please provide the repository name to search workflow runs.',
  },
  {
    id: 'run-005',
    query: 'Show me all open high-priority issues',
    status: 'success',
    startedAt: '2024-03-15T08:30:00Z',
    durationMs: 3910,
    toolCalls: [
      { tool: 'github_search', input: '{"action": "issues", "repo": "acme-corp/api-gateway"}', output: 'Issue #88: API Gateway OOMKilled [high-priority, production]. Issue #87: nginx 502 errors [investigation].', durationMs: 620 },
    ],
    finalAnswer: 'Found 2 open high-priority issues: #88 OOMKilled (assigned to alice-dev, bob-sre) and #87 nginx 502 errors (assigned to carol-devops). Both require immediate attention.',
  },
];

const TOOL_COLORS: Record<string, string> = {
  log_search: 'bg-purple-900/50 text-purple-300 border-purple-800',
  github_search: 'bg-blue-900/50 text-blue-300 border-blue-800',
  devops_docs: 'bg-green-900/50 text-green-300 border-green-800',
};

export default function AgentsPage() {
  const [timeFilter, setTimeFilter] = useState<'1h' | '24h' | '7d'>('24h');
  const [toolFilter, setToolFilter] = useState<string>('all');
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const filteredRuns = MOCK_RUNS.filter((run) => {
    if (toolFilter === 'all') return true;
    return run.toolCalls.some((tc) => tc.tool === toolFilter);
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Agent Activity</h1>
        <p className="text-slate-400 text-sm mt-1">
          Full history of AI agent runs, tool calls, and outcomes
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-1">
          {(['1h', '24h', '7d'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                timeFilter === t
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={toolFilter}
            onChange={(e) => setToolFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5"
          >
            <option value="all">All tools</option>
            <option value="log_search">log_search</option>
            <option value="github_search">github_search</option>
            <option value="devops_docs">devops_docs</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-slate-500">
          {filteredRuns.length} runs shown
        </div>
      </div>

      {/* Run timeline */}
      <div className="space-y-3">
        {filteredRuns.map((run) => (
          <div
            key={run.id}
            className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
          >
            <button
              className="w-full text-left p-4 hover:bg-slate-800/50 transition-colors"
              onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
            >
              <div className="flex items-start gap-3">
                {run.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                ) : run.status === 'failure' ? (
                  <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium truncate">{run.query}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-slate-500 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(run.startedAt).toLocaleTimeString()}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {(run.durationMs / 1000).toFixed(1)}s
                    </span>
                    {run.toolCalls.map((tc, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-0.5 rounded border ${TOOL_COLORS[tc.tool] || 'bg-slate-700 text-slate-300 border-slate-600'}`}
                      >
                        {tc.tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>

            {expandedRun === run.id && (
              <div className="border-t border-slate-800 p-4 space-y-4">
                {/* Tool calls */}
                <div>
                  <h3 className="text-slate-400 text-xs uppercase tracking-wide mb-2">Tool Calls</h3>
                  <div className="space-y-2">
                    {run.toolCalls.map((tc, i) => (
                      <div key={i} className="bg-slate-800/60 rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`px-2 py-0.5 rounded border ${TOOL_COLORS[tc.tool] || ''}`}>
                            <Wrench className="w-3 h-3 inline mr-1" />
                            {tc.tool}
                          </span>
                          <span className="text-slate-500">{tc.durationMs}ms</span>
                        </div>
                        <p className="text-slate-400 mt-1"><span className="text-slate-500">Input:</span> {tc.input}</p>
                        <p className="text-slate-300 mt-1"><span className="text-slate-500">Output:</span> {tc.output}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final answer */}
                <div>
                  <h3 className="text-slate-400 text-xs uppercase tracking-wide mb-2">Final Answer</h3>
                  <p className="text-slate-300 text-sm bg-slate-800/60 rounded-lg p-3">{run.finalAnswer}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
