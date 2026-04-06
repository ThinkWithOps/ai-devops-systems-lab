'use client';

import { useEffect, useState, useRef } from 'react';
import { searchLogs } from '@/lib/api';

interface LogEntry {
  timestamp: string;
  severity: string;
  service: string;
  message: string;
}

const SEVERITY_BADGE: Record<string, string> = {
  ERROR: 'bg-red-900/70 text-red-300 border border-red-800',
  WARN: 'bg-yellow-900/70 text-yellow-300 border border-yellow-800',
  INFO: 'bg-blue-900/70 text-blue-300 border border-blue-800',
};

// Fallback static logs for when API is unavailable
const FALLBACK_LOGS: LogEntry[] = [
  { timestamp: new Date().toISOString(), severity: 'ERROR', service: 'api-gateway', message: 'OOMKilled: Container exceeded 512Mi limit' },
  { timestamp: new Date().toISOString(), severity: 'WARN', service: 'postgres', message: 'Slow query detected: 3842ms on orders table' },
  { timestamp: new Date().toISOString(), severity: 'INFO', service: 'nginx', message: 'GET /api/v2/orders 200 45ms' },
  { timestamp: new Date().toISOString(), severity: 'ERROR', service: 'nginx', message: '502 Bad Gateway - upstream timeout after 30s' },
  { timestamp: new Date().toISOString(), severity: 'WARN', service: 'k8s-node', message: 'Memory pressure: 87% of 16Gi used on worker-3' },
  { timestamp: new Date().toISOString(), severity: 'INFO', service: 'github-actions', message: 'Workflow #247 completed successfully in 8m32s' },
];

export default function LiveLogStrip() {
  const [logs, setLogs] = useState<LogEntry[]>(FALLBACK_LOGS);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await searchLogs('recent', 15);
        if (data?.logs?.length > 0) {
          setLogs(data.logs);
        }
      } catch {
        // Keep showing fallback logs
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  // Duplicate logs for seamless scroll
  const displayLogs = [...logs, ...logs];

  return (
    <div className="h-8 bg-slate-900 border-t border-slate-800 flex items-center overflow-hidden flex-shrink-0">
      <div className="flex-shrink-0 px-3 border-r border-slate-700 h-full flex items-center">
        <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">Live</span>
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 ml-2 animate-pulse" />
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div
          ref={tickerRef}
          className="flex items-center gap-6 log-strip-scroll"
          style={{ width: 'max-content' }}
        >
          {displayLogs.map((log, idx) => (
            <div key={idx} className="flex items-center gap-2 whitespace-nowrap">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${SEVERITY_BADGE[log.severity] || SEVERITY_BADGE.INFO}`}>
                {log.severity}
              </span>
              <span className="text-xs text-slate-500 font-mono">{log.service}</span>
              <span className="text-xs text-slate-400 max-w-xs truncate">{log.message}</span>
              <span className="text-slate-700 text-xs">·</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
