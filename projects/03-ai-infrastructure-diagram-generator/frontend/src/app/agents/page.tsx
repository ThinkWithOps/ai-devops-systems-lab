"use client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LogStrip } from "@/components/ui/LogStrip";
import { Bot, Cpu, Search, Paintbrush, Brain, Database } from "lucide-react";

const PIPELINE = [
  { icon: Cpu, label: "HCL Parser", description: "Parses Terraform HCL using python-hcl2. Falls back to regex for malformed inputs.", color: "text-warning" },
  { icon: Search, label: "Connection Inferencer", description: "Walks parsed attributes to detect cross-resource references and build a dependency graph.", color: "text-success" },
  { icon: Paintbrush, label: "Diagram Renderer", description: "Converts the resource graph to Graphviz DOT (PNG) or Mermaid flowchart syntax.", color: "text-accent" },
  { icon: Brain, label: "LLM Summarizer", description: "Sends resource list + title to Ollama (llama3) to generate a human-readable architecture summary.", color: "text-azure" },
  { icon: Database, label: "ChromaDB Persister", description: "Stores diagram metadata and AI summary as a vector document for search and history.", color: "text-gcp" },
];

export default function AgentsPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base text-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-6">
              <Bot size={18} className="text-accent" />
              <h2 className="text-lg font-bold text-white">Agent Pipeline</h2>
            </div>
            <div className="flex flex-col gap-4">
              {PIPELINE.map((stage, i) => (
                <div key={i} className="bg-card border border-border rounded-xl px-5 py-4 flex items-start gap-4">
                  <div className="p-2 bg-base rounded-lg border border-border shrink-0">
                    <stage.icon size={18} className={stage.color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted font-mono">Step {i + 1}</span>
                    </div>
                    <p className="text-sm font-semibold text-white">{stage.label}</p>
                    <p className="text-xs text-muted mt-1">{stage.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <LogStrip steps={[]} />
        </main>
      </div>
    </div>
  );
}
