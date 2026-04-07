const API_URL = typeof window !== "undefined"
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

export interface AgentStep {
  step: string;
  status: "running" | "complete" | "error";
  detail?: string;
  timestamp: string;
}

export interface ParsedResource {
  resource_type: string;
  resource_name: string;
  provider: string;
  attributes: Record<string, unknown>;
  connections: string[];
}

export interface DiagramResult {
  diagram_id: string;
  title: string;
  image_url?: string;
  mermaid_code?: string;
  dot_source?: string;
  ai_summary?: string;
  resources: ParsedResource[];
  agent_steps: AgentStep[];
  resource_count: number;
  connection_count: number;
  providers: string[];
  created_at: string;
}

export interface DiagramHistoryItem {
  diagram_id: string;
  title: string;
  resource_count: number;
  providers: string[];
  created_at: string;
}

export interface MetricsSummary {
  total_diagrams: number;
  total_resources_parsed: number;
  avg_resources_per_diagram: number;
  top_providers: { provider: string; count: number }[];
  diagrams_today: number;
  avg_generation_time_ms: number;
}

export async function generateDiagramStream(
  terraformCode: string,
  title: string,
  style: "graphviz" | "mermaid",
  onStep: (step: AgentStep) => void,
): Promise<DiagramResult | null> {
  const response = await fetch(`${API_URL}/api/diagrams/generate/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      terraform_code: terraformCode,
      diagram_title: title,
      diagram_style: style,
      include_ai_summary: true,
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.statusText}`);
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result: DiagramResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    for (const line of text.split("\n").filter(Boolean)) {
      try {
        const step: AgentStep = JSON.parse(line);
        if (step.step === "__result__") {
          result = JSON.parse(step.detail!);
        } else {
          onStep(step);
        }
      } catch {}
    }
  }
  return result;
}

export async function getHistory(): Promise<DiagramHistoryItem[]> {
  const res = await fetch(`${API_URL}/api/history`);
  if (!res.ok) return [];
  return res.json();
}

export async function getMetrics(): Promise<MetricsSummary> {
  const res = await fetch(`${API_URL}/api/metrics`);
  if (!res.ok) return {
    total_diagrams: 0, total_resources_parsed: 0, avg_resources_per_diagram: 0,
    top_providers: [], diagrams_today: 0, avg_generation_time_ms: 0,
  };
  return res.json();
}
