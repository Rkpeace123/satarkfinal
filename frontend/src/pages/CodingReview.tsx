import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Tag,
  CheckCircle,
  Edit3,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import clsx from 'clsx'
import type { ResponseDetail } from '../types'
import { api } from '../api/client'

interface CodingItem {
  responseId: string
  questionId: string
  rawText: string
  system: string
  suggestedCode: string
  codeLabel: string
  confidence: number
  reason: string
  alternatives: unknown[]
  status: string
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color =
    pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
  const textColor =
    pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden max-w-[100px]">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={clsx('text-xs font-semibold w-8', textColor)}>{pct}%</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    auto: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
    corrected: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    review: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  }
  return (
    <span className={clsx('px-2 py-0.5 rounded border text-xs font-bold uppercase', map[status] || map.review)}>
      {status}
    </span>
  )
}

function CodingItemCard({
  item,
  onConfirm,
  onCorrect
}: {
  item: CodingItem
  onConfirm: (id: string, qId: string) => void
  onCorrect: (id: string, qId: string, newCode: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [done, setDone] = useState<'confirmed' | 'corrected' | null>(null)

  const handleConfirm = () => {
    onConfirm(item.responseId, item.questionId)
    setDone('confirmed')
  }

  const handleCorrect = () => {
    if (!newCode.trim()) return
    onCorrect(item.responseId, item.questionId, newCode.trim())
    setDone('corrected')
    setCorrecting(false)
  }

  return (
    <div
      className={clsx(
        'bg-slate-800 border rounded-2xl p-4 transition-all',
        item.status === 'review'
          ? 'border-amber-500/20'
          : 'border-slate-700/50',
        done ? 'opacity-60' : ''
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Tag size={13} className="text-purple-400 flex-shrink-0" />
            <span className="text-slate-200 font-semibold text-sm">"{item.rawText}"</span>
            <StatusBadge status={done ?? item.status} />
          </div>
          <div className="text-slate-500 text-xs font-mono">
            Response: {item.responseId.slice(0, 16)}… · Q: {item.questionId}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Suggestion */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">System:</span>
          <span className="text-slate-300 font-mono text-xs">{item.system}</span>
        </div>
        <ChevronRight size={12} className="text-slate-600" />
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-purple-400">{item.suggestedCode}</span>
          <span className="text-slate-300 text-sm">{item.codeLabel}</span>
        </div>
        <ConfidenceBar value={item.confidence} />
      </div>

      {/* Reason */}
      <div className="text-slate-400 text-xs italic mb-3">"{item.reason}"</div>

      {/* Expanded alternatives */}
      {expanded && item.alternatives && Array.isArray(item.alternatives) && item.alternatives.length > 0 && (
        <div className="mb-3 p-3 bg-slate-900/60 rounded-xl border border-slate-700">
          <div className="text-slate-500 text-xs mb-2">Alternative Codes</div>
          <div className="space-y-1.5">
            {(item.alternatives as Array<{ code?: string; label?: string; confidence?: number }>).map((alt, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="font-mono text-slate-400 w-16">{alt.code}</span>
                <span className="text-slate-400 flex-1">{alt.label}</span>
                <ConfidenceBar value={alt.confidence ?? 0} />
                <button
                  onClick={() => {
                    setNewCode(alt.code ?? '')
                    setCorrecting(true)
                  }}
                  className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                >
                  Use this
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correction input */}
      {correcting && !done && (
        <div className="mb-3 flex gap-2">
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Enter correct code…"
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={handleCorrect}
            disabled={!newCode.trim()}
            className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-semibold hover:bg-purple-500/30 disabled:opacity-40 transition-all"
          >
            Apply
          </button>
          <button
            onClick={() => setCorrecting(false)}
            className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Action buttons */}
      {!done && (
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 border border-green-500/30 text-xs font-semibold hover:bg-green-500/25 transition-all"
          >
            <CheckCircle size={12} />
            Confirm {item.suggestedCode}
          </button>
          <button
            onClick={() => setCorrecting(!correcting)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/25 transition-all"
          >
            <Edit3 size={12} />
            Correct Code
          </button>
        </div>
      )}

      {done && (
        <div className={clsx(
          'flex items-center gap-1.5 text-xs font-semibold',
          done === 'confirmed' ? 'text-green-400' : 'text-purple-400'
        )}>
          <CheckCircle size={12} />
          {done === 'confirmed' ? `Confirmed: ${item.suggestedCode}` : `Corrected to: ${newCode}`}
        </div>
      )}
    </div>
  )
}

export default function CodingReview() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CodingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('review')

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const responses = await api.getResponses()
      const allItems: CodingItem[] = []
      for (const resp of responses.slice(0, 8)) {
        try {
          const detail: ResponseDetail = await api.getResponse(resp.id)
          if (detail.codingResults) {
            for (const cr of detail.codingResults) {
              allItems.push({
                responseId: resp.id,
                questionId: cr.questionId,
                rawText: cr.rawText,
                system: cr.system,
                suggestedCode: cr.suggestedCode,
                codeLabel: cr.codeLabel,
                confidence: cr.confidence,
                reason: cr.reason,
                alternatives: cr.alternatives,
                status: cr.status
              })
            }
          }
        } catch {
          // skip failed fetches
        }
      }
      setItems(allItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coding queue')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (responseId: string, _questionId: string) => {
    try {
      await api.takeAction({ response_id: responseId, action_type: 'confirm_code' })
    } catch {
      // ignore
    }
  }

  const handleCorrect = async (responseId: string, _questionId: string, _newCode: string) => {
    try {
      await api.takeAction({ response_id: responseId, action_type: 'correct_code', note: _newCode })
    } catch {
      // ignore
    }
  }

  const filteredItems = filter === 'all' ? items : items.filter((i) => i.status === filter)
  const reviewCount = items.filter((i) => i.status === 'review').length

  return (
    <div className="min-h-screen bg-slate-900 pt-12">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/supervisor')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm mb-3 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Command Center
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-slate-100 font-bold text-xl flex items-center gap-2">
                <Tag size={18} className="text-purple-400" />
                Coding Review Queue
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Review and confirm NCO/NIC auto-coded entries
              </p>
            </div>
            <div className="flex items-center gap-3">
              {reviewCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle size={14} className="text-red-400" />
                  <span className="text-red-400 font-bold text-sm">{reviewCount} pending</span>
                </div>
              )}
              <button
                onClick={loadItems}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-5">
        {/* Filters */}
        <div className="flex items-center gap-2 mb-5">
          {['all', 'review', 'auto', 'confirmed', 'corrected'].map((f) => {
            const count = f === 'all' ? items.length : items.filter((i) => i.status === f).length
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                  filter === f
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-500 hover:text-slate-300 bg-slate-800 border border-slate-700'
                )}
              >
                {f}
                {count > 0 && (
                  <span
                    className={clsx(
                      'px-1.5 rounded-full text-xs font-bold',
                      f === 'review' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-2xl skeleton" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle size={32} className="text-red-400 mb-3" />
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button
              onClick={loadItems}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
              <CheckCircle size={24} className="text-green-400" />
            </div>
            <h3 className="text-slate-200 font-semibold mb-1">All Caught Up!</h3>
            <p className="text-slate-500 text-sm">
              {filter === 'all'
                ? 'No coding results found. Submit a survey to generate some.'
                : `No items with status "${filter}"`}
            </p>
          </div>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <div className="space-y-3">
            {filteredItems.map((item, i) => (
              <CodingItemCard
                key={`${item.responseId}-${item.questionId}-${i}`}
                item={item}
                onConfirm={handleConfirm}
                onCorrect={handleCorrect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
