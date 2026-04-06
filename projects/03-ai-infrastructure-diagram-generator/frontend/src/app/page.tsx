"use client";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { KpiCard } from "@/components/ui/KpiCard";
import { AgentFeed } from "@/components/ui/AgentFeed";
import { LogStrip } from "@/components/ui/LogStrip";
import { DiagramViewer } from "@/components/diagram/DiagramViewer";
import { InsightsPanel } from "@/components/diagram/InsightsPanel";
import { generateDiagramStream, getMetrics, AgentStep, DiagramResult, MetricsSummary } from "@/lib/api";
import { FileCode2, Network, GitMerge, Clock, Layers } from "lucide-react";

const SAMPLE_TERRAFORM = `resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_security_group" "web" {
  vpc_id = aws_vpc.main.id
}

resource "aws_lb" "app" {
  load_balancer_type = "application"
  subnets            = [aws_subnet.public.id]
  security_groups    = [aws_security_group.web.id]
}

resource "aws_ecs_cluster" "main" {
  name = "app-cluster"
}

resource "aws_ecs_service" "api" {
  cluster         = aws_ecs_cluster.main.id
  load_balancer {
    target_group_arn = aws_lb.app.arn
  }
}

resource "aws_db_instance" "postgres" {
  engine         = "postgres"
  instance_class = "db.t3.micro"
  vpc_security_group_ids = [aws_security_group.web.id]
}

resource "aws_s3_bucket" "assets" {
  bucket = "app-assets"
}

resource "aws_lambda_function" "processor" {
  function_name = "event-processor"
  role          = aws_iam_role.lambda.arn
}

resource "aws_iam_role" "lambda" {
  name = "lambda-exec-role"
}

resource "aws_sqs_queue" "events" {
  name = "event-queue"
}
`;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DashboardPage() {
  const [terraformCode, setTerraformCode] = useState(SAMPLE_TERRAFORM);
  const [diagramTitle, setDiagramTitle] = useState("AWS Microservices Architecture");
  const [diagramStyle, setDiagramStyle] = useState<"graphviz" | "mermaid">("graphviz");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [result, setResult] = useState<DiagramResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);

  useEffect(() => {
    getMetrics().then(setMetrics).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setSteps([]);
    setResult(null);

    try {
      const final = await generateDiagramStream(
        terraformCode,
        diagramTitle,
        diagramStyle,
        (step) => setSteps((prev) => [...prev, step]),
      );
      setResult(final);
      getMetrics().then(setMetrics).catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base text-white">
      <Header onGenerate={handleGenerate} isGenerating={isGenerating} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Total Diagrams"
                value={metrics?.total_diagrams ?? 0}
                delta="All time"
                icon={Network}
                color="accent"
              />
              <KpiCard
                label="Resources Parsed"
                value={metrics?.total_resources_parsed ?? 0}
                delta="Across all diagrams"
                icon={Layers}
                color="success"
              />
              <KpiCard
                label="Avg Resources"
                value={metrics?.avg_resources_per_diagram ?? 0}
                delta="Per diagram"
                icon={GitMerge}
                color="warning"
              />
              <KpiCard
                label="Avg Gen Time"
                value={`${((metrics?.avg_generation_time_ms ?? 0) / 1000).toFixed(1)}s`}
                delta="End-to-end"
                icon={Clock}
                color="azure"
              />
            </div>

            {/* Main workspace */}
            <div className="flex gap-6 flex-1 min-h-0">

              {/* Left: Input + Agent Feed */}
              <div className="flex flex-col gap-4 w-80 shrink-0">
                {/* Input */}
                <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <FileCode2 size={14} className="text-accent" />
                    <h3 className="text-sm font-semibold text-white">Terraform Input</h3>
                  </div>

                  <input
                    type="text"
                    value={diagramTitle}
                    onChange={(e) => setDiagramTitle(e.target.value)}
                    placeholder="Diagram title..."
                    className="bg-base border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted w-full focus:outline-none focus:border-accent"
                  />

                  <div className="flex gap-2">
                    {(["graphviz", "mermaid"] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => setDiagramStyle(style)}
                        className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                          diagramStyle === style
                            ? "bg-accent text-white border-accent"
                            : "bg-base text-muted border-border hover:border-accent/50"
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={terraformCode}
                    onChange={(e) => setTerraformCode(e.target.value)}
                    className="bg-base border border-border rounded-lg p-3 text-xs text-white font-mono resize-none h-48 focus:outline-none focus:border-accent scrollbar-thin"
                    placeholder="Paste your Terraform HCL here..."
                  />

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-accent hover:bg-accent-dim disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                  >
                    {isGenerating ? "Generating..." : "Generate Diagram"}
                  </button>
                </div>

                {/* Agent Feed */}
                <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 flex-1 overflow-hidden">
                  <h3 className="text-sm font-semibold text-white shrink-0">Agent Activity</h3>
                  <div className="overflow-y-auto flex-1 scrollbar-thin">
                    <AgentFeed steps={steps.filter((s) => s.step !== "__result__")} />
                  </div>
                </div>
              </div>

              {/* Center: Diagram Viewer */}
              <div className="flex-1 flex flex-col gap-4 min-w-0">
                <DiagramViewer result={result} apiUrl={API_URL} />
              </div>

              {/* Right: Insights */}
              <InsightsPanel result={result} />
            </div>
          </div>

          <LogStrip steps={steps} />
        </main>
      </div>
    </div>
  );
}
