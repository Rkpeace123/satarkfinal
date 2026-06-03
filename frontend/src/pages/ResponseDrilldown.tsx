import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  User,
  Clock,
  Home,
  Shield,
  Tag,
  Activity,
  ChevronRight,
  Send,
  RefreshCw
} from 'lucide-react'
import clsx from 'clsx'
import type { ResponseDetail } from '../types'
import { api } from '../api/client'
import TrustBadge from '../components/TrustBadge'

type Tab = 'overview' | 'evidence' | 'coding' | 'actions'

function ActionBadge({ action }: { action: string }) {
  const configs: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    approve: {
      label: 'APPROVE',
      cls: 'bg-green-500/15 text-green-400 border-green-500/30',
      icon: <CheckCircle size={14} />
    },
    review: {
      label: 'REVIEW',
      cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      icon: <AlertTriangle size={14} />
    },
    reinterview: {
      label: 'RE-INTERVIEW',
      cls: 'bg-red-500/15 text-red-400 border-red-500/30',
      icon: <XCircle size={14} />
    }
  }
  const cfg = configs[action?.toLowerCase()] || configs.review
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-sm', cfg.cls)}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
    critical: 'bg-red-500/20 text-red-300 border-red-500/40'
  }
  return (
    <span className={clsx('px-2 py-0.5 rounded border text-xs font-bold uppercase', map[severity] || map.medium)}>
      {severity}
    </span>
  )
}

function ScoreCircle({ score, label, color }: { score: number; label: string; color: string }) {
  const pct = Math.round(score * 100)
  const r = 28
  const circ = 2 * Math.PI * r
  const fill = (pct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={`${fill} ${circ - fill}`}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={clsx('text-lg font-bold', color.replace('stroke-', 'text-'))}>{pct}%</span>
        </div>
      </div>
      <span className="text-slate-400 text-xs">{label}</span>
    </div>
  )
}

export default function ResponseDrilldown() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [response, setResponse] = useState<ResponseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [actionNote, setActionNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionDone, setActionDone] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api.getResponse(id)
      .then((r) => { setResponse(r); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [id])

  const takeAction = async (actionType: string) => {
    if (!id) return
    setActionLoading(true)
    try {
      await api.takeAction({ response_id: id, action_type: actionType, note: actionNote })
      setActionDone(actionType)
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 pt-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Loading response…</span>
        </div>
      </div>
    )
  }

  if (error || !response) {
    return (
      <div className="min-h-screen bg-slate-900 pt-12 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <XCircle size={32} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-slate-100 font-semibold mb-2">Failed to load response</h2>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button onClick={() => navigate('/supervisor')} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity size={13} /> },
    { id: 'evidence', label: 'Evidence', icon: <Shield size={13} /> },
    { id: 'coding', label: 'Coding', icon: <Tag size={13} /> },
    { id: 'actions', label: 'Actions', icon: <Send size={13} /> }
  ]

  return (
    <div className="min-h-screen bg-slate-900 pt-12">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate('/supervisor')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm mb-3 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Command Center
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-slate-100 font-bold text-xl">Response Drilldown</h1>
              <p className="text-slate-500 text-sm font-mono mt-0.5">{response.id}</p>
            </div>
            <ActionBadge action={response.action} />
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-slate-900 border-b border-slate-800 px-6">
        <div className="max-w-5xl mx-auto flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Info cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
                <User size={16} className="text-blue-400 mt-0.5" />
                <div>
                  <div className="text-slate-400 text-xs">Enumerator</div>
                  <div className="text-slate-100 font-semibold text-sm">{response.enumerator_name}</div>
                  <div className="text-slate-500 text-xs font-mono">{response.enumerator_id}</div>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
                <Home size={16} className="text-green-400 mt-0.5" />
                <div>
                  <div className="text-slate-400 text-xs">Household</div>
                  <div className="text-slate-100 font-semibold text-sm font-mono">{response.household_id}</div>
                  <div className="text-slate-500 text-xs">FSU Survey Unit</div>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
                <Clock size={16} className="text-purple-400 mt-0.5" />
                <div>
                  <div className="text-slate-400 text-xs">Submitted</div>
                  <div className="text-slate-100 font-semibold text-sm">
                    {new Date(response.created_at).toLocaleString('en-IN')}
                  </div>
                  <div className="text-slate-500 text-xs">IST</div>
                </div>
              </div>
            </div>

            {/* Score row */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-slate-200 font-semibold mb-4">Intelligence Scores</h3>
              <div className="flex items-center justify-around">
                <ScoreCircle
                  score={response.confidence_score}
                  label="Confidence"
                  color={response.confidence_score >= 0.8 ? 'stroke-green-500 text-green-400' : response.confidence_score >= 0.5 ? 'stroke-amber-500 text-amber-400' : 'stroke-red-500 text-red-400'}
                />
                <ScoreCircle
                  score={response.fraud_score}
                  label="Fraud Risk"
                  color={response.fraud_score >= 0.6 ? 'stroke-red-500 text-red-400' : response.fraud_score >= 0.3 ? 'stroke-amber-500 text-amber-400' : 'stroke-green-500 text-green-400'}
                />
                <div className="flex flex-col items-center gap-1">
                  <TrustBadge score={75} size="lg" showLabel />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <ActionBadge action={response.action} />
                  <span className="text-slate-500 text-xs">System Decision</span>
                </div>
              </div>

              {/* Confidence breakdown bars */}
              {response.confidence_breakdown && Object.keys(response.confidence_breakdown).length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-700">
                  <div className="text-slate-400 text-xs font-medium mb-3">Confidence Breakdown</div>
                  <div className="space-y-2">
                    {Object.entries(response.confidence_breakdown).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-3 text-xs">
                        <span className="text-slate-400 w-28 capitalize">{key.replace(/_/g, ' ')}</span>
                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.round((val as number) * 100)}%` }}
                          />
                        </div>
                        <span className="text-slate-300 w-10 text-right">{Math.round((val as number) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Answers table */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h3 className="text-slate-200 font-semibold mb-4">Survey Answers</h3>
              <div className="space-y-1">
                {Object.entries(response.answers).map(([qId, ans]) => {
                  const codingForQ = response.coding_results?.find((c) => c.question_id === qId)
                  return (
                    <div key={qId} className="flex items-start gap-3 py-2 border-b border-slate-700/50 last:border-0 text-sm">
                      <span className="text-slate-500 font-mono text-xs w-28 flex-shrink-0 mt-0.5">{qId}</span>
                      <span className="text-slate-300 flex-1">
                        {typeof ans === 'object' ? JSON.stringify(ans) : String(ans)}
                      </span>
                      {codingForQ && (
                        <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                          <ChevronRight size={12} className="text-slate-600" />
                          <span className="text-purple-400 font-mono font-bold">{codingForQ.suggested_code}</span>
                          <span className="text-slate-400">{codingForQ.code_label}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Evidence Tab ── */}
        {activeTab === 'evidence' && (
          <div className="space-y-5">
            {/* Validation results */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
                <Shield size={16} className="text-amber-400" />
                Validation Results ({response.validation_results?.length ?? 0})
              </h3>
              {response.validation_results && response.validation_results.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-700">
                      <th className="text-left py-2 pr-3">Layer</th>
                      <th className="text-left py-2 pr-3">Question</th>
                      <th className="text-left py-2 pr-3">Status</th>
                      <th className="text-left py-2 pr-3">Severity</th>
                      <th className="text-left py-2 pr-3">Reason</th>
                      <th className="text-right py-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {response.validation_results.map((v, i) => (
                      <tr key={i} className="border-b border-slate-800 hover:bg-slate-900/30">
                        <td className="py-2 pr-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">L{v.layer}</span>
                        </td>
                        <td className="py-2 pr-3 font-mono text-slate-400">{v.question_id}</td>
                        <td className="py-2 pr-3">
                          {v.status === 'pass' ? (
                            <CheckCircle size={13} className="text-green-400" />
                          ) : (
                            <XCircle size={13} className="text-red-400" />
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <SeverityBadge severity={v.severity} />
                        </td>
                        <td className="py-2 pr-3 text-slate-400 max-w-xs">{v.reason}</td>
                        <td className="py-2 text-right">
                          <span className={clsx(
                            'font-semibold',
                            v.score >= 0.8 ? 'text-green-400' : v.score >= 0.5 ? 'text-amber-400' : 'text-red-400'
                          )}>
                            {Math.round(v.score * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">No validation results</div>
              )}
            </div>

            {/* Fraud signals */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400" />
                Fraud Signals ({response.fraud_signals?.length ?? 0})
              </h3>
              {response.fraud_signals && response.fraud_signals.length > 0 ? (
                <div className="space-y-2">
                  {response.fraud_signals.map((sig, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'flex items-start gap-4 p-3 rounded-xl border text-xs',
                        sig.triggered
                          ? 'bg-red-500/5 border-red-500/20'
                          : 'bg-slate-900/50 border-slate-700/50'
                      )}
                    >
                      <div className={clsx('flex-shrink-0', sig.triggered ? 'text-red-400' : 'text-green-400')}>
                        {sig.triggered ? <XCircle size={14} /> : <CheckCircle size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-slate-200 font-semibold capitalize">
                            {sig.signal_type.replace(/_/g, ' ')}
                          </span>
                          {sig.triggered && (
                            <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-bold">TRIGGERED</span>
                          )}
                        </div>
                        <div className="text-slate-400 mb-1">{sig.reason}</div>
                        <div className="flex items-center gap-3 text-slate-500">
                          <span>Value: <span className="text-slate-300">{sig.value.toFixed(2)}</span></span>
                          <span>Threshold: <span className="text-slate-300">{sig.threshold.toFixed(2)}</span></span>
                          <span>Weight: <span className="text-slate-300">{sig.weight.toFixed(2)}</span></span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full', sig.triggered ? 'bg-red-500' : 'bg-green-500')}
                            style={{ width: `${Math.min(100, (sig.value / sig.threshold) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">No fraud signals</div>
              )}
            </div>
          </div>
        )}

        {/* ── Coding Tab ── */}
        {activeTab === 'coding' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
              <Tag size={16} className="text-purple-400" />
              Coding Results
            </h3>
            {response.coding_results && response.coding_results.length > 0 ? (
              <div className="space-y-3">
                {response.coding_results.map((cr, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'p-4 rounded-xl border text-xs',
                      cr.status === 'review'
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : cr.status === 'confirmed'
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-slate-900/60 border-slate-700/60'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-slate-500">Raw text: </span>
                        <span className="text-slate-200 font-medium">"{cr.raw_text}"</span>
                      </div>
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded border uppercase font-bold flex-shrink-0 ml-3',
                          cr.status === 'auto' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            cr.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              cr.status === 'review' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        )}
                      >
                        {cr.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <div>
                        <span className="text-slate-500">System: </span>
                        <span className="font-mono text-slate-300">{cr.system}</span>
                      </div>
                      <ChevronRight size={12} className="text-slate-600" />
                      <div>
                        <span className="font-mono font-bold text-purple-400 text-sm">{cr.suggested_code}</span>
                        <span className="text-slate-300 ml-2">{cr.code_label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-slate-500">Confidence: </span>
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full max-w-[120px] overflow-hidden">
                          <div
                            className={clsx(
                              'h-full rounded-full',
                              cr.confidence >= 0.8 ? 'bg-green-500' : cr.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                            )}
                            style={{ width: `${Math.round(cr.confidence * 100)}%` }}
                          />
                        </div>
                        <span className={clsx(
                          'font-semibold',
                          cr.confidence >= 0.8 ? 'text-green-400' : cr.confidence >= 0.6 ? 'text-amber-400' : 'text-red-400'
                        )}>
                          {Math.round(cr.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-slate-400 italic">"{cr.reason}"</div>
                    {cr.status === 'review' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => takeAction('confirm_code')}
                          className="px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 border border-green-500/30 font-semibold hover:bg-green-500/25 transition-colors"
                        >
                          Confirm Code
                        </button>
                        <button
                          onClick={() => setActiveTab('actions')}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold hover:bg-amber-500/25 transition-colors"
                        >
                          Correct Code
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">No coding results</div>
            )}
          </div>
        )}

        {/* ── Actions Tab ── */}
        {activeTab === 'actions' && (
          <div className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h3 className="text-slate-200 font-semibold mb-4">Take Action</h3>

              {actionDone ? (
                <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm font-semibold">
                  <CheckCircle size={18} />
                  Action recorded: {actionDone.replace(/_/g, ' ')}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-400 text-xs mb-2 block">Supervisor Note (optional)</label>
                    <textarea
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="Add context or reason for this action…"
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => takeAction('approve')}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-all disabled:opacity-50"
                    >
                      {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      Approve Response
                    </button>
                    <button
                      onClick={() => takeAction('reinterview')}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all disabled:opacity-50"
                    >
                      {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                      Flag for Re-interview
                    </button>
                    <button
                      onClick={() => takeAction('mark_fraud')}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-all disabled:opacity-50"
                    >
                      {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />}
                      Mark as Fraud
                    </button>
                    <button
                      onClick={() => takeAction('add_comment')}
                      disabled={actionLoading || !actionNote.trim()}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-all disabled:opacity-40"
                    >
                      {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                      Add Comment
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

