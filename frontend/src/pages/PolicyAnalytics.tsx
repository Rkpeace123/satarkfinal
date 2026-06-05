import React, { useState, useEffect, useCallback } from 'react'
import { Download, Search, TrendingUp, Users, AlertTriangle, CheckCircle, BarChart2, LogOut } from 'lucide-react'
import { getUser, clearAuth } from '../api/auth'
import { useNavigate } from 'react-router-dom'

interface Analytics {
  confidence_threshold: number
  total_responses: number
  included_responses: number
  excluded_responses: number
  inclusion_rate: number
  avg_income_included: number
  employment_distribution: Record<string, number>
  avg_trust_score: number
  high_fraud_responses: number
  confidence_distribution: { high_confidence: number; medium_confidence: number; low_confidence: number }
}

interface QueryResult {
  answer: string
  confidence_note: string
}

export default function PolicyAnalytics() {
  const navigate = useNavigate()
  const user = getUser()
  const [threshold, setThreshold] = useState(50)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [querying, setQuerying] = useState(false)

  const fetchAnalytics = useCallback(async (t: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?confidence_threshold=${t}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('satark_token')}` }
      })
      setAnalytics(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAnalytics(threshold) }, [threshold, fetchAnalytics])

  async function runQuery() {
    if (!query.trim()) return
    setQuerying(true)
    try {
      const res = await fetch(`/api/analytics/query?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('satark_token')}` }
      })
      setQueryResult(await res.json())
    } finally { setQuerying(false) }
  }

  async function downloadExport(fmt: 'csv' | 'json') {
    const url = `/api/export?format=${fmt}`
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('satark_token')}` } })
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `satark_export.${fmt}`
    a.click()
  }

  const thresholdColor = threshold >= 80 ? 'text-green-400' : threshold >= 50 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-[#001a4d]">
      {/* GoI Header */}
      <header className="bg-[#002366] border-b-4 border-[#FF9933]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#FF9933] flex items-center justify-center">
              <span className="text-[#FF9933]">☸</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm">SATARK · Policy Analytics</div>
              <div className="text-[#FF9933] text-xs">MoSPI · NSO</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-blue-200/60 text-sm">{user?.name}</span>
            <button onClick={() => { clearAuth(); navigate('/login') }} className="text-white/40 hover:text-white/80 flex items-center gap-1 text-sm">
              <LogOut size={14}/> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Confidence threshold slider — THE KEY FEATURE */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-lg">Confidence Threshold</h2>
              <p className="text-blue-200/50 text-sm mt-1">Only responses above this quality threshold are included in aggregates</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${thresholdColor}`}>{threshold}</div>
              <div className="text-blue-200/50 text-xs">/ 100</div>
            </div>
          </div>
          <input
            type="range" min={0} max={100} value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-full accent-[#FF9933]"
          />
          <div className="flex justify-between text-xs text-white/30 mt-1">
            <span>0 — Include all</span>
            <span>50 — Review threshold</span>
            <span>80 — High confidence only</span>
            <span>100</span>
          </div>

          {analytics && !loading && (
            <div className="mt-4 p-3 bg-[#FF9933]/5 border border-[#FF9933]/20 rounded-lg text-sm">
              <span className="text-[#FF9933] font-semibold">{analytics.included_responses}</span>
              <span className="text-white/70"> of {analytics.total_responses} responses included</span>
              <span className="text-white/40 ml-2">({analytics.inclusion_rate}% inclusion rate)</span>
              {analytics.excluded_responses > 0 && (
                <span className="text-red-400 ml-2">· {analytics.excluded_responses} low-quality excluded</span>
              )}
            </div>
          )}
        </div>

        {/* KPI tiles */}
        {analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPITile
              label="Avg Monthly Income"
              value={`₹${analytics.avg_income_included.toLocaleString('en-IN')}`}
              sub={`from ${analytics.included_responses} included responses`}
              icon={<TrendingUp size={18}/>} color="blue"
            />
            <KPITile
              label="Avg Trust Score"
              value={`${analytics.avg_trust_score}/100`}
              sub="enumerator quality average"
              icon={<Users size={18}/>}
              color={analytics.avg_trust_score >= 70 ? 'green' : 'amber'}
            />
            <KPITile
              label="High Fraud Responses"
              value={analytics.high_fraud_responses.toString()}
              sub="triggered ≥1 fraud signal"
              icon={<AlertTriangle size={18}/>} color="red"
            />
            <KPITile
              label="High Confidence"
              value={`${analytics.confidence_distribution.high_confidence}`}
              sub="score ≥80 — auto-approved"
              icon={<CheckCircle size={18}/>} color="green"
            />
          </div>
        )}

        {/* Employment distribution */}
        {analytics && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><BarChart2 size={16}/> Employment Distribution (included responses)</h3>
            <div className="space-y-2">
              {Object.entries(analytics.employment_distribution)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => {
                  const total = Object.values(analytics.employment_distribution).reduce((a, b) => a + b, 0)
                  const pct = total > 0 ? Math.round(count / total * 100) : 0
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="text-blue-200/70 text-sm w-28">{status}</span>
                      <div className="flex-1 bg-white/5 rounded-full h-4 overflow-hidden">
                        <div className="h-full bg-[#FF9933]/60 rounded-full transition-all duration-500" style={{width: `${pct}%`}}/>
                      </div>
                      <span className="text-white/70 text-sm w-12 text-right">{count}</span>
                      <span className="text-white/40 text-xs w-8">{pct}%</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Query box */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-3">Policy Query</h3>
          <p className="text-blue-200/50 text-sm mb-4">Ask questions about the data. Try: "unemployment rate", "income distribution", "agriculture workers", "enumerator quality"</p>
          <div className="flex gap-3">
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="e.g. What is the unemployment rate?"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#FF9933]/60 text-sm"
              onKeyDown={e => e.key === 'Enter' && runQuery()}
            />
            <button onClick={runQuery} disabled={querying} className="bg-[#FF9933] hover:bg-[#FF9933]/90 text-white px-5 rounded-lg font-medium flex items-center gap-2 text-sm transition-all disabled:opacity-50">
              {querying ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Search size={14}/>}
              Query
            </button>
          </div>
          {queryResult && (
            <div className="mt-4 space-y-3">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <p className="text-white/90 text-sm leading-relaxed">{queryResult.answer}</p>
                <p className="text-blue-200/50 text-xs mt-2 italic">Note: {queryResult.confidence_note}</p>
              </div>
            </div>
          )}
        </div>

        {/* Export panel */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-3">Export Data</h3>
          <p className="text-blue-200/50 text-sm mb-4">Export includes raw answers, coded values (NCO/NIC codes beside raw text), confidence scores, and reasons.</p>
          <div className="flex gap-3">
            <button onClick={() => downloadExport('csv')}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/15 transition-all text-sm font-medium">
              <Download size={14}/> Export CSV
            </button>
            <button onClick={() => downloadExport('json')}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/15 transition-all text-sm font-medium">
              <Download size={14}/> Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPITile({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
  }
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg border mb-3 ${colors[color] ?? colors['blue']}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-blue-200/50 text-xs">{label}</div>
      <div className="text-white/30 text-xs mt-0.5">{sub}</div>
    </div>
  )
}
