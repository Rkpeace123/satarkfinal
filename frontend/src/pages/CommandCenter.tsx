import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  Users,
  BarChart2,
  CheckCircle,
  AlertTriangle,
  Code,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  LogOut
} from 'lucide-react'
import type { EnumeratorProfile, Stats } from '../types'
import { api } from '../api/client'
import { getUser, clearAuth } from '../api/auth'
import FlagFeed from '../components/FlagFeed'
import EnumeratorRoster from '../components/EnumeratorRoster'
import clsx from 'clsx'

type Tab = 'live' | 'responses' | 'coding'

function StatCard({
  label,
  value,
  icon,
  sub,
  color = 'text-blue-400'
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
      <div className={clsx('mt-0.5', color)}>{icon}</div>
      <div className="min-w-0">
        <div className={clsx('text-xl font-bold', color)}>{value}</div>
        <div className="text-slate-400 text-xs font-medium">{label}</div>
        {sub && <div className="text-slate-500 text-xs mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export default function CommandCenter() {
  const navigate = useNavigate()
  const user = getUser()
  const [activeTab, setActiveTab] = useState<Tab>('live')
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [enumerators, setEnumerators] = useState<EnumeratorProfile[]>([])
  const [enumLoading, setEnumLoading] = useState(true)
  const [selectedEnumId, setSelectedEnumId] = useState<string | null>(null)

  useEffect(() => {
    api.getStats()
      .then((s) => { setStats(s); setStatsLoading(false) })
      .catch(() => setStatsLoading(false))

    api.getEnumerators()
      .then((e) => { setEnumerators(e); setEnumLoading(false) })
      .catch(() => setEnumLoading(false))
  }, [])

  const flaggedPct = stats
    ? stats.totalResponses > 0
      ? Math.round((stats.flaggedCount / stats.totalResponses) * 100)
      : 0
    : 0

  return (
    <div className="min-h-screen bg-slate-900 pt-12 flex flex-col">
      {/* GoI branding strip */}
      <div className="bg-[#002366] border-b-4 border-[#FF9933] px-6 py-2 flex items-center gap-3">
        <span className="text-[#FF9933]">☸</span>
        <span className="text-white font-bold text-xs tracking-wide">Government of India · Ministry of Statistics &amp; Programme Implementation</span>
        <span className="text-[#FF9933] text-xs ml-1">· MoSPI · NSO</span>
      </div>
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div>
            <h1 className="text-slate-100 font-bold text-lg flex items-center gap-2">
              <Activity size={18} className="text-blue-400" />
              Command Center
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              NSSO Field Operations · Real-time Intelligence Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-slate-400 text-xs">{user.name}</span>
            )}
            <button
              onClick={() => {
                setStatsLoading(true)
                api.getStats().then((s) => { setStats(s); setStatsLoading(false) }).catch(() => setStatsLoading(false))
                api.getEnumerators().then((e) => setEnumerators(e)).catch(() => {})
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/supervisor/coding')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs border border-amber-500/30 transition-colors"
            >
              <Code size={12} />
              Coding Review
              {stats?.pendingCodingReview ? (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                  {stats.pendingCodingReview}
                </span>
              ) : null}
            </button>
            <button
              onClick={() => { clearAuth(); navigate('/login') }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
            >
              <LogOut size={12} />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3">
        <div className="grid grid-cols-5 gap-3 max-w-screen-2xl mx-auto">
          {statsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl skeleton" />
            ))
          ) : (
            <>
              <StatCard
                label="Total Responses"
                value={stats?.totalResponses ?? 0}
                icon={<BarChart2 size={16} />}
                color="text-blue-400"
              />
              <StatCard
                label="Flagged"
                value={`${flaggedPct}%`}
                icon={<AlertTriangle size={16} />}
                sub={`${stats?.flaggedCount ?? 0} responses`}
                color={flaggedPct > 15 ? 'text-red-400' : 'text-amber-400'}
              />
              <StatCard
                label="Avg Confidence"
                value={stats ? `${Math.round(stats.avgConfidenceScore * 100)}%` : '—'}
                icon={<CheckCircle size={16} />}
                color="text-green-400"
              />
              <StatCard
                label="Avg Trust Score"
                value={stats ? Math.round(stats.avgTrustScore) : '—'}
                icon={
                  stats && stats.avgTrustScore < 70
                    ? <TrendingDown size={16} />
                    : <TrendingUp size={16} />
                }
                color={stats && stats.avgTrustScore < 60 ? 'text-red-400' : stats && stats.avgTrustScore < 75 ? 'text-amber-400' : 'text-green-400'}
              />
              <StatCard
                label="Active Enumerators"
                value={stats?.enumeratorCount ?? 0}
                icon={<Users size={16} />}
                color="text-purple-400"
              />
            </>
          )}
        </div>
      </div>

      {/* Main two-panel layout */}
      <div className="flex-1 flex max-w-screen-2xl mx-auto w-full px-6 py-4 gap-4 min-h-0">
        {/* Left 60% — Feed */}
        <div className="flex-1 flex flex-col min-h-0" style={{ flex: '3' }}>
          {/* Tab nav */}
          <div className="flex items-center gap-1 mb-4 bg-slate-800 border border-slate-700 rounded-xl p-1 flex-shrink-0">
            {([
              { id: 'live', label: 'Live Feed', icon: <Activity size={13} /> },
              { id: 'responses', label: 'All Responses', icon: <BarChart2 size={13} /> },
              { id: 'coding', label: 'Coding Review', icon: <Code size={13} /> }
            ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id === 'coding') navigate('/supervisor/coding')
                }}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4">
            {activeTab === 'live' && <FlagFeed />}
            {activeTab === 'responses' && <AllResponsesPanel />}
          </div>
        </div>

        {/* Right 40% — Roster */}
        <div className="flex flex-col min-h-0" style={{ flex: '2' }}>
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-slate-200 font-semibold text-sm flex items-center gap-2">
              <Users size={15} className="text-purple-400" />
              Enumerator Roster
            </h3>
            <span className="text-slate-500 text-xs">Sorted by trust ↑</span>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4">
            {enumLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 rounded-xl skeleton" />
                ))}
              </div>
            ) : (
              <EnumeratorRoster
                enumerators={enumerators}
                onSelect={(enumId) => {
                  setSelectedEnumId(enumId)
                  navigate(`/supervisor?enumerator=${enumId}`)
                }}
                selectedId={selectedEnumId || undefined}
              />
            )}
          </div>

          {/* Selected enumerator quick stats */}
          {selectedEnumId && enumerators.length > 0 && (
            <EnumeratorQuickView
              enumerator={enumerators.find((e) => e.id === selectedEnumId)!}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function AllResponsesPanel() {
  const navigate = useNavigate()
  const [responses, setResponses] = useState<import('../types').ResponseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const filters = filter !== 'all' ? { status: filter } : {}
    api.getResponses(filters)
      .then((d) => { setResponses(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        {['all', 'review', 'approve', 'reinterview'].map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setLoading(true) }}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors capitalize',
              filter === s
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5">
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg skeleton" />
        ))}
        {!loading && responses.length === 0 && (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
            No responses found
          </div>
        )}
        {responses.map((r) => (
          <div
            key={r.id}
            onClick={() => navigate(`/supervisor/response/${r.id}`)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 cursor-pointer transition-all text-xs"
          >
            <span className="font-mono text-slate-500 text-xs truncate w-28">{r.id.slice(0, 12)}…</span>
            <span className="text-slate-400 truncate flex-1">{r.enumeratorName}</span>
            <span className="text-slate-500 font-mono">{r.householdId}</span>
            <span className={clsx(
              'px-2 py-0.5 rounded font-bold uppercase',
              r.status === 'approve' ? 'bg-green-500/10 text-green-400' :
                r.status === 'review' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-red-500/10 text-red-400'
            )}>
              {r.status}
            </span>
            <span className="text-slate-400">{Math.round(r.confidenceScore * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EnumeratorQuickView({ enumerator }: { enumerator: EnumeratorProfile }) {
  if (!enumerator) return null
  const isAtRisk = enumerator.trustScore ?? enumerator.trustScore < 60
  return (
    <div className={clsx(
      'mt-3 p-3 rounded-xl border text-xs flex-shrink-0',
      isAtRisk ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-800 border-slate-700'
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-200 font-semibold">{enumerator.name}</span>
        <span className={clsx('font-bold', isAtRisk ? 'text-red-400' : 'text-green-400')}>
          Trust: {enumerator.trustScore ?? enumerator.trustScore}
        </span>
      </div>
      <div className="text-slate-500">{enumerator.fsuId ?? enumerator.fsuId} · {enumerator.phone}</div>
    </div>
  )
}
