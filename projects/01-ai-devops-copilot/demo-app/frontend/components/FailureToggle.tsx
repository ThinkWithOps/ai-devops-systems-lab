interface FailureToggleProps {
  mode: string;
  label: string;
  description: string;
  isActive: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

const MODE_ICONS: Record<string, string> = {
  slow_menu: '🐌',
  kitchen_down: '🔴',
  payment_timeout: '⏱️',
  reservation_conflict: '⚔️',
  db_slow: '🐘',
};

const MODE_IMPACT: Record<string, { severity: string; endpoints: string }> = {
  slow_menu: {
    severity: 'Medium',
    endpoints: 'GET /api/menu — adds 2s delay',
  },
  kitchen_down: {
    severity: 'Critical',
    endpoints: 'GET /api/kitchen/queue — returns 503',
  },
  payment_timeout: {
    severity: 'High',
    endpoints: 'POST /api/payments/{id}/process — 5s timeout then fail',
  },
  reservation_conflict: {
    severity: 'High',
    endpoints: 'POST /api/reservations — returns 409',
  },
  db_slow: {
    severity: 'Medium',
    endpoints: 'POST /api/orders — adds 1s DB delay',
  },
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'text-red-400',
  High: 'text-orange-400',
  Medium: 'text-yellow-400',
  Low: 'text-green-400',
};

export default function FailureToggle({
  mode,
  label,
  description,
  isActive,
  isLoading,
  onToggle,
}: FailureToggleProps) {
  const icon = MODE_ICONS[mode] ?? '⚠️';
  const impact = MODE_IMPACT[mode];
  const severityColor = impact ? SEVERITY_COLORS[impact.severity] ?? 'text-stone-400' : 'text-stone-400';

  return (
    <div
      className={`rounded-xl border p-5 transition-all duration-300 ${
        isActive
          ? 'border-red-700 bg-red-950/20 shadow-lg shadow-red-950/30'
          : 'border-stone-700 bg-stone-900 hover:border-stone-600'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`text-3xl ${isActive ? 'animate-pulse' : ''}`}>{icon}</span>
          <div>
            <h3 className={`font-bold text-base ${isActive ? 'text-red-300' : 'text-amber-300'}`}>
              {label}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {impact && (
                <span className={`text-xs font-medium ${severityColor}`}>
                  {impact.severity} Impact
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-red-900/60 text-red-300 border border-red-700'
                    : 'bg-green-900/40 text-green-400 border border-green-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-red-400 animate-pulse' : 'bg-green-500'
                  }`}
                />
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          onClick={onToggle}
          disabled={isLoading}
          title={isActive ? `Disable ${label}` : `Enable ${label}`}
          className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-900 disabled:opacity-50 disabled:cursor-not-allowed ${
            isActive
              ? 'bg-red-600 focus:ring-red-500'
              : 'bg-stone-600 focus:ring-stone-500'
          }`}
          style={{ minWidth: '3.25rem' }}
          aria-label={`${isActive ? 'Disable' : 'Enable'} ${label}`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
              isActive ? 'translate-x-7' : 'translate-x-1'
            } ${isLoading ? 'opacity-70' : ''}`}
          />
          {isLoading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" />
            </span>
          )}
        </button>
      </div>

      {/* Description */}
      <p className="text-stone-400 text-sm leading-relaxed mb-3">{description}</p>

      {/* Affected endpoint */}
      {impact && (
        <div className="bg-stone-800/60 rounded-lg px-3 py-2 text-xs">
          <span className="text-stone-500">Affected: </span>
          <code className={`font-mono ${isActive ? 'text-red-400' : 'text-stone-400'}`}>
            {impact.endpoints}
          </code>
        </div>
      )}

      {/* Active CTA */}
      {isActive && (
        <button
          onClick={onToggle}
          disabled={isLoading}
          className="mt-3 w-full btn-success text-sm py-2 disabled:opacity-50"
        >
          {isLoading ? 'Disabling…' : '✓ Disable — Restore Normal Operation'}
        </button>
      )}
    </div>
  );
}
