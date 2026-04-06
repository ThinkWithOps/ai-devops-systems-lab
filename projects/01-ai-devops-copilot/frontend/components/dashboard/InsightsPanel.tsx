'use client';

import { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, ArrowRight, Lightbulb } from 'lucide-react';

interface InsightsPanelProps {
  title?: string;
  summary?: string;
  findings?: string[];
  risks?: string[];
  nextSteps?: string[];
}

export default function InsightsPanel({
  title = 'AI Insights',
  summary,
  findings = [],
  risks = [],
  nextSteps = [],
}: InsightsPanelProps) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate refresh
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
  };

  const isEmpty = !summary && findings.length === 0 && risks.length === 0 && nextSteps.length === 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <h2 className="text-slate-100 font-semibold text-sm">{title}</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <Lightbulb className="w-8 h-8 text-slate-700 mb-3" />
          <p className="text-slate-500 text-sm">No insights available yet.</p>
          <p className="text-slate-600 text-xs mt-1">Ask the copilot a question to generate insights.</p>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Summary */}
          {summary && (
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="text-slate-300 text-xs leading-relaxed">{summary}</p>
            </div>
          )}

          {/* Findings */}
          {findings.length > 0 && (
            <div>
              <h3 className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                Key Findings
              </h3>
              <ul className="space-y-1.5">
                {findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risks */}
          {risks.length > 0 && (
            <div>
              <h3 className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                Risks
              </h3>
              <ul className="space-y-1.5">
                {risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-red-300">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          {nextSteps.length > 0 && (
            <div>
              <h3 className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-2 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-green-400" />
                Next Steps
              </h3>
              <ul className="space-y-1.5">
                {nextSteps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-green-300">
                    <span className="w-4 h-4 rounded-full bg-green-900/50 border border-green-800 text-green-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
