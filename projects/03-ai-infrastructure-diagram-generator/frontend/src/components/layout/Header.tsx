"use client";
import { Network, Zap } from "lucide-react";

interface HeaderProps {
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export function Header({ onGenerate, isGenerating }: HeaderProps) {
  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <Network size={20} className="text-accent" />
        <span className="font-bold text-white text-base tracking-tight">
          AI Infra Diagram Generator
        </span>
        <span className="text-xs bg-accent/20 text-accent border border-accent/30 px-2 py-0.5 rounded-full">
          LOCAL
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-muted">Backend Online</span>
        </div>

        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-accent hover:bg-accent-dim disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Zap size={14} />
            {isGenerating ? "Generating..." : "Generate Diagram"}
          </button>
        )}
      </div>
    </header>
  );
}
