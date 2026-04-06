'use client';

interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  processing: 'bg-blue-900/50 text-blue-300 border-blue-700',
  completed: 'bg-green-900/50 text-green-300 border-green-700',
  failed: 'bg-red-900/50 text-red-300 border-red-700',
  cancelled: 'bg-slate-800 text-slate-400 border-slate-600',
  success: 'bg-green-900/50 text-green-300 border-green-700',
  timeout: 'bg-red-900/50 text-red-300 border-red-700',
  refunded: 'bg-purple-900/50 text-purple-300 border-purple-700',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status.toLowerCase()] ?? 'bg-slate-800 text-slate-400 border-slate-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {status}
    </span>
  );
}
