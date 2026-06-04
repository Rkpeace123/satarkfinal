import { Tag, CheckCircle, Edit3, AlertTriangle } from 'lucide-react'
import type { CodingResult } from '../types'
import clsx from 'clsx'

interface AutoCodeChipProps {
  result: CodingResult
  onConfirm: () => void
  onEdit: () => void
  loading?: boolean
}

export default function AutoCodeChip({ result, onConfirm, onEdit, loading }: AutoCodeChipProps) {
  const isHighConf = result.confidence >= 0.8
  const confidencePct = Math.round(result.confidence * 100)

  return (
    <div
      className={clsx(
        'slide-up mt-2 rounded-xl border p-3 text-xs',
        isHighConf
          ? 'bg-green-500/5 border-green-500/30'
          : 'bg-amber-500/5 border-amber-500/30'
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={clsx(
            'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold',
            isHighConf
              ? 'bg-green-500/15 text-green-400'
              : 'bg-amber-500/15 text-amber-400'
          )}
        >
          {isHighConf ? <Tag size={10} /> : <AlertTriangle size={10} />}
          {isHighConf ? 'Auto-coded' : 'Needs review'}
        </div>
        <span className={clsx('font-bold text-sm', isHighConf ? 'text-green-300' : 'text-amber-300')}>
          {result.suggestedCode ?? result.suggestedCode}
        </span>
        {loading && (
          <div className="ml-auto w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Code label */}
      <div className="text-slate-300 font-medium mb-1.5">{result.codeLabel ?? result.codeLabel}</div>

      {/* Confidence bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-500">Confidence</span>
          <span className={clsx('font-semibold', isHighConf ? 'text-green-400' : 'text-amber-400')}>
            {confidencePct}%
          </span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              isHighConf ? 'bg-green-500' : 'bg-amber-500'
            )}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>

      {/* Reason */}
      <div className="text-slate-400 italic mb-3">"{result.reason}"</div>

      {/* Alternatives */}
      {result.alternatives && result.alternatives.length > 0 && (
        <div className="mb-3">
          <div className="text-slate-500 mb-1">Also considered:</div>
          <div className="flex flex-wrap gap-1.5">
            {result.alternatives.slice(0, 3).map((alt) => (
              <div
                key={alt.code}
                className="px-2 py-0.5 rounded bg-slate-700/60 border border-slate-600 text-slate-400"
              >
                {alt.code} · {alt.label} · {Math.round(alt.confidence * 100)}%
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all',
            isHighConf
              ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30'
              : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
          )}
        >
          <CheckCircle size={12} />
          Confirm
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-600 transition-all"
        >
          <Edit3 size={12} />
          Change
        </button>
      </div>
    </div>
  )
}
