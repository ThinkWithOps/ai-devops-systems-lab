'use client';

import { useState, useCallback } from 'react';
import { Search, Github, CheckCircle, XCircle, Loader, ChevronRight, ChevronDown, Folder, File } from 'lucide-react';
import { ingestRepo, type IngestProgressEvent } from '@/lib/api';
import Link from 'next/link';

interface FileTreeNode {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  children?: FileTreeNode[];
}

interface IngestResult {
  repo_name: string;
  chunk_count: number;
  file_count: number;
  indexed_at: string;
  metadata?: Record<string, unknown>;
}

function buildTree(files: Array<{ path: string; type: string; size?: number }>): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const map: Record<string, FileTreeNode> = {};

  // Sort so directories (shorter paths) come before files
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sorted) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partPath = parts.slice(0, i + 1).join('/');
      const isLast = i === parts.length - 1;

      if (!map[partPath]) {
        const node: FileTreeNode = {
          name: part,
          path: partPath,
          type: isLast ? (file.type as 'blob' | 'tree') : 'tree',
          size: isLast ? file.size : undefined,
          children: isLast && file.type === 'blob' ? undefined : [],
        };
        map[partPath] = node;
        current.push(node);
      }
      if (!isLast) {
        current = map[partPath].children!;
      }
    }
  }

  return root;
}

function TreeNode({ node, depth = 0 }: { node: FileTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isDir = node.type === 'tree' || (node.children && node.children.length > 0);

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-0.5 px-2 rounded hover:bg-slate-800 cursor-pointer text-xs ${
          isDir ? 'text-slate-300' : 'text-slate-400'
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => isDir && setExpanded(!expanded)}
      >
        {isDir ? (
          expanded ? (
            <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
          )
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}
        {isDir ? (
          <Folder className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
        ) : (
          <File className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
        {node.size && node.size > 0 && (
          <span className="text-slate-600 ml-auto flex-shrink-0">
            {node.size > 1024 ? `${(node.size / 1024).toFixed(1)}KB` : `${node.size}B`}
          </span>
        )}
      </div>
      {isDir && expanded && node.children?.map((child) => (
        <TreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function RepoExplorer() {
  const [url, setUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [events, setEvents] = useState<IngestProgressEvent[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);

  const handleIngest = useCallback(async () => {
    if (!url.trim() || isIngesting) return;

    setIsIngesting(true);
    setEvents([]);
    setCurrentProgress(0);
    setResult(null);
    setError(null);
    setFileTree([]);

    try {
      await ingestRepo(
        url.trim(),
        (event) => {
          setEvents((prev) => [...prev, event]);
          setCurrentProgress(event.progress);

          if (event.type === 'complete') {
            setResult({
              repo_name: event.repo_name!,
              chunk_count: event.chunk_count!,
              file_count: event.file_count!,
              indexed_at: event.indexed_at!,
              metadata: event.metadata,
            });
            setIsIngesting(false);
          }

          if (event.type === 'error') {
            setError(event.message);
            setIsIngesting(false);
          }
        },
        () => {
          setIsIngesting(false);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsIngesting(false);
    }
  }, [url, isIngesting]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleIngest();
  };

  const latestEvent = events[events.length - 1];

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-slate-100 font-semibold text-base mb-1">Analyze a GitHub Repository</h2>
        <p className="text-slate-400 text-sm mb-4">
          Paste any public GitHub repo URL. The AI will fetch its files, embed them into ChromaDB, and make it available for chat.
        </p>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://github.com/owner/repository"
              disabled={isIngesting}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleIngest}
            disabled={!url.trim() || isIngesting}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {isIngesting ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {isIngesting ? 'Indexing...' : 'Analyze'}
          </button>
        </div>

        {/* Sample repos */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-slate-500">Try:</span>
          {[
            'https://github.com/tiangolo/fastapi',
            'https://github.com/vercel/next.js',
            'https://github.com/pallets/flask',
          ].map((sample) => (
            <button
              key={sample}
              onClick={() => setUrl(sample)}
              className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2"
            >
              {sample.replace('https://github.com/', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      {(isIngesting || events.length > 0) && !result && !error && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-200 font-medium text-sm">Ingestion Progress</h3>
            <span className="text-xs text-slate-400">{currentProgress}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${currentProgress}%` }}
            />
          </div>

          {/* Latest status */}
          {latestEvent && (
            <div className="flex items-center gap-2 text-sm">
              <Loader className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" />
              <span className="text-slate-300">{latestEvent.message}</span>
            </div>
          )}

          {/* Step log */}
          <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
            {events.slice(-8).map((evt, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                <span>{evt.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium text-sm">Ingestion failed</p>
            <p className="text-red-400 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success result */}
      {result && (
        <div className="space-y-4">
          <div className="bg-green-950/30 border border-green-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-green-300 font-semibold text-sm">Repository Indexed Successfully</p>
                <p className="text-green-500 text-xs mt-0.5">{result.repo_name}</p>
              </div>
              <Link
                href={`/chat?repo=${encodeURIComponent(result.repo_name)}`}
                className="ml-auto flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Chat about this repo
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Chunks indexed', value: result.chunk_count.toLocaleString() },
                { label: 'Files fetched', value: result.file_count.toLocaleString() },
                {
                  label: 'Language',
                  value: (result.metadata?.language as string) || 'Unknown',
                },
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-slate-100">{stat.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {!!result.metadata?.description && (
              <p className="mt-3 text-sm text-slate-400 italic">
                &ldquo;{String(result.metadata.description)}&rdquo;
              </p>
            )}
          </div>

          {/* File tree placeholder */}
          {fileTree.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-slate-200 font-medium text-sm mb-3">File Tree</h3>
              <div className="font-mono text-xs max-h-64 overflow-y-auto">
                {fileTree.map((node) => (
                  <TreeNode key={node.path} node={node} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
