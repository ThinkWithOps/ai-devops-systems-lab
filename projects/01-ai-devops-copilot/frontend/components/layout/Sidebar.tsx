'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  FileText,
  Network,
  BarChart3,
  Settings,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
  { href: '/agents', label: 'Agents', icon: <Bot className="w-4 h-4" /> },
  { href: '/logs', label: 'Logs', icon: <FileText className="w-4 h-4" /> },
  { href: '/architecture', label: 'Architecture', icon: <Network className="w-4 h-4" /> },
  { href: '/metrics', label: 'Metrics', icon: <BarChart3 className="w-4 h-4" /> },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-800/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-slate-800">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span className="font-medium">Settings</span>
        </Link>

        <div className="mt-3 px-3 py-2 bg-slate-800/60 rounded-lg">
          <p className="text-xs text-slate-500 font-medium">Model</p>
          <p className="text-xs text-slate-300 mt-0.5">llama3 · local</p>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <p className="text-xs text-slate-400">Ollama running</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
