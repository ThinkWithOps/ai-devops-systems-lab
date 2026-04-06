const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function apiUrl(path: string): string {
  // In the browser, use relative /api/* which is proxied by next.config.js
  if (typeof window !== 'undefined') {
    return `/api${path}`;
  }
  return `${BASE_URL}/api${path}`;
}

// ---- Health ----

export async function getHealth(): Promise<{
  status: string;
  version: string;
  llm_provider: string;
  services: { llm: boolean; chromadb: boolean };
}> {
  const res = await fetch(apiUrl('/health'), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

// ---- Repos ----

export interface RepoInfo {
  repo_name: string;
  chunk_count: number;
  file_count?: number;
  indexed_at?: string;
}

export async function listRepos(): Promise<{ repos: RepoInfo[] }> {
  const res = await fetch(apiUrl('/repos'), { cache: 'no-store' });
  if (!res.ok) throw new Error(`List repos failed: ${res.status}`);
  return res.json();
}

export async function deleteRepo(repoName: string): Promise<{ status: string; repo_name: string }> {
  const encoded = encodeURIComponent(repoName);
  const res = await fetch(apiUrl(`/repos/${encoded}`), {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Delete repo failed: ${res.status}`);
  return res.json();
}

export async function getRepoTree(
  owner: string,
  repo: string
): Promise<{ owner: string; repo: string; tree: Array<{ path: string; type: string; size: number }> }> {
  const res = await fetch(apiUrl(`/repos/${owner}/${repo}/tree`), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Get repo tree failed: ${res.status}`);
  return res.json();
}

// ---- Ingest (SSE streaming) ----

export interface IngestProgressEvent {
  type: 'progress' | 'complete' | 'error' | 'file';
  step: string;
  message: string;
  progress: number;
  repo_name?: string;
  chunk_count?: number;
  file_count?: number;
  indexed_at?: string;
  metadata?: Record<string, unknown>;
  file_path?: string;
}

export async function ingestRepo(
  repoUrl: string,
  onEvent: (event: IngestProgressEvent) => void,
  onDone: () => void
): Promise<void> {
  const res = await fetch(apiUrl('/repos/ingest'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: repoUrl }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ingest request failed: ${res.status} — ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body from ingest endpoint');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;

        try {
          const event = JSON.parse(data) as IngestProgressEvent;
          onEvent(event);
          if (event.type === 'complete' || event.step === 'done') {
            onDone();
            return;
          }
          if (event.type === 'error') {
            onDone();
            return;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }

  onDone();
}

// ---- Chat (SSE streaming) ----

export async function sendChatMessage(
  query: string,
  repoName: string | null,
  onToken: (token: string) => void,
  onToolCall: (event: { type: string; content: string; metadata?: Record<string, unknown> }) => void,
  onDone: () => void
): Promise<void> {
  const res = await fetch(apiUrl('/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, repo_name: repoName }),
  });

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;

        try {
          const event = JSON.parse(data) as {
            type: string;
            content: string;
            metadata?: Record<string, unknown>;
          };

          if (event.type === 'token') {
            onToken(event.content);
          } else if (event.type === 'tool_call' || event.type === 'tool_result') {
            onToolCall(event);
          } else if (event.type === 'done') {
            onDone();
          } else if (event.type === 'error') {
            onToolCall(event);
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }

  onDone();
}

// ---- Logs (mock fallback — no dedicated log service in this project) ----

export async function searchLogs(
  _query: string,
  _limit: number = 20
): Promise<{
  logs: Array<{ timestamp: string; severity: string; service: string; message: string }>;
  source: string;
}> {
  // This project does not have a dedicated log service.
  // Return simulated activity logs for the live log strip.
  const now = new Date();
  const mockLogs = [
    { timestamp: now.toISOString(), severity: 'INFO', service: 'ingestion', message: 'Repository indexed successfully: tiangolo/fastapi (342 chunks)' },
    { timestamp: now.toISOString(), severity: 'INFO', service: 'agent', message: 'Query answered: "What does this repo do?" — 2 tool calls, 1.8s' },
    { timestamp: now.toISOString(), severity: 'INFO', service: 'chromadb', message: 'Vector search completed: 5 results in 42ms' },
    { timestamp: now.toISOString(), severity: 'INFO', service: 'github-api', message: 'Fetched 48 files from owner/repo (rate limit: 4987 remaining)' },
    { timestamp: now.toISOString(), severity: 'WARN', service: 'github-api', message: 'Rate limit approaching: 60/60 requests used (unauthenticated)' },
    { timestamp: now.toISOString(), severity: 'INFO', service: 'embeddings', message: 'Encoded 128 chunks with all-MiniLM-L6-v2 in 3.2s' },
  ];
  return { logs: mockLogs, source: 'mock' };
}
