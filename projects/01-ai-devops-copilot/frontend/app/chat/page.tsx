'use client';

import ChatPanel from '@/components/dashboard/ChatPanel';
import AgentActivityFeed from '@/components/dashboard/AgentActivityFeed';
import { useState } from 'react';

export interface AgentEvent {
  id: string;
  type: 'tool_call' | 'tool_result' | 'token' | 'done' | 'error';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export default function ChatPage() {
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);

  const handleAgentEvent = (event: AgentEvent) => {
    setAgentEvents((prev) => {
      const updated = [...prev, event];
      // Keep last 50 events
      return updated.slice(-50);
    });
  };

  return (
    <div className="flex h-full gap-0">
      {/* Main chat panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatPanel onAgentEvent={handleAgentEvent} />
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
