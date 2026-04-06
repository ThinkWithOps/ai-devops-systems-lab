"use client";
import { AgentStep } from "@/lib/api";

interface LogStripProps {
  steps: AgentStep[];
}

export function LogStrip({ steps }: LogStripProps) {
  const latest = steps.filter((s) => s.step !== "__result__").slice(-1)[0];
  return (
    <div className="h-8 bg-base border-t border-border flex items-center px-4 gap-2 shrink-0">
      <div className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
      <span className="text-xs text-muted font-mono truncate">
        {latest
          ? `[${new Date(latest.timestamp).toLocaleTimeString()}] ${latest.step} — ${latest.detail || latest.status}`
          : "Waiting for agent activity..."}
      </span>
    </div>
  );
}
