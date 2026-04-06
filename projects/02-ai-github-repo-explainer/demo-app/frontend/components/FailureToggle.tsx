'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

interface FailureToggleProps {
  mode: string
  active: boolean
  description: string
  service: string
  impact: string
  onToggle: (mode: string, currentlyActive: boolean) => Promise<void>
}

export function FailureToggle({
  mode,
  active,
  description,
  service,
  impact,
  onToggle,
}: FailureToggleProps) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      await onToggle(mode, active)
    } finally {
      setLoading(false)
    }
  }

  const modeLabel = mode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  return (
    <div
      className={`flex items-start justify-between p-3.5 rounded-lg border transition-all ${
        active
          ? 'bg-red-900/20 border-red-700/50'
          : 'bg-[#0f0f0f] border-[#2e2e2e] hover:border-[#3e3e3e]'
      }`}
    >
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        {active ? (
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle size={16} className="text-gray-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${active ? 'text-red-300' : 'text-gray-300'}`}>
              {modeLabel}
            </span>
            <span className="text-xs text-gray-600 font-mono bg-[#1a1a1a] px-1.5 py-0.5 rounded">
              {service}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{description}</p>
          {active && (
            <p className="text-xs text-red-400/80 mt-0.5">Impact: {impact}</p>
          )}
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={loading}
        className={`ml-3 flex-shrink-0 relative inline-flex items-center w-10 h-5 rounded-full transition-all focus:outline-none disabled:opacity-60 ${
          active ? 'bg-red-600' : 'bg-gray-700'
        }`}
        aria-label={active ? `Disable ${modeLabel}` : `Enable ${modeLabel}`}
      >
        {loading ? (
          <Loader2 size={10} className="absolute left-1/2 -translate-x-1/2 text-white animate-spin" />
        ) : (
          <span
            className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
              active ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        )}
      </button>
    </div>
  )
}
