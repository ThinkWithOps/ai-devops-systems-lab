import { clsx } from "clsx";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
  color?: "accent" | "success" | "warning" | "danger" | "aws" | "azure" | "gcp";
}

const colorMap = {
  accent: "text-accent bg-accent/10 border-accent/20",
  success: "text-success bg-success/10 border-success/20",
  warning: "text-warning bg-warning/10 border-warning/20",
  danger: "text-danger bg-danger/10 border-danger/20",
  aws: "text-aws bg-aws/10 border-aws/20",
  azure: "text-azure bg-azure/10 border-azure/20",
  gcp: "text-gcp bg-gcp/10 border-gcp/20",
};

export function KpiCard({ label, value, delta, icon: Icon, color = "accent" }: KpiCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
      <div className={clsx("p-2 rounded-lg border", colorMap[color])}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-muted text-xs uppercase tracking-wider mb-1">{label}</p>
        <p className="text-white text-2xl font-bold leading-none">{value}</p>
        {delta && <p className="text-xs text-muted mt-1">{delta}</p>}
      </div>
    </div>
  );
}
