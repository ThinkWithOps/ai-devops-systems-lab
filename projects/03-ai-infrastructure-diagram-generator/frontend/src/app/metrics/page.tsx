"use client";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LogStrip } from "@/components/ui/LogStrip";
import { KpiCard } from "@/components/ui/KpiCard";
import { getMetrics, MetricsSummary } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Network, Layers, GitMerge, Clock } from "lucide-react";

const COLORS = ["#6c63ff", "#FF9900", "#0078D4", "#4285F4", "#326CE5"];

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);

  useEffect(() => {
    getMetrics().then(setMetrics).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base text-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Total Diagrams" value={metrics?.total_diagrams ?? 0} icon={Network} color="accent" />
              <KpiCard label="Resources Parsed" value={metrics?.total_resources_parsed ?? 0} icon={Layers} color="success" />
              <KpiCard label="Avg Resources" value={metrics?.avg_resources_per_diagram ?? 0} icon={GitMerge} color="warning" />
              <KpiCard label="Avg Gen Time" value={`${((metrics?.avg_generation_time_ms ?? 0) / 1000).toFixed(1)}s`} icon={Clock} color="azure" />
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Top Providers Used</h3>
              {metrics?.top_providers && metrics.top_providers.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={metrics.top_providers}>
                    <XAxis dataKey="provider" stroke="#8888aa" fontSize={12} />
                    <YAxis stroke="#8888aa" fontSize={12} />
                    <Tooltip
                      contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a45", borderRadius: 8 }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {metrics.top_providers.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted text-sm text-center py-12">Generate diagrams to see provider metrics.</div>
              )}
            </div>
          </div>
          <LogStrip steps={[]} />
        </main>
      </div>
    </div>
  );
}
