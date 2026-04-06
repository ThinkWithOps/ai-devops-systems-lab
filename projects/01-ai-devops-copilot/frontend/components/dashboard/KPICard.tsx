import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  delta: string;
  deltaType: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  color: string;
}

const COLOR_MAP: Record<string, { icon: string; delta: string }> = {
  blue: { icon: 'bg-blue-600/20 text-blue-400', delta: '' },
  green: { icon: 'bg-green-600/20 text-green-400', delta: '' },
  purple: { icon: 'bg-purple-600/20 text-purple-400', delta: '' },
  orange: { icon: 'bg-orange-600/20 text-orange-400', delta: '' },
};

const DELTA_STYLES = {
  up: 'text-green-400',
  down: 'text-red-400',
  neutral: 'text-slate-400',
};

export default function KPICard({ title, value, delta, deltaType, icon: Icon, color }: KPICardProps) {
  const colorStyle = COLOR_MAP[color] || COLOR_MAP.blue;

  const DeltaIcon =
    deltaType === 'up' ? TrendingUp : deltaType === 'down' ? TrendingDown : Minus;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorStyle.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-100">{value}</div>
        <div className="text-slate-400 text-sm mt-0.5">{title}</div>
      </div>

      <div className={`flex items-center gap-1 mt-2 text-xs ${DELTA_STYLES[deltaType]}`}>
        <DeltaIcon className="w-3.5 h-3.5" />
        <span>{delta}</span>
      </div>
    </div>
  );
}
