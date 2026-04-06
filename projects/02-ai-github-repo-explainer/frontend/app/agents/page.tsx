'use client';

import { Brain, Wrench, CheckCircle, Clock, MessageSquare } from 'lucide-react';

const AGENT_HISTORY = [
  {
    id: 1,
    query: 'What does this repo do?',
    repo: 'tiangolo/fastapi',
    tools: [
      { name: 'search_repo', input: 'purpose overview readme fastapi', result: '5 results from README.md, setup.py', duration: '42ms' },
      { name: 'get_repo_metadata', input: 'tiangolo/fastapi', result: '72k stars, Python, web framework', duration: '180ms' },
    ],
    response: 'FastAPI is a modern, fast (high-performance) web framework for building APIs with Python 3.8+ based on standard Python type hints...',
    totalTime: '1.8s',
    timestamp: '2 min ago',
    status: 'success',
  },
  {
    id: 2,
    query: 'How is routing implemented?',
    repo: 'tiangolo/fastapi',
    tools: [
      { name: 'search_repo', input: 'router routing APIRouter decorator path', result: '5 results from fastapi/routing.py, fastapi/applications.py', duration: '38ms' },
    ],
    response: 'FastAPI routing is implemented via the APIRouter class in fastapi/routing.py. Routes are registered using decorators like @router.get(), @router.post()...',
    totalTime: '1.2s',
    timestamp: '8 min ago',
    status: 'success',
  },
  {
    id: 3,
    query: 'What dependencies does this project use?',
    repo: 'vercel/next.js',
    tools: [
      { name: 'search_repo', input: 'dependencies package.json requirements', result: '3 results from package.json, lerna.json', duration: '35ms' },
    ],
    response: 'Next.js core dependencies include React 18, webpack 5, SWC compiler (Rust-based), and Turbopack. The monorepo is managed with...',
    totalTime: '1.4s',
    timestamp: '25 min ago',
    status: 'success',
  },
  {
    id: 4,
    query: "What's the main entry point?",
    repo: 'pallets/flask',
    tools: [
      { name: 'search_repo', input: 'entry point main application start wsgi', result: '5 results from src/flask/app.py, src/flask/__init__.py', duration: '41ms' },
    ],
    response: 'The main entry point for Flask applications is the Flask class defined in src/flask/app.py. You create an application instance with app = Flask(__name__)...',
    totalTime: '1.6s',
    timestamp: '1 hr ago',
    status: 'success',
  },
];

export default function AgentsPage() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto flex-1">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Agent Activity</h1>
        <p className="text-slate-400 text-sm mt-1">
          History of RepoAgent tool calls and reasoning
        </p>
      </div>

      {/* Agent info card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-violet-600/20 border border-violet-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-violet-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-slate-100 font-semibold">RepoAgent</h2>
              <span className="bg-green-900/50 text-green-400 border border-green-800 text-xs px-2 py-0.5 rounded-full">Online</span>
            </div>
            <p className="text-slate-400 text-sm">
              create_tool_calling_agent · Groq llama-3.1-8b-instant · max_iterations=8
            </p>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Wrench className="w-3.5 h-3.5 text-violet-400" />
                <span>search_repo</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Wrench className="w-3.5 h-3.5 text-violet-400" />
                <span>get_repo_metadata</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity history */}
      <div className="space-y-4">
        <h2 className="text-slate-200 font-semibold text-base">Recent Queries</h2>

        {AGENT_HISTORY.map((item) => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            {/* Query header */}
            <div className="flex items-start gap-3 mb-4">
              <MessageSquare className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-slate-200 font-medium text-sm">{item.query}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500 font-mono">{item.repo}</span>
                  <span className="text-slate-600 text-xs">·</span>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{item.totalTime} total</span>
                  </div>
                  <span className="text-slate-600 text-xs">·</span>
                  <span className="text-xs text-slate-500">{item.timestamp}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Success</span>
              </div>
            </div>

            {/* Tool calls */}
            <div className="space-y-2 mb-4">
              {item.tools.map((tool, i) => (
                <div key={i} className="flex gap-3 bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
                  <Wrench className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-violet-300 text-xs font-mono font-medium">{tool.name}</span>
                      <span className="text-xs text-slate-600">{tool.duration}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Input: &quot;{tool.input}&quot;</p>
                    <p className="text-xs text-slate-400 mt-0.5">Result: {tool.result}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Response snippet */}
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Response</p>
              <p className="text-slate-300 text-sm leading-relaxed">
                {item.response.length > 200 ? item.response.slice(0, 200) + '...' : item.response}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
