import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ExternalLink, Clock, Wifi, WifiOff, Tag } from 'lucide-react'
import type { LiveFlag, ResponseSummary } from '../types'
import { api } from '../api/client'
import { useWebSocket } from '../hooks/useWebSocket'
import TrustBadge from './TrustBadge'
import clsx from 'clsx'

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs === 1) return '1 hr ago'
  return `${hrs} hrs ago`
}

function ActionBadge({ action }: { action: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    approve: { label: 'APPROVE', cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
    review: { label: 'REVIEW', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    reinterview: { label: 'RE-INTERVIEW', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
    flag: { label: 'FLAGGED', cls: 'bg-red-500/20 text-red-300 border-red-500/40' }
  }
  const c = cfg[action?.toLowerCase()] || cfg.review
  return (
    <span className={clsx('px-2 py-0.5 rounded border text-xs font-bold tracking-wide', c.cls)}>
      {c.label}
    </span>
  )
}

function ConfidenceScore({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="text-center">
      <div className={clsx('text-base font-bold', color)}>{pct}%</div>
      <div className="text-slate-500 text-xs">confidence</div>
    </div>
  )
}

function FraudScore({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 60 ? 'text-red-400' : pct >= 30 ? 'text-amber-400' : 'text-green-400'
  return (
    <div className="text-center">
      <div className={clsx('text-base font-bold', color)}>{pct}%</div>
      <div className="text-slate-500 text-xs">fraud risk</div>
    </div>
  )
}

function FeedItem({
  item,
  isLive = false
}: {
  item: LiveFlag | ResponseSummary
  isLive?: boolean
}) {
  const navigate = useNavigate()
  const isFlag = 'validation_failures' in item

  const responseId = 'response_id' in item ? item.response_id : item.id
  const enumeratorName = 'enumerator_name' in item ? item.enumerator_name : item.enumerator_name
  const confidenceScore = 'confidence_score' in item ? item.confidence_score : (item as LiveFlag).confidence_score
  const fraudScore = 'fraud_score' in item ? item.fraud_score : (item as LiveFlag).fraud_score
  const action = 'action' in item ? item.action : item.status
  const timestamp = 'timestamp' in item ? item.timestamp : item.created_at
  const trustScore = 'trust_score' in item ? item.trust_score : 75
  const validationFailures = isFlag ? (item as LiveFlag).validation_failures : []
  const codingResults = isFlag ? (item as LiveFlag).coding_results : []

  return (
    <div
      className={clsx(
        'bg-slate-900/60 border rounded-xl p-4 transition-all hover:border-slate-500',
        isLive ? 'border-blue-500/30 fade-in' : 'border-slate-700/60'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Trust badge */}
        <TrustBadge score={trustScore} size="sm" />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-slate-200 text-sm font-semibold">{enumeratorName}</span>
            {isLive && (
              <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 text-xs font-bold border border-blue-500/30">
                LIVE
              </span>
            )}
            <ActionBadge action={action} />
            <span className="text-slate-500 text-xs ml-auto flex items-center gap-1">
              <Clock size={10} />
              {timeAgo(timestamp)}
            </span>
          </div>

          {/* Scores row */}
          <div className="flex items-center gap-4 mb-3 p-2 bg-slate-800/50 rounded-lg">
            <ConfidenceScore score={confidenceScore} />
            <div className="w-px h-8 bg-slate-700" />
            <FraudScore score={fraudScore} />
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <div className="text-base font-bold text-slate-300">{trustScore}</div>
              <div className="text-slate-500 text-xs">trust</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-xs text-slate-500 font-mono truncate max-w-[120px]">
              {responseId}
            </div>
          </div>

          {/* Validation failures */}
          {validationFailures.length > 0 && (
            <div className="mb-2">
              <div className="text-slate-500 text-xs mb-1 flex items-center gap-1">
                <AlertTriangle size={10} />
                Validation issues:
              </div>
              <div className="flex flex-wrap gap-1">
                {validationFailures.slice(0, 2).map((f, i) => (
                  <span
                    key={i}
                    className={clsx(
                      'px-2 py-0.5 rounded text-xs border',
                      f.severity === 'critical' || f.severity === 'high'
                        ? 'bg-red-500/10 text-red-300 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    )}
                  >
                    L{f.layer}: {f.reason.slice(0, 40)}{f.reason.length > 40 ? '…' : ''}
                  </span>
                ))}
                {validationFailures.length > 2 && (
                  <span className="text-slate-500 text-xs px-2 py-0.5">
                    +{validationFailures.length - 2} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Coding results */}
          {codingResults.length > 0 && (
            <div className="mb-3">
              <div className="text-slate-500 text-xs mb-1 flex items-center gap-1">
                <Tag size={10} />
                Auto-coded:
              </div>
              <div className="flex flex-wrap gap-1">
                {codingResults.slice(0, 2).map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs">
                    {'raw' in c ? c.raw : ''} → {'code' in c ? c.code : ''} ({Math.round(('confidence' in c ? (c.confidence as number) : 0) * 100)}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* View button */}
          <button
            onClick={() => navigate(`/supervisor/response/${responseId}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors"
          >
            <ExternalLink size={11} />
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}

interface FlagFeedProps {
  maxItems?: number
}

export default function FlagFeed({ maxItems = 20 }: FlagFeedProps) {
  const [liveFlags, setLiveFlags] = useState<LiveFlag[]>([])
  const [historicalItems, setHistoricalItems] = useState<ResponseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleMessage = useCallback((flag: LiveFlag) => {
    setLiveFlags((prev) => [flag, ...prev].slice(0, maxItems))
  }, [maxItems])

  const { connected } = useWebSocket(handleMessage)

  useEffect(() => {
    api
      .getResponses({ status: 'review' })
      .then((data) => {
        setHistoricalItems(data.slice(0, 10))
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load responses')
        setLoading(false)
      })
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-slate-200 font-semibold text-sm">Live Feed</h3>
          {liveFlags.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/30">
              {liveFlags.length} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {connected ? (
            <>
              <Wifi size={12} className="text-green-400" />
              <span className="text-green-400">Connected</span>
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-slate-500" />
              <span className="text-slate-500">Reconnecting…</span>
            </>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl skeleton" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle size={24} className="text-red-400 mb-2" />
            <p className="text-red-400 text-sm mb-2">{error}</p>
            <button
              onClick={() => {
                setError(null)
                setLoading(true)
                api.getResponses({ status: 'review' })
                  .then((d) => { setHistoricalItems(d.slice(0, 10)); setLoading(false) })
                  .catch((e) => { setError(e.message); setLoading(false) })
              }}
              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && liveFlags.length === 0 && historicalItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-3">
              <Wifi size={18} className="text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm">Waiting for flagged responses…</p>
            <p className="text-slate-600 text-xs mt-1">
              {connected ? 'Monitoring live — no flags yet' : 'Connecting to feed…'}
            </p>
          </div>
        )}

        {/* Live flags first */}
        {liveFlags.map((flag, i) => (
          <FeedItem key={`live-${i}-${flag.response_id}`} item={flag} isLive />
        ))}

        {/* Historical */}
        {historicalItems.map((item) => (
          <FeedItem key={`hist-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  )
}
