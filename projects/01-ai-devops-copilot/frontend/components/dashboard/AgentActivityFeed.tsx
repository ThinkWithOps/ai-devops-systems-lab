'use client';

import { Wrench, Brain, CheckCircle, XCircle, Loader } from 'lucide-react';
import type { AgentEvent } from '@/app/chat/page';

interface AgentActivityFeedProps {
  events: AgentEvent[];
}

const EVENT_ICON: Record<string, React.ReactNode> = {
  tool_call: <Wrench className="w-3.5 h-3.5 text-purple-400" />,
  tool_result: <CheckCircle className="w-3.5 h-3.5 text-green-400" />,
  token: <Brain className="w-3.5 h-3.5 text-blue-400" />,
  done: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  error: <XCircle className="w-3.5 h-3.5 text-red-400" />,
};

const EVENT_BADGE: Record<string, string> = {
  tool_call: 'bg-purple-900/50 text-purple-300 border border-purple-800',
  tool_result: 'bg-green-900/50 text-green-300 border border-green-800',
  token: 'bg-blue-900/50 text-blue-300 border border-blue-800',
  done: 'bg-slate-700 text-slate-300 border border-slate-600',
  error: 'bg-red-900/50 text-red-300 border border-red-800',
};

const EVENT_LABELS: Record<string, string> = {
  tool_call: 'Calling tool',
  tool_result: 'Tool result',
  token: 'Thinking',
  done: 'Done',
  error: 'Error',
};

export default function AgentActivityFeed({ events }: AgentActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Brain className="w-8 h-8 text-slate-700 mb-3" />
        <p className="text-slate-500 text-sm">Agent activity will appear here</p>
        <p className="text-slate-600 text-xs mt-1">Send a message to see tool calls and reasoning</p>
      </div>
    );
  }

  // Show non-token events prominently, collapse token events into a count
  const significantEvents = events.filter((e) => e.type !== 'token');
  const tokenCount = events.filter((e) => e.type === 'token').length;

  return (
    <div className="space-y-2">
      {tokenCount > 0 && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-950/30 border border-blue-900/50 rounded-lg text-xs text-blue-400">
          <Loader className="w-3 h-3 animate-spin" />
          <span>Generating... {tokenCount} tokens</span>
        </div>
      )}

      {significantEvents.slice().reverse().map((event) => (
        <div
          key={event.id}
          className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-2.5 text-xs animate-fade-in"
        >
          <div className="flex items-center gap-2 mb-1">
            {EVENT_ICON[event.type] || <Brain className="w-3.5 h-3.5 text-slate-400" />}
            <span className={`px-1.5 py-0.5 rounded text-xs ${EVENT_BADGE[event.type] || ''}`}>
              {EVENT_LABELS[event.type] || event.type}
            </span>
            <span className="text-slate-600 ml-auto">
              {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <p className="text-slate-300 leading-relaxed truncate" title={event.content}>
            {event.content.length > 80 ? event.content.slice(0, 80) + '…' : event.content}
          </p>

          {event.type === 'tool_call' && event.metadata?.input != null && (
            <p className="text-slate-500 mt-1 truncate" title={String(event.metadata.input)}>
              {`Input: ${String(event.metadata.input).slice(0, 60)}`}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
