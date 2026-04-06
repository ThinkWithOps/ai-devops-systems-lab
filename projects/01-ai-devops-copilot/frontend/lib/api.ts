const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper to build API URLs
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

// ---- Chat (SSE streaming) ----

export async function sendChatMessage(
  query: string,
  onToken: (token: string) => void,
  onToolCall: (event: { type: string; content: string; metadata?: Record<string, unknown> }) => void,
  onDone: () => void
): Promise<void> {
  const res = await fetch(apiUrl('/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
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

    // Process complete SSE messages
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

// ---- GitHub ----

export async function getGithubRepos(): Promise<{ repos: unknown[] }> {
  const res = await fetch(apiUrl('/github/repos'), { cache: 'no-store' });
  if (!res.ok) throw new Error(`GitHub repos failed: ${res.status}`);
  return res.json();
}

export async function getWorkflowRuns(repo: string): Promise<{ workflow_runs: unknown[] }> {
  const res = await fetch(apiUrl(`/github/workflows/${encodeURIComponent(repo)}`), {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Workflow runs failed: ${res.status}`);
  return res.json();
}

// ---- Logs ----

export async function searchLogs(
  query: string,
  limit: number = 20
): Promise<{ logs: Array<{ timestamp: string; severity: string; service: string; message: string }>; source: string }> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(apiUrl(`/logs/search?${params}`), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Log search failed: ${res.status}`);
  return res.json();
}

export async function ingestLogs(logs: Array<Record<string, string>>): Promise<{ status: string; ingested: number }> {
  const res = await fetch(apiUrl('/logs/ingest'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logs }),
  });
  if (!res.ok) throw new Error(`Log ingest failed: ${res.status}`);
  return res.json();
}

// ---- Metrics (mock) ----

export async function getMetrics(): Promise<{
  queryVolume: number;
  avgResponseTime: number;
  toolSuccessRate: number;
  totalTokens: number;
}> {
  // In a real system this would query a metrics endpoint
  return {
    queryVolume: 47,
    avgResponseTime: 4.2,
    toolSuccessRate: 0.947,
    totalTokens: 128400,
  };
}
