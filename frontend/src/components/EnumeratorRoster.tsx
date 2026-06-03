import { TrendingDown, TrendingUp, Minus, ChevronRight, User } from 'lucide-react'
import type { EnumeratorProfile } from '../types'
import TrustBadge from './TrustBadge'
import clsx from 'clsx'

interface EnumeratorRosterProps {
  enumerators: EnumeratorProfile[]
  onSelect: (id: string) => void
  selectedId?: string
}

function DeltaIcon({ delta }: { delta?: number }) {
  if (delta === undefined || delta === null) return <Minus size={12} className="text-slate-500" />
  if (delta > 0) return <TrendingUp size={12} className="text-green-400" />
  if (delta < 0) return <TrendingDown size={12} className="text-red-400" />
  return <Minus size={12} className="text-slate-500" />
}

export default function EnumeratorRoster({ enumerators, onSelect, selectedId }: EnumeratorRosterProps) {
  const sorted = [...enumerators].sort((a, b) => a.trust_score - b.trust_score)

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <User size={28} className="text-slate-600 mb-3" />
        <p className="text-slate-500 text-sm">No enumerators found</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {sorted.map((enumerator) => {
        const isSelected = enumerator.id === selectedId
        const isAtRisk = enumerator.trust_score < 60
        const isWatching = enumerator.trust_score >= 60 && enumerator.trust_score < 80

        return (
          <div
            key={enumerator.id}
            onClick={() => onSelect(enumerator.id)}
            className={clsx(
              'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
              isSelected
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-slate-900/50 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50',
              isAtRisk && !isSelected && 'border-red-500/20'
            )}
          >
            {/* Trust badge */}
            <TrustBadge score={enumerator.trust_score} size="sm" />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-200 text-sm font-medium truncate">{enumerator.name}</span>
                {isAtRisk && (
                  <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-xs font-semibold flex-shrink-0">
                    AT RISK
                  </span>
                )}
                {isWatching && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-xs font-semibold flex-shrink-0">
                    WATCH
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-slate-500 text-xs font-mono">{enumerator.fsu_id}</span>
                <span className="text-slate-600 text-xs">·</span>
                <span className={clsx(
                  'text-xs capitalize',
                  enumerator.status === 'active' ? 'text-green-400' : 'text-slate-500'
                )}>
                  {enumerator.status}
                </span>
              </div>
            </div>

            {/* Delta indicator */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <DeltaIcon delta={undefined} />
              <ChevronRight size={14} className="text-slate-600" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
