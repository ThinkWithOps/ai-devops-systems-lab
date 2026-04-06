"use client";
import { DiagramResult } from "@/lib/api";
import { Brain, Server, Link2, Cloud } from "lucide-react";

interface InsightsPanelProps {
  result: DiagramResult | null;
}

export function InsightsPanel({ result }: InsightsPanelProps) {
  return (
    <aside className="w-72 shrink-0 flex flex-col gap-4">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={14} className="text-accent" />
          <h3 className="text-sm font-semibold text-white">AI Summary</h3>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          {result?.ai_summary || "Generate a diagram to see AI-powered architecture insights here."}
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Server size={14} className="text-success" />
          <h3 className="text-sm font-semibold text-white">Resources</h3>
        </div>
        {result ? (
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto scrollbar-thin">
            {result.resources.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted font-mono truncate max-w-40">{r.resource_name}</span>
                <span className="text-white/60 text-right shrink-0 ml-2">{r.resource_type.split("_").slice(1, 3).join("_")}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted">No resources parsed yet.</p>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Link2 size={14} className="text-warning" />
          <h3 className="text-sm font-semibold text-white">Connections</h3>
        </div>
        <p className="text-2xl font-bold text-white">{result?.connection_count ?? 0}</p>
        <p className="text-xs text-muted mt-1">cross-resource references detected</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cloud size={14} className="text-azure" />
          <h3 className="text-sm font-semibold text-white">Providers</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {result?.providers.map((p) => (
            <span key={p} className="text-xs px-2 py-0.5 bg-base rounded-full text-muted border border-border">
              {p.toUpperCase()}
            </span>
          )) || <span className="text-xs text-muted">None</span>}
        </div>
      </div>
    </aside>
  );
}
