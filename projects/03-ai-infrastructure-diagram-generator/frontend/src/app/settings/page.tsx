"use client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LogStrip } from "@/components/ui/LogStrip";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base text-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings size={18} className="text-accent" />
              <h2 className="text-lg font-bold text-white">Settings</h2>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4 max-w-lg">
              {[
                { label: "Ollama Base URL", value: "http://localhost:11434", hint: "Default Ollama endpoint" },
                { label: "Ollama Model", value: "llama3", hint: "Model used for AI summary generation" },
                { label: "Backend API URL", value: "http://localhost:8000", hint: "FastAPI backend address" },
              ].map(({ label, value, hint }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</label>
                  <input
                    defaultValue={value}
                    className="bg-base border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                  />
                  <p className="text-xs text-muted">{hint}</p>
                </div>
              ))}
              <button className="bg-accent hover:bg-accent-dim text-white text-sm font-semibold py-2 rounded-lg transition-colors mt-2">
                Save Settings
              </button>
            </div>
          </div>
          <LogStrip steps={[]} />
        </main>
      </div>
    </div>
  );
}
