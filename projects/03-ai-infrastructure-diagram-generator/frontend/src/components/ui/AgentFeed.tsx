"use client";
import { clsx } from "clsx";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { AgentStep } from "@/lib/api";

interface AgentFeedProps {
  steps: AgentStep[];
}

export function AgentFeed({ steps }: AgentFeedProps) {
  if (steps.length === 0) {
    return (
      <div className="text-muted text-sm text-center py-8">
        Agent steps will appear here when you generate a diagram.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3 bg-base border border-border rounded-lg px-4 py-3">
          <div className="mt-0.5 shrink-0">
            {step.status === "complete" && <CheckCircle size={16} className="text-success" />}
            {step.status === "error" && <XCircle size={16} className="text-danger" />}
            {step.status === "running" && <Loader2 size={16} className="text-accent animate-spin" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={clsx(
              "text-sm font-medium",
              step.status === "complete" ? "text-white" : step.status === "error" ? "text-danger" : "text-accent",
            )}>
              {step.step}
            </p>
            {step.detail && step.step !== "__result__" && (
              <p className="text-xs text-muted mt-0.5 truncate">{step.detail}</p>
            )}
          </div>
          <span className="text-xs text-muted shrink-0">
            {new Date(step.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}
