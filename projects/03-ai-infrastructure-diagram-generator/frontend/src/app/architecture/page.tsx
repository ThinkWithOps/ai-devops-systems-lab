"use client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LogStrip } from "@/components/ui/LogStrip";
import { Network } from "lucide-react";

const ARCH = `
┌─────────────────────────────────────────────────────────────────────────┐
│                    AI Infrastructure Diagram Generator                  │
│                         System Architecture                             │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐
  │   Next.js UI     │  ← User pastes Terraform HCL, selects style
  │  (Port 3000)     │
  └────────┬─────────┘
           │ POST /api/diagrams/generate/stream (NDJSON)
           ▼
  ┌──────────────────┐
  │  FastAPI Backend │  ← Validates request, spawns agent pipeline
  │  (Port 8000)     │
  └────────┬─────────┘
           │
    ┌──────┴───────────────────────────┐
    │         LangChain Agent          │
    │  ┌──────────────────────────┐    │
    │  │ 1. HCL Parser (hcl2)    │    │
    │  │ 2. Connection Inferencer│    │
    │  │ 3. Graphviz / Mermaid   │    │
    │  │ 4. Ollama LLM Summary   │    │
    │  │ 5. ChromaDB Persist     │    │
    │  └──────────────────────────┘    │
    └──────┬───────────────────────────┘
           │
    ┌──────┴───────────┐    ┌──────────────────┐
    │  Graphviz (PNG)  │    │  ChromaDB        │
    │  /output/*.png   │    │  (Port 8001)     │
    └──────────────────┘    └──────────────────┘
           │
    Served as static files via FastAPI
    Downloaded by frontend DiagramViewer
`;

export default function ArchitecturePage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base text-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-6">
              <Network size={18} className="text-accent" />
              <h2 className="text-lg font-bold text-white">System Architecture</h2>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <pre className="text-xs text-muted font-mono leading-relaxed whitespace-pre overflow-x-auto">
                {ARCH}
              </pre>
            </div>
          </div>
          <LogStrip steps={[]} />
        </main>
      </div>
    </div>
  );
}
