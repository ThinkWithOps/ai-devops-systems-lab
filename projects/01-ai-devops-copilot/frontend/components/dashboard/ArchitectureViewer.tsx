'use client';

import { Monitor, Server, Brain, Database, Cloud, ArrowRight, ArrowDown } from 'lucide-react';

interface ComponentBox {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  colorClass: string;
  port?: string;
}

const FRONTEND: ComponentBox = {
  id: 'frontend',
  label: 'Next.js Frontend',
  sublabel: 'React 18 + Tailwind CSS',
  icon: <Monitor className="w-5 h-5" />,
  colorClass: 'bg-blue-950/70 border-blue-700 text-blue-300',
  port: ':3000',
};

const BACKEND: ComponentBox = {
  id: 'backend',
  label: 'FastAPI Backend',
  sublabel: 'Python 3.11 + SSE',
  icon: <Server className="w-5 h-5" />,
  colorClass: 'bg-green-950/70 border-green-700 text-green-300',
  port: ':8000',
};

const AGENT: ComponentBox = {
  id: 'agent',
  label: 'LangChain Agent',
  sublabel: 'Tool-Calling Agent',
  icon: <Brain className="w-5 h-5" />,
  colorClass: 'bg-purple-950/70 border-purple-700 text-purple-300',
};

const OLLAMA: ComponentBox = {
  id: 'ollama',
  label: 'Groq / llama-3.1',
  sublabel: 'Cloud LLM (Ollama fallback)',
  icon: <Brain className="w-5 h-5" />,
  colorClass: 'bg-purple-950/50 border-purple-800 text-purple-400',
};

const CHROMADB: ComponentBox = {
  id: 'chromadb',
  label: 'ChromaDB',
  sublabel: 'Vector store',
  icon: <Database className="w-5 h-5" />,
  colorClass: 'bg-orange-950/70 border-orange-700 text-orange-300',
  port: ':8001',
};

const RESTAURANT: ComponentBox = {
  id: 'restaurant',
  label: 'Restaurant API',
  sublabel: 'Bella Roma (live)',
  icon: <Cloud className="w-5 h-5" />,
  colorClass: 'bg-slate-800/70 border-slate-600 text-slate-300',
  port: ':8010',
};

function Box({ box }: { box: ComponentBox }) {
  return (
    <div className={`arch-box border ${box.colorClass} flex flex-col items-center gap-1.5 min-w-[130px]`}>
      <div className="opacity-80">{box.icon}</div>
      <div className="text-center">
        <div className="font-semibold text-xs">{box.label}</div>
        <div className="text-xs opacity-60 mt-0.5">{box.sublabel}</div>
        {box.port && (
          <div className="text-xs opacity-50 font-mono mt-0.5">{box.port}</div>
        )}
      </div>
    </div>
  );
}

function HArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-1">
      <ArrowRight className="w-4 h-4 text-slate-600" />
      {label && <span className="text-slate-600 text-xs whitespace-nowrap">{label}</span>}
    </div>
  );
}

function VArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <ArrowDown className="w-4 h-4 text-slate-600" />
      {label && <span className="text-slate-600 text-xs">{label}</span>}
    </div>
  );
}

export default function ArchitectureViewer() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-slate-100 font-semibold text-base">System Architecture</h2>
        <span className="text-xs text-slate-500 bg-slate-800 border border-slate-700 px-2 py-1 rounded">
          AI DevOps Copilot v0.1
        </span>
      </div>

      {/* Main horizontal flow: Browser -> Frontend -> Backend */}
      <div className="flex flex-col items-center gap-2">

        {/* Top row: user -> frontend -> backend */}
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <div className="arch-box border bg-slate-800/50 border-slate-600 text-slate-300 flex flex-col items-center gap-1.5 min-w-[110px]">
            <Monitor className="w-5 h-5 opacity-60" />
            <div className="text-center">
              <div className="font-semibold text-xs">Browser</div>
              <div className="text-xs opacity-60 mt-0.5">User</div>
            </div>
          </div>

          <HArrow label="HTTP/SSE" />
          <Box box={FRONTEND} />
          <HArrow label="/api/*" />
          <Box box={BACKEND} />
        </div>

        <VArrow label="invokes" />

        {/* Middle: Agent */}
        <Box box={AGENT} />

        <VArrow label="LLM calls + tools" />

        {/* Bottom row: tools */}
        <div className="flex items-start justify-center gap-4 flex-wrap">
          <Box box={OLLAMA} />
          <Box box={CHROMADB} />
          <Box box={RESTAURANT} />
        </div>

        {/* Tool labels */}
        <div className="flex items-center justify-center gap-4 flex-wrap mt-1">
          {[
            { color: 'text-purple-500', label: 'LLM reasoning' },
            { color: 'text-orange-500', label: 'Vector search (RAG)' },
            { color: 'text-slate-400', label: 'Live failure monitoring' },
          ].map((item) => (
            <span key={item.label} className={`text-xs ${item.color} flex items-center gap-1`}>
              <span>↑</span>
              <span>{item.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-800 flex-wrap justify-center">
        {[
          { color: 'bg-blue-700', label: 'Frontend' },
          { color: 'bg-green-700', label: 'Backend' },
          { color: 'bg-purple-700', label: 'AI / LLM' },
          { color: 'bg-orange-700', label: 'Infrastructure' },
          { color: 'bg-slate-600', label: 'External' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className={`w-3 h-3 rounded ${item.color}`} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
