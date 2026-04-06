'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Search } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  severity: string;
  service: string;
  message: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  ERROR: 'bg-red-900/50 text-red-300 border border-red-800',
  WARN: 'bg-yellow-900/50 text-yellow-300 border border-yellow-800',
  INFO: 'bg-blue-900/50 text-blue-300 border border-blue-800',
  DEBUG: 'bg-slate-700 text-slate-300 border border-slate-600',
};

const SAMPLE_LOGS: LogEntry[] = [
  { timestamp: new Date(Date.now() - 1000 * 60 * 0.5).toISOString(), severity: 'INFO', service: 'ingestion', message: 'Repository tiangolo/fastapi indexed: 342 chunks in 18.2s' },
  { timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(), severity: 'INFO', service: 'chromadb', message: 'Upserted 342 chunks to collection "github_repos" in 4.1s' },
  { timestamp: new Date(Date.now() - 1000 * 60 * 1.5).toISOString(), severity: 'INFO', service: 'embeddings', message: 'Encoded 342 chunks with all-MiniLM-L6-v2 in 6.8s' },
  { timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(), severity: 'INFO', service: 'ingestion', message: 'Fetched 48/50 files from tiangolo/fastapi (2 binary files skipped)' },
  { timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(), severity: 'WARN', service: 'github-api', message: 'File skipped (too large): tests/test_applications.py (62KB > 50KB limit)' },
  { timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(), severity: 'INFO', service: 'github-api', message: 'Fetched repo tree: 284 files found, 48 selected for indexing' },
  { timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), severity: 'INFO', service: 'github-api', message: 'Fetched metadata: tiangolo/fastapi (71.2k stars, Python)' },
  { timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(), severity: 'INFO', service: 'agent', message: 'RepoAgent query: "How is routing implemented?" → 1 tool call, 1.2s' },
  { timestamp: new Date(Date.now() - 1000 * 60 * 8.5).toISOString(), severity: 'INFO', service: 'search_repo', message: 'ChromaDB query: "router routing APIRouter" → 5 results in 38ms' },
  { timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(), severity: 'INFO', service: 'agent', message: 'RepoAgent query: "What does this repo do?" → 2 tool calls, 1.8s' },
  { timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), severity: 'INFO', service: 'health', message: 'Health check: LLM=online (groq), ChromaDB=online' },
  { timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), severity: 'WARN', service: 'github-api', message: 'Rate limit warning: 45/60 unauthenticated requests used. Set GITHUB_TOKEN.' },
  { timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), severity: 'INFO', service: 'chromadb', message: 'Connected to ChromaDB at chromadb:8000 (HttpClient)' },
  { timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), severity: 'INFO', service: 'startup', message: 'AI GitHub Repo Explainer API starting up on port 8000' },
  { timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(), severity: 'INFO', service: 'embeddings', message: 'Loaded sentence-transformers all-MiniLM-L6-v2 (384 dimensions)' },
];

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(SAMPLE_LOGS);
  const [filter, setFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const filteredLogs = logs.filter((log) => {
    const matchesSeverity = severityFilter === 'ALL' || log.severity === severityFilter;
    const matchesText =
      !filter ||
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      log.service.toLowerCase().includes(filter.toLowerCase());
    return matchesSeverity && matchesText;
  });

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto flex-1">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">System Logs</h1>
        <p className="text-slate-400 text-sm mt-1">
          Ingestion pipeline, agent activity, and service health logs
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search logs..."
            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg pl-10 pr-4 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-violet-600"
          />
        </div>

        <div className="flex gap-2">
          {['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                severityFilter === sev
                  ? 'bg-violet-600/20 text-violet-300 border-violet-700'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <button
          onClick={() => setLogs([...SAMPLE_LOGS])}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Log table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-slate-300 font-medium text-sm">Log Stream</span>
          <span className="text-xs text-slate-500">{filteredLogs.length} entries</span>
        </div>

        <div className="divide-y divide-slate-800 max-h-[calc(100vh-20rem)] overflow-y-auto">
          {filteredLogs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors">
              <span className="text-xs text-slate-600 font-mono whitespace-nowrap mt-0.5 min-w-[72px]">
                {formatTime(log.timestamp)}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                SEVERITY_COLORS[log.severity] || SEVERITY_COLORS.DEBUG
              }`}>
                {log.severity}
              </span>
              <span className="text-xs text-violet-400 font-mono flex-shrink-0 min-w-[90px]">
                {log.service}
              </span>
              <span className="text-xs text-slate-300 font-mono leading-relaxed">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
