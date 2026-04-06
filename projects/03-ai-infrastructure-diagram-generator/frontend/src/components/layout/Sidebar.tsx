"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Bot, ScrollText, Network, BarChart3, Table2, Settings,
} from "lucide-react";
import { clsx } from "clsx";

const NAV = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Logs", href: "/logs", icon: ScrollText },
  { label: "Architecture", href: "/architecture", icon: Network },
  { label: "Metrics", href: "/metrics", icon: BarChart3 },
  { label: "Results", href: "/results", icon: Table2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-surface border-r border-border flex flex-col py-4 shrink-0">
      <div className="px-4 mb-6">
        <div className="text-xs font-bold text-muted uppercase tracking-widest">Navigation</div>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-accent text-white font-semibold"
                  : "text-muted hover:bg-card hover:text-white",
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
