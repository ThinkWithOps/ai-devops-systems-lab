'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { sendChatMessage } from '@/lib/api';
import type { AgentEvent } from '@/app/chat/page';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  onAgentEvent?: (event: AgentEvent) => void;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hello! I'm your AI DevOps Copilot. I can help you diagnose infrastructure problems, analyze GitHub workflow failures, search application logs, and retrieve relevant runbooks.\n\nTry asking me:\n• \"Why is the api-gateway pod being OOMKilled?\"\n• \"Show me recent GitHub Actions failures\"\n• \"Search logs for database connection errors\"\n• \"How do I troubleshoot nginx 502 errors?\"",
  timestamp: new Date(),
};

export default function ChatPanel({ onAgentEvent }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || isStreaming) return;

    setInput('');
    setIsStreaming(true);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    try {
      await sendChatMessage(
        query,
        // onToken
        (token: string) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + token } : m
            )
          );
        },
        // onToolCall
        (event: { type: string; content: string; metadata?: Record<string, unknown> }) => {
          if (onAgentEvent) {
            onAgentEvent({
              id: `event-${Date.now()}-${Math.random()}`,
              type: event.type as AgentEvent['type'],
              content: event.content,
              metadata: event.metadata,
              timestamp: new Date(),
            });
          }
        },
        // onDone
        () => {
          setIsStreaming(false);
        }
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: Failed to connect to the backend. Make sure the API server is running at ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}.` }
            : m
        )
      );
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 chat-bubble-enter ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user'
                  ? 'bg-blue-600'
                  : 'bg-slate-700 border border-slate-600'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-blue-400" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 border border-slate-700 text-slate-200'
              }`}
            >
              {msg.content === '' && isStreaming ? (
                <div className="flex items-center gap-1 py-0.5">
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400" />
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-800 p-4 bg-slate-900">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your infrastructure, deployments, or errors..."
            rows={2}
            disabled={isStreaming}
            className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm placeholder-slate-500 resize-none focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="w-11 h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2 text-center">
          Powered by llama3 via Ollama · Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
