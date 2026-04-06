'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, ChevronDown } from 'lucide-react';
import { sendChatMessage, listRepos, type RepoInfo } from '@/lib/api';
import type { AgentEvent } from '@/app/chat/page';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  onAgentEvent?: (event: AgentEvent) => void;
  initialRepoName?: string | null;
}

const SUGGESTED_QUESTIONS = [
  'What does this repo do?',
  "What's the main entry point?",
  'How is authentication implemented?',
  'What dependencies does this project use?',
  'How is the project structured?',
  'What testing approach is used?',
];

function getWelcomeMessage(repoName: string | null): string {
  if (repoName) {
    return `I'm ready to answer questions about **${repoName}**. I've searched its indexed content and can explain any part of the codebase.\n\nTry asking:\n• "What does this repo do?"\n• "What's the main entry point?"\n• "How is authentication implemented?"\n• "What dependencies does it use?"`;
  }
  return `Hello! I'm your AI GitHub Repo Explainer. I can answer any question about indexed repositories — architecture, code patterns, dependencies, authentication, and more.\n\nFirst, select a repository from the dropdown above, or go to **Explore** to index a new one.`;
}

export default function ChatPanel({ onAgentEvent, initialRepoName }: ChatPanelProps) {
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>(initialRepoName || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Set initial welcome message
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: getWelcomeMessage(initialRepoName || null),
      timestamp: new Date(),
    }]);
  }, [initialRepoName]);

  // Load repos list
  useEffect(() => {
    const load = async () => {
      try {
        const data = await listRepos();
        setRepos(data.repos || []);
        // Auto-select first repo if none selected
        if (!selectedRepo && data.repos.length > 0) {
          setSelectedRepo(data.repos[0].repo_name);
        }
      } catch {
        // Non-fatal
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [selectedRepo]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleRepoSelect = (repoName: string) => {
    setSelectedRepo(repoName);
    setShowRepoDropdown(false);
    // Add a context change message
    setMessages((prev) => [
      ...prev,
      {
        id: `context-${Date.now()}`,
        role: 'assistant',
        content: `Now focusing on **${repoName}**. Ask me anything about this repository!`,
        timestamp: new Date(),
      },
    ]);
  };

  const sendMessage = async (queryOverride?: string) => {
    const query = (queryOverride || input).trim();
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
        selectedRepo || null,
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
            ? {
                ...m,
                content: `Error: Failed to connect to the backend. Make sure the API server is running at ${
                  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                }.`,
              }
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
      {/* Repo selector bar */}
      <div className="border-b border-slate-800 px-4 py-2 bg-slate-900 flex items-center gap-3">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide whitespace-nowrap">Repo:</span>
        <div className="relative flex-1 max-w-sm">
          <button
            onClick={() => setShowRepoDropdown(!showRepoDropdown)}
            className="w-full flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 hover:border-slate-600 transition-colors"
          >
            <span className={selectedRepo ? 'text-slate-200' : 'text-slate-500'}>
              {selectedRepo || 'Select a repository...'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 ml-2" />
          </button>

          {showRepoDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
              {repos.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-500 text-center">
                  No repos indexed yet. Go to Explore to add one.
                </div>
              ) : (
                repos.map((repo) => (
                  <button
                    key={repo.repo_name}
                    onClick={() => handleRepoSelect(repo.repo_name)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-700 transition-colors text-left"
                  >
                    <span className="text-slate-200 truncate">{repo.repo_name}</span>
                    <span className="text-xs text-slate-500 ml-2 flex-shrink-0">{repo.chunk_count} chunks</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Suggested questions as chips */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar flex-1">
          {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={isStreaming || !selectedRepo}
              className="flex-shrink-0 text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-violet-700 px-3 py-1 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" onClick={() => setShowRepoDropdown(false)}>
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
                  ? 'bg-violet-600'
                  : 'bg-slate-700 border border-slate-600'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-violet-400" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white'
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
            placeholder={
              selectedRepo
                ? `Ask anything about ${selectedRepo}...`
                : 'Select a repository above, then ask a question...'
            }
            rows={2}
            disabled={isStreaming}
            className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm placeholder-slate-500 resize-none focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="w-11 h-11 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2 text-center">
          Powered by Groq llama-3.1-8b-instant · ChromaDB · sentence-transformers · Press Enter to send
        </p>
      </div>
    </div>
  );
}
