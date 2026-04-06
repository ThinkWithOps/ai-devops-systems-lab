'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { searchLogs } from '@/lib/api';

interface LogEntry {
  timestamp: string;
  severity: 'ERROR' | 'WARN' | 'INFO';
  service: string;
  message: string;
  source?: string;
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  ERROR: {
    bg: 'bg-red-950/40 border-red-900/50',
    text: 'text-red-300',
    icon: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
  },
  WARN: {
    bg: 'bg-yellow-950/40 border-yellow-900/50',
    text: 'text-yellow-300',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />,
  },
  INFO: {
    bg: '',
    text: 'text-blue-300',
    icon: <Info className="w-3.5 h-3.5 text-blue-400" />,
  },
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [query, setQuery] = useState('recent');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchLogs = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await searchLogs(q, 100);
      const raw = data.logs || [];
      setLogs(raw.map((l: { timestamp: string; severity: string; service: string; message: string; source?: string }) => ({
        ...l,
        severity: (['ERROR', 'WARN', 'INFO'].includes(l.severity) ? l.severity : 'INFO') as LogEntry['severity'],
      })));
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(query);
  }, [query, fetchLogs]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLogs(query);
    }, 5000);
    return () => clearInterval(interval);
  }, [query, fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(inputValue || 'recent');
  };

  const filtered = logs.filter((log) => {
    if (severityFilter === 'all') return true;
    return log.severity === severityFilter;
  });

  const counts = {
    ERROR: logs.filter((l) => l.severity === 'ERROR').length,
    WARN: logs.filter((l) => l.severity === 'WARN').length,
    INFO: logs.filter((l) => l.severity === 'INFO').length,
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Log Viewer</h1>
          <p className="text-slate-400 text-sm mt-1">
            Search and monitor application & infrastructure logs
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search logs (e.g., 'OOMKilled', 'nginx error', '502')"
            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Search
        </button>
      </form>

      {/* Severity filters */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-sm">Filter:</span>
        {['all', 'ERROR', 'WARN', 'INFO'].map((sev) => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              severityFilter === sev
                ? sev === 'ERROR'
                  ? 'bg-red-900/70 border-red-700 text-red-200'
                  : sev === 'WARN'
                  ? 'bg-yellow-900/70 border-yellow-700 text-yellow-200'
                  : sev === 'INFO'
                  ? 'bg-blue-900/70 border-blue-700 text-blue-200'
                  : 'bg-slate-700 border-slate-600 text-slate-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            {sev === 'all' ? 'All' : sev}{' '}
            {sev !== 'all' && (
              <span className="ml-1 opacity-70">{counts[sev as keyof typeof counts]}</span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">{filtered.length} entries</span>
      </div>

      {/* Log table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide w-40">Timestamp</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide w-20">Level</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide w-32">Service</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-500">
                    No log entries found for &ldquo;{query}&rdquo;
                  </td>
                </tr>
              )}
              {filtered.map((log, idx) => {
                const style = SEVERITY_STYLES[log.severity] || SEVERITY_STYLES.INFO;
                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-800/40 transition-colors ${log.severity === 'ERROR' ? 'bg-red-950/20' : ''}`}
                  >
                    <td className="px-4 py-2.5 text-slate-500 text-xs font-mono whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${style.text}`}>
                        {style.icon}
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 text-xs font-mono">{log.service}</td>
                    <td className="px-4 py-2.5 text-slate-300 text-xs">{log.message}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
