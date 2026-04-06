"use client";
import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LogStrip } from "@/components/ui/LogStrip";
import { generateDiagramStream, AgentStep } from "@/lib/api";
import { ScrollText } from "lucide-react";
import { clsx } from "clsx";

export default function LogsPage() {
  const [steps, setSteps] = useState<AgentStep[]>([]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base text-white">
      <Header
        onGenerate={async () => {
          setSteps([]);
          await generateDiagramStream(
            `resource "aws_instance" "web" { ami = "ami-123" }`,
            "Test",
            "graphviz",
            (s) => setSteps((p) => [...p, s]),
          );
        }}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-4">
              <ScrollText size={18} className="text-accent" />
              <h2 className="text-lg font-bold text-white">Agent Event Log</h2>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 font-mono text-xs flex flex-col gap-1">
              {steps.filter((s) => s.step !== "__result__").length === 0 && (
                <span className="text-muted">No events yet. Trigger a generation to see logs.</span>
              )}
              {steps.filter((s) => s.step !== "__result__").map((s, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-muted shrink-0">{new Date(s.timestamp).toLocaleTimeString()}</span>
                  <span className={clsx(
                    s.status === "complete" ? "text-success" : s.status === "error" ? "text-danger" : "text-accent"
                  )}>
                    [{s.status.toUpperCase()}]
                  </span>
                  <span className="text-white/80">{s.step}</span>
                  {s.detail && <span className="text-muted truncate">{s.detail}</span>}
                </div>
              ))}
            </div>
          </div>
          <LogStrip steps={steps} />
        </main>
      </div>
    </div>
  );
}
