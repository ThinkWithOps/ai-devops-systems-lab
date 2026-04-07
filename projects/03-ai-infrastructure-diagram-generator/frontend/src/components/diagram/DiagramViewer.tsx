"use client";
import { useEffect, useRef } from "react";
import { DiagramResult } from "@/lib/api";
import { Download } from "lucide-react";

interface DiagramViewerProps {
  result: DiagramResult | null;
  apiUrl: string;
}

export function DiagramViewer({ result, apiUrl }: DiagramViewerProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result?.mermaid_code && mermaidRef.current) {
      import("mermaid").then((m) => {
        m.default.initialize({ startOnLoad: false, theme: "dark" });
        m.default.render("mermaid-svg", result.mermaid_code!).then(({ svg }) => {
          if (mermaidRef.current) mermaidRef.current.innerHTML = svg;
        });
      });
    }
  }, [result]);

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-xl text-muted text-sm">
        Paste Terraform code and click Generate to see your diagram here.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{result.title}</h3>
        {result.image_url && (
          <a
            href={result.image_url.startsWith("http") ? result.image_url : `${apiUrl}${result.image_url}`}
            download
            className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors"
          >
            <Download size={13} /> Download PNG
          </a>
        )}
      </div>

      <div className="flex-1 bg-base rounded-xl border border-border overflow-auto flex items-center justify-center min-h-64">
        {result.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.image_url.startsWith("http") ? result.image_url : `${apiUrl}${result.image_url}`}
            alt="Architecture Diagram"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        ) : result.mermaid_code ? (
          <div ref={mermaidRef} className="p-4 text-white" />
        ) : (
          <pre className="text-xs text-muted p-4 overflow-auto max-w-full">
            {result.dot_source || "No diagram output"}
          </pre>
        )}
      </div>

      {result.providers.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {result.providers.map((p) => (
            <span
              key={p}
              className="text-xs px-2 py-0.5 rounded-full border font-mono"
              style={{
                borderColor: PROVIDER_COLORS[p] || "#6c63ff",
                color: PROVIDER_COLORS[p] || "#6c63ff",
                background: `${PROVIDER_COLORS[p] || "#6c63ff"}15`,
              }}
            >
              {p.toUpperCase()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const PROVIDER_COLORS: Record<string, string> = {
  aws: "#FF9900",
  azure: "#0078D4",
  gcp: "#4285F4",
  k8s: "#326CE5",
  generic: "#6c63ff",
};
