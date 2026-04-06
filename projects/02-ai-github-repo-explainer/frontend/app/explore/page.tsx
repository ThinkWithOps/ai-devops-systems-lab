'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Github, Search, Loader, CheckCircle, XCircle, Trash2, MessageSquare,
  RefreshCw, ChevronRight, ChevronDown, Folder, FolderOpen, File,
  FileCode, FileText, FileJson, Code2, BookOpen, Terminal, Layers,
} from 'lucide-react';
import { listRepos, deleteRepo, ingestRepo, type RepoInfo, type IngestProgressEvent } from '@/lib/api';
import Link from 'next/link';

// ─── File tree types ────────────────────────────────────────────────────────

interface FileTreeNode {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  children?: FileTreeNode[];
}

function buildTree(files: Array<{ path: string; type: string; size?: number }>): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const map: Record<string, FileTreeNode> = {};
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
      if (!isLast) current = map[partPath].children!;
    }
  }
  return root;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c'].includes(ext || ''))
    return <FileCode className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />;
  if (['json', 'yaml', 'yml', 'toml'].includes(ext || ''))
    return <FileJson className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />;
  if (['md', 'txt', 'rst'].includes(ext || ''))
    return <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
  return <File className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />;
}

// ─── Tree node component ─────────────────────────────────────────────────────

function TreeNode({
  node,
  depth = 0,
  selectedPath,
  onSelect,
}: {
  node: FileTreeNode;
  depth?: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isDir = node.type === 'tree' || (node.children && node.children.length > 0);
  const isSelected = node.path === selectedPath;

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-[3px] pr-2 rounded cursor-pointer text-xs transition-colors select-none ${
          isSelected
            ? 'bg-violet-600/20 text-violet-300'
            : isDir
            ? 'text-slate-300 hover:bg-slate-800'
            : 'text-slate-400 hover:bg-slate-800'
        }`}
        style={{ paddingLeft: `${6 + depth * 14}px` }}
        onClick={() => {
          if (isDir) setExpanded(!expanded);
          else onSelect(node.path);
        }}
      >
        {isDir ? (
          expanded
            ? <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
            : <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}
        {isDir
          ? expanded
            ? <FolderOpen className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
            : <Folder className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
          : getFileIcon(node.name)
        }
        <span className="truncate">{node.name}</span>
        {node.size && node.size > 0 && (
          <span className="text-slate-600 ml-auto flex-shrink-0 text-[10px]">
            {node.size > 1024 ? `${(node.size / 1024).toFixed(0)}KB` : `${node.size}B`}
          </span>
        )}
      </div>
      {isDir && expanded && node.children?.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

interface IngestResult {
  repo_name: string;
  chunk_count: number;
  file_count: number;
  indexed_at: string;
  metadata?: Record<string, unknown>;
}

export default function ExplorePage() {
  // Repo list state
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [deletingRepo, setDeletingRepo] = useState<string | null>(null);
  const [activeRepo, setActiveRepo] = useState<RepoInfo | null>(null);

  // Ingestion state
  const [url, setUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestEvents, setIngestEvents] = useState<IngestProgressEvent[]>([]);
  const [ingestProgress, setIngestProgress] = useState(0);
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

  // File tree state
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const fetchRepos = async () => {
    try {
      const data = await listRepos();
      setRepos(data.repos || []);
    } catch { /* non-fatal */ }
    finally { setLoadingRepos(false); }
  };

  useEffect(() => { fetchRepos(); }, []);

  // When ingest completes, set active repo and build file tree from events
  useEffect(() => {
    if (!ingestResult) return;
    const newRepo: RepoInfo = {
      repo_name: ingestResult.repo_name,
      chunk_count: ingestResult.chunk_count,
      file_count: ingestResult.file_count,
      indexed_at: ingestResult.indexed_at,
    };
    setActiveRepo(newRepo);
    // Build file list from ingest events
    const fileEvents = ingestEvents.filter(e => e.type === 'file' && e.file_path);
    if (fileEvents.length > 0) {
      const files = fileEvents.map(e => ({ path: e.file_path!, type: 'blob', size: undefined }));
      setFileTree(buildTree(files));
    }
  }, [ingestResult]);

  const handleIngest = useCallback(async () => {
    if (!url.trim() || isIngesting) return;
    setIsIngesting(true);
    setIngestEvents([]);
    setIngestProgress(0);
    setIngestResult(null);
    setIngestError(null);
    setFileTree([]);
    setSelectedFile(null);

    try {
      await ingestRepo(
        url.trim(),
        (event) => {
          setIngestEvents(prev => [...prev, event]);
          setIngestProgress(event.progress);
          if (event.type === 'complete') {
            setIngestResult({
              repo_name: event.repo_name!,
              chunk_count: event.chunk_count!,
              file_count: event.file_count!,
              indexed_at: event.indexed_at!,
              metadata: event.metadata,
            });
            setIsIngesting(false);
            fetchRepos();
          }
          if (event.type === 'error') {
            setIngestError(event.message);
            setIsIngesting(false);
          }
        },
        () => setIsIngesting(false)
      );
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : 'Unknown error');
      setIsIngesting(false);
    }
  }, [url, isIngesting]);

  const handleDelete = async (repoName: string) => {
    if (!confirm(`Delete all indexed content for "${repoName}"?`)) return;
    setDeletingRepo(repoName);
    try {
      await deleteRepo(repoName);
      await fetchRepos();
      if (activeRepo?.repo_name === repoName) {
        setActiveRepo(null);
        setFileTree([]);
        setSelectedFile(null);
      }
    } catch (err) {
      alert(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeletingRepo(null);
    }
  };

  const latestEvent = ingestEvents[ingestEvents.length - 1];

  // Panel: what to show on the right when a file is selected
  const selectedFileName = selectedFile?.split('/').pop() || '';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Top bar: URL input ──────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/80 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium min-w-[120px]">
            <Github className="w-3.5 h-3.5" />
            <span>GitHub URL</span>
          </div>
          <div className="flex-1 relative max-w-2xl">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleIngest()}
              placeholder="https://github.com/owner/repository"
              disabled={isIngesting}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm placeholder-slate-500 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleIngest}
            disabled={!url.trim() || isIngesting}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
          >
            {isIngesting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            {isIngesting ? 'Indexing...' : 'Index Repo'}
          </button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-slate-600">Try:</span>
            {['tiangolo/fastapi', 'pallets/flask'].map(sample => (
              <button
                key={sample}
                onClick={() => setUrl(`https://github.com/${sample}`)}
                className="text-xs text-violet-500 hover:text-violet-300 font-mono transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        {isIngesting && (
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${ingestProgress}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">{ingestProgress}%</span>
            {latestEvent && (
              <span className="text-xs text-slate-500 truncate max-w-xs">{latestEvent.message}</span>
            )}
          </div>
        )}
        {ingestError && (
          <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
            <XCircle className="w-3.5 h-3.5" />
            {ingestError}
          </div>
        )}
        {ingestResult && !isIngesting && (
          <div className="mt-2 flex items-center gap-3 text-xs text-green-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>
              <strong>{ingestResult.repo_name}</strong> indexed —{' '}
              {ingestResult.chunk_count.toLocaleString()} chunks · {ingestResult.file_count} files
            </span>
            <Link
              href={`/chat?repo=${encodeURIComponent(ingestResult.repo_name)}`}
              className="ml-2 bg-violet-600/20 text-violet-400 border border-violet-800/50 hover:bg-violet-600/30 px-2.5 py-0.5 rounded-lg transition-colors"
            >
              Chat about this repo →
            </Link>
          </div>
        )}
      </div>

      {/* ── IDE split pane ──────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left: Repo + file tree panel */}
        <div className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide">
              <Layers className="w-3.5 h-3.5" />
              Repositories
            </div>
            <button onClick={fetchRepos} className="text-slate-600 hover:text-slate-400 transition-colors">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Repo list */}
          <div className="flex-shrink-0 border-b border-slate-800 overflow-y-auto max-h-40">
            {loadingRepos ? (
              <div className="px-3 py-4 text-xs text-slate-600 text-center">Loading...</div>
            ) : repos.length === 0 ? (
              <div className="px-3 py-4 text-xs text-slate-600 text-center">
                No repos indexed yet
              </div>
            ) : (
              repos.map(repo => (
                <div
                  key={repo.repo_name}
                  onClick={() => setActiveRepo(repo)}
                  className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    activeRepo?.repo_name === repo.repo_name
                      ? 'bg-violet-600/15 border-l-2 border-violet-500'
                      : 'hover:bg-slate-800 border-l-2 border-transparent'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 font-medium truncate">{repo.repo_name}</p>
                    <p className="text-[10px] text-slate-600">{repo.chunk_count?.toLocaleString()} chunks</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/chat?repo=${encodeURIComponent(repo.repo_name)}`}
                      onClick={e => e.stopPropagation()}
                      className="p-1 text-slate-500 hover:text-violet-400 transition-colors"
                      title="Chat"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </Link>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(repo.repo_name); }}
                      disabled={deletingRepo === repo.repo_name}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* File tree */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <Code2 className="w-3.5 h-3.5" />
            {activeRepo ? activeRepo.repo_name.split('/')[1] || activeRepo.repo_name : 'File Tree'}
          </div>
          <div className="flex-1 overflow-y-auto py-1 font-mono">
            {fileTree.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-xs text-slate-600">
                  {activeRepo
                    ? 'Index this repo to see its file tree'
                    : 'Select or index a repo'}
                </p>
              </div>
            ) : (
              fileTree.map(node => (
                <TreeNode
                  key={node.path}
                  node={node}
                  selectedPath={selectedFile}
                  onSelect={setSelectedFile}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Content / explanation panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0d0d0f]">
          {selectedFile ? (
            <>
              {/* Tab bar */}
              <div className="flex-shrink-0 flex items-center border-b border-slate-800 bg-slate-900/60 px-4 py-0">
                <div className="flex items-center gap-2 border-b-2 border-violet-500 px-3 py-2.5 text-sm text-slate-200">
                  {getFileIcon(selectedFileName)}
                  <span className="font-mono text-xs">{selectedFileName}</span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <Link
                    href={`/chat?repo=${encodeURIComponent(activeRepo?.repo_name || '')}&q=${encodeURIComponent(`Explain the file ${selectedFile}`)}`}
                    className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    Ask AI about this file
                  </Link>
                </div>
              </div>

              {/* File info panel */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl space-y-5">
                  {/* Path breadcrumb */}
                  <div className="flex items-center gap-1 text-xs text-slate-600 font-mono flex-wrap">
                    {selectedFile.split('/').map((part, i, arr) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className={i === arr.length - 1 ? 'text-slate-300' : 'text-slate-600'}>
                          {part}
                        </span>
                        {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700" />}
                      </span>
                    ))}
                  </div>

                  {/* Info card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-600/15 border border-violet-800/50 flex items-center justify-center">
                          {getFileIcon(selectedFileName)}
                        </div>
                        <div>
                          <p className="text-slate-100 font-semibold text-sm font-mono">{selectedFileName}</p>
                          <p className="text-slate-500 text-xs mt-0.5 font-mono">{selectedFile}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-green-400 bg-green-900/20 border border-green-800/50 px-2 py-0.5 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Indexed
                      </div>
                    </div>

                    <p className="text-slate-400 text-sm">
                      This file is part of <span className="text-violet-400 font-medium">{activeRepo?.repo_name}</span> and
                      has been embedded into ChromaDB. You can ask the AI anything about its content, structure, or purpose.
                    </p>

                    <Link
                      href={`/chat?repo=${encodeURIComponent(activeRepo?.repo_name || '')}&q=${encodeURIComponent(`Explain the file ${selectedFile} in detail`)}`}
                      className="flex items-center gap-2 w-full justify-center bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Ask AI to explain this file
                    </Link>
                  </div>

                  {/* Quick question suggestions */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-slate-300 font-medium text-sm mb-3">Quick Questions</h3>
                    <div className="space-y-2">
                      {[
                        `What does ${selectedFileName} do?`,
                        `What are the main functions or classes in ${selectedFileName}?`,
                        `Are there any dependencies or imports in ${selectedFileName}?`,
                        `How is ${selectedFileName} connected to the rest of the codebase?`,
                      ].map(q => (
                        <Link
                          key={q}
                          href={`/chat?repo=${encodeURIComponent(activeRepo?.repo_name || '')}&q=${encodeURIComponent(q)}`}
                          className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-violet-700/50 hover:bg-slate-800 transition-colors text-xs text-slate-400 hover:text-slate-200"
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                          {q}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
              {activeRepo ? (
                <>
                  <div className="w-14 h-14 rounded-xl bg-violet-600/10 border border-violet-800/40 flex items-center justify-center">
                    <Code2 className="w-7 h-7 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-slate-300 font-semibold">{activeRepo.repo_name}</p>
                    <p className="text-slate-500 text-sm mt-1">
                      {activeRepo.chunk_count?.toLocaleString()} chunks indexed · {activeRepo.file_count || '?'} files
                    </p>
                  </div>
                  <p className="text-slate-600 text-sm max-w-sm">
                    Select a file from the tree to explore it, or go straight to chat.
                  </p>
                  <Link
                    href={`/chat?repo=${encodeURIComponent(activeRepo.repo_name)}`}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat about {activeRepo.repo_name.split('/')[1] || activeRepo.repo_name}
                  </Link>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <Github className="w-7 h-7 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">No repository selected</p>
                    <p className="text-slate-600 text-sm mt-1">
                      Paste a GitHub URL above to index a repo, or select one from the list.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 text-xs text-slate-600">
                    <p>Supports any public GitHub repository</p>
                    <p>Files are chunked and embedded into ChromaDB</p>
                    <p>Ask questions about any file or the entire codebase</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
