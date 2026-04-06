'use client';

import { useEffect, useState } from 'react';
import { Bot, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { getHealth } from '@/lib/api';

export default function Header() {
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const h = await getHealth();
        setHealthy(h?.status === 'ok');
      } catch {
        setHealthy(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-4 flex-shrink-0 z-50">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-100 text-sm whitespace-nowrap">AI DevOps Copilot</span>
          <span className="bg-green-900/60 text-green-400 border border-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
            Local
          </span>
        </div>
      </div>

      {/* Center: Quick prompt */}
      <div className="flex-1 max-w-xl mx-auto">
        <Link href="/chat">
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-500 text-sm cursor-pointer hover:border-slate-600 hover:bg-slate-750 transition-colors flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>Ask the copilot anything about your infrastructure...</span>
          </div>
        </Link>
      </div>

      {/* Right: Health status + CTA */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div
            className={`w-2 h-2 rounded-full ${
              healthy === null
                ? 'bg-slate-600'
                : healthy
                ? 'bg-green-400 shadow-lg shadow-green-500/30'
                : 'bg-red-400 shadow-lg shadow-red-500/30'
            }`}
          />
          <span>{healthy === null ? 'Connecting...' : healthy ? 'All systems go' : 'Service issue'}</span>
        </div>

        <Link href="/chat">
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap">
            Ask Copilot
          </button>
        </Link>
      </div>
    </header>
  );
}
