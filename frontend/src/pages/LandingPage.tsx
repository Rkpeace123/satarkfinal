import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart2,
  Shield,
  Cpu,
  Users,
  CheckCircle,
  ArrowRight,
  Activity,
  FileText,
  Database,
  Zap
} from 'lucide-react'
import { api } from '../api/client'

interface CapabilityCard {
  icon: React.ReactNode
  title: string
  subtitle: string
  description: string
  color: string
  bgColor: string
  borderColor: string
}

const capabilities: CapabilityCard[] = [
  {
    icon: <FileText size={24} />,
    title: 'Creation Plane',
    subtitle: 'AI-Powered Survey Design',
    description:
      'Describe your survey in plain language — SATARK generates a structured question graph with skip logic, code bindings, and consent flows automatically.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  {
    icon: <Users size={24} />,
    title: 'Collection Plane',
    subtitle: 'Smart Conversational Collection',
    description:
      'Enumerators collect data via a chat-like interface with real-time occupation coding (NCO/NIC), multilingual support, and prepopulated Census fields.',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30'
  },
  {
    icon: <Shield size={24} />,
    title: 'Trust Plane',
    subtitle: 'Enumerator Trust Scoring',
    description:
      'Every submission runs through a 4-layer validation pipeline and 7-signal fraud engine. Trust scores update dynamically, flagging bad actors in real time.',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30'
  },
  {
    icon: <Cpu size={24} />,
    title: 'Intelligence Plane',
    subtitle: 'Explainable AI Decisions',
    description:
      'Every auto-code, validation result, and action decision carries a human-readable explanation — full audit trails for statistical reviewers and field supervisors.',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30'
  }
]

const stats = [
  { label: 'NCO/NIC Codes', value: '2,400+' },
  { label: 'Languages', value: '3' },
  { label: 'Validation Layers', value: '4' },
  { label: 'Fraud Signals', value: '7' }
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartSurvey = async () => {
    setLoading(true)
    setError(null)
    try {
      const statsData = await api.getStats()
      navigate(`/survey/${statsData.sampleSurveyId ?? statsData.sampleSurveyId}`)
    } catch (err) {
      setError('Could not connect to SATARK backend. Make sure the API server is running.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        {/* Top nav */}
        <div className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <BarChart2 size={20} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-100 text-lg tracking-wide">SATARK</span>
              <span className="text-slate-500 text-xs ml-2">v2.0</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            System Online
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-5xl mx-auto px-8 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium mb-6">
            <Activity size={12} />
            Hackathon MVP — Census 2026 Ready
          </div>

          <h1 className="text-6xl font-bold text-slate-100 mb-4 tracking-tight">
            <span className="text-blue-400">SATARK</span>
          </h1>
          <p className="text-slate-300 text-xl font-medium mb-3">
            Statistical Analysis, Trust and Automation for Response Knowledge
          </p>
          <p className="text-slate-400 text-base max-w-2xl mx-auto mb-10 leading-relaxed">
            India's next-generation survey intelligence platform — one explainability spine across{' '}
            <span className="text-slate-300">create</span>,{' '}
            <span className="text-slate-300">collect</span>,{' '}
            <span className="text-slate-300">code</span>,{' '}
            <span className="text-slate-300">validate</span>, and{' '}
            <span className="text-slate-300">act</span>.
          </p>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-8 mb-10">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-blue-400">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleStartSurvey}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Start Survey (Demo)
                  <ArrowRight size={16} />
                </>
              )}
            </button>
            <button
              onClick={() => navigate('/supervisor')}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all border border-slate-600"
            >
              <Activity size={16} />
              Supervisor Dashboard
            </button>
          </div>

          {error && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Capability Cards */}
      <div className="max-w-5xl mx-auto px-8 py-16 w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">The Four Planes of SATARK</h2>
          <p className="text-slate-400 text-sm">
            A unified pipeline from survey design to field action
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {capabilities.map((cap) => (
            <div
              key={cap.title}
              className={`${cap.bgColor} border ${cap.borderColor} rounded-2xl p-6 hover:scale-[1.01] transition-transform`}
            >
              <div className={`${cap.color} mb-4`}>{cap.icon}</div>
              <div className="mb-1">
                <span className="text-slate-100 font-semibold text-base">{cap.title}</span>
                <span className={`text-xs ml-2 ${cap.color}`}>{cap.subtitle}</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">{cap.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline Visual */}
      <div className="max-w-5xl mx-auto px-8 pb-16 w-full">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-slate-100 mb-6 text-center">
            End-to-End Intelligence Pipeline
          </h2>
          <div className="flex items-center justify-between">
            {[
              { icon: <FileText size={18} />, label: 'Create', sub: 'AI builder', color: 'text-blue-400', bg: 'bg-blue-500/20' },
              { icon: <Users size={18} />, label: 'Collect', sub: 'Chat UI', color: 'text-green-400', bg: 'bg-green-500/20' },
              { icon: <Database size={18} />, label: 'Code', sub: 'NCO/NIC AI', color: 'text-purple-400', bg: 'bg-purple-500/20' },
              { icon: <Shield size={18} />, label: 'Validate', sub: '4-layer', color: 'text-amber-400', bg: 'bg-amber-500/20' },
              { icon: <Zap size={18} />, label: 'Act', sub: 'Supervisor', color: 'text-red-400', bg: 'bg-red-500/20' }
            ].map((step, i, arr) => (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-xl ${step.bg} flex items-center justify-center ${step.color}`}>
                    {step.icon}
                  </div>
                  <div className="text-center">
                    <div className={`text-sm font-semibold ${step.color}`}>{step.label}</div>
                    <div className="text-xs text-slate-500">{step.sub}</div>
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex-1 flex items-center px-2">
                    <div className="h-px flex-1 bg-slate-600" />
                    <ArrowRight size={14} className="text-slate-600 mx-1" />
                    <div className="h-px flex-1 bg-slate-600" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Demo Flow Walkthrough */}
      <div className="max-w-5xl mx-auto px-8 pb-16 w-full">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Try the Demo Flow</h2>
          <p className="text-slate-400 text-sm mb-6">Walk through a complete survey session in under 3 minutes</p>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Click "Start Survey (Demo)" — household HH-TN-0042 is pre-filled from Census data', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
              { step: '2', text: 'Grant consent on the consent screen — logged with timestamp and scope', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
              { step: '3', text: 'Answer questions. When asked about occupation, type "auto driver" and wait 600ms', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
              { step: '4', text: 'Watch the Auto-Code Chip appear: NCO 8322 — Drivers, auto-rickshaw — 94% confidence', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
              { step: '5', text: 'Submit. See your confidence score, fraud signals, and action (approve/review/reinterview)', color: 'text-red-400 bg-red-500/10 border-red-500/30' }
            ].map((item) => (
              <div key={item.step} className={`flex items-start gap-3 p-3 rounded-lg border ${item.color} border-opacity-30`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${item.color}`}>
                  {item.step}
                </div>
                <p className="text-slate-300 text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features checklist */}
      <div className="max-w-5xl mx-auto px-8 pb-16 w-full">
        <div className="grid grid-cols-3 gap-4">
          {[
            'Multilingual: English, Hindi, Tamil',
            'Real-time NCO/NIC auto-coding',
            'WebSocket live supervisor feed',
            'Trust score with audit trail',
            '4-layer validation pipeline',
            '7-signal fraud detection',
            'Prepopulated Census fields',
            'Consent logging with audit',
            'No-code survey builder',
            'Explainable AI decisions',
            'Coding review queue',
            'Full response drilldown'
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm text-slate-400">
              <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
              {feature}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 py-6">
        <div className="max-w-5xl mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Shield size={14} />
            <span>Built for MoSPI · Census 2026 · NSSO</span>
          </div>
          <div className="text-slate-600 text-xs">
            Statistics Act 2008 · Data Protection Standards
          </div>
        </div>
      </div>
    </div>
  )
}
