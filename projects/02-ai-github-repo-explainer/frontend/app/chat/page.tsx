'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatPanel from '@/components/dashboard/ChatPanel';
import AgentActivityFeed from '@/components/dashboard/AgentActivityFeed';

export interface AgentEvent {
  id: string;
  type: 'tool_call' | 'tool_result' | 'token' | 'done' | 'error';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const repoParam = searchParams.get('repo');
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);

  const handleAgentEvent = (event: AgentEvent) => {
    setAgentEvents((prev) => {
      const updated = [...prev, event];
      return updated.slice(-50);
    });
  };

  return (
    <div className="flex flex-1 min-h-0 gap-0">
      {/* Main chat panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatPanel
          onAgentEvent={handleAgentEvent}
          initialRepoName={repoParam}
        />
      </div>

      {/* Agent activity sidebar */}
      <div className="w-80 flex-shrink-0 border-l border-slate-800 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wide mb-3">
            Agent Activity
          </h2>
          <AgentActivityFeed events={agentEvents} />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center text-slate-500 text-sm">
        Loading chat...
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
