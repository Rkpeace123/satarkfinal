import React, { useState } from 'react'
import { AlertTriangle, XCircle, ChevronDown, ChevronUp, Shield } from 'lucide-react'
import type { ValidationFailure } from '../types'
import clsx from 'clsx'

interface ValidationChipProps {
  failures: ValidationFailure[]
}

const severityConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  low: {
    icon: <AlertTriangle size={12} />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20'
  },
  medium: {
    icon: <AlertTriangle size={12} />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20'
  },
  high: {
    icon: <XCircle size={12} />,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20'
  },
  critical: {
    icon: <XCircle size={12} />,
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/40'
  }
}

export default function ValidationChip({ failures }: ValidationChipProps) {
  const [expanded, setExpanded] = useState(false)

  if (!failures || failures.length === 0) return null

  const maxSeverity = failures.some((f) => f.severity === 'critical' || f.severity === 'high')
    ? 'high'
    : 'medium'

  const cfg = severityConfig[maxSeverity]
  const visible = expanded ? failures : failures.slice(0, 2)

  return (
    <div className={clsx('mt-2 rounded-xl border p-3 text-xs', cfg.bg, cfg.border)}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={clsx('flex items-center gap-1.5 font-semibold', cfg.color)}>
          <Shield size={12} />
          <span>{failures.length} Validation {failures.length === 1 ? 'Issue' : 'Issues'}</span>
        </div>
        <button className={clsx('transition-colors', cfg.color)}>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visible.map((f, i) => {
          const sc = severityConfig[f.severity] || severityConfig.medium
          return (
            <div key={i} className="flex items-start gap-2">
              <div className={clsx('mt-0.5 flex-shrink-0', sc.color)}>{sc.icon}</div>
              <div className="flex-1 min-w-0">
                <span className="text-slate-300">{f.reason}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  className={clsx(
                    'px-1.5 py-0.5 rounded text-xs font-mono',
                    sc.bg,
                    sc.color
                  )}
                >
                  L{f.layer}
                </span>
                <span
                  className={clsx(
                    'px-1.5 py-0.5 rounded uppercase font-semibold text-xs',
                    sc.bg,
                    sc.color
                  )}
                >
                  {f.severity}
                </span>
              </div>
            </div>
          )
        })}
        {!expanded && failures.length > 2 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            +{failures.length - 2} more issues
          </button>
        )}
      </div>
    </div>
  )
}
