"use client";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LogStrip } from "@/components/ui/LogStrip";
import { getHistory, DiagramHistoryItem } from "@/lib/api";
import { Network, Calendar, Layers } from "lucide-react";

export default function ResultsPage() {
  const [history, setHistory] = useState<DiagramHistoryItem[]>([]);

  useEffect(() => {
    getHistory().then(setHistory).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base text-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-white mb-4">Diagram History</h2>
            {history.length === 0 ? (
              <div className="text-muted text-sm text-center py-20">No diagrams generated yet.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {history.map((item) => (
                  <div key={item.diagram_id} className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-6">
                    <Network size={18} className="text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                      <p className="text-xs text-muted font-mono">{item.diagram_id}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <Layers size={12} /> {item.resource_count} resources
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {item.providers.map((p) => (
                        <span key={p} className="text-xs px-2 py-0.5 bg-base border border-border rounded-full text-muted">{p.toUpperCase()}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted shrink-0">
                      <Calendar size={12} /> {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <LogStrip steps={[]} />
        </main>
      </div>
    </div>
  );
}
