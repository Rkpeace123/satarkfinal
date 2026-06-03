import { useState } from 'react'
import { Shield, CheckCircle, X, Lock, FileText, Users } from 'lucide-react'

interface ConsentScreenProps {
  onConsent: () => void
  onDecline: () => void
}

export default function ConsentScreen({ onConsent, onDecline }: ConsentScreenProps) {
  const [accepted, setAccepted] = useState(false)
  const [declining, setDeclining] = useState(false)

  const handleConsent = () => {
    setAccepted(true)
    setTimeout(() => {
      onConsent()
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-sm">
      <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/10 border-b border-slate-700 px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
            <Shield size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-slate-100 font-semibold text-base">Data Collection Consent</h2>
            <p className="text-slate-400 text-xs mt-0.5">National Employment Household Survey — MoSPI</p>
          </div>
          <div className="ml-auto">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30">
              <Lock size={11} className="text-green-400" />
              <span className="text-green-400 text-xs font-medium">Secured</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Consent text */}
          <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
            <p>
              Your participation in this{' '}
              <span className="text-slate-200 font-medium">National Employment Household Survey</span> is
              entirely voluntary. Data collected will be used solely for official statistical purposes
              under the{' '}
              <span className="text-slate-200 font-medium">Statistics Act, 2008</span> and related
              regulations issued by the Ministry of Statistics and Programme Implementation (MoSPI).
            </p>
            <p>
              All information provided will be kept{' '}
              <span className="text-slate-200 font-medium">strictly confidential</span>. Individual
              responses will never be disclosed to any person, department, or authority. Published
              statistical outputs contain only aggregated data — no individual identification is
              possible in any published result.
            </p>
          </div>

          {/* Scope breakdown */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FileText size={15} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-slate-200 text-xs font-medium mb-1">Information Collected</div>
                <div className="text-slate-400 text-xs">
                  Name, Age, Employment Status, Occupation, Industry, Income, Household Size,
                  Educational Qualification
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users size={15} className="text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-slate-200 text-xs font-medium mb-1">Purpose</div>
                <div className="text-slate-400 text-xs">
                  National employment and household statistics — no individual identification in
                  published data. Reference period: Annual 2025-26.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield size={15} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-slate-200 text-xs font-medium mb-1">Your Rights</div>
                <div className="text-slate-400 text-xs">
                  You may skip any question or withdraw at any time without consequence. Declining will
                  not affect any government benefit or service.
                </div>
              </div>
            </div>
          </div>

          {/* Legal reference */}
          <p className="text-slate-500 text-xs">
            Data protected under Statistics Act 2008, Section 27. Enumerator identity verified by
            SATARK Trust System. Survey ID logged for audit purposes.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleConsent}
            disabled={accepted}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-blue-500/20"
          >
            {accepted ? (
              <>
                <CheckCircle size={16} />
                Consent Recorded
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                I Consent to Participate
              </>
            )}
          </button>
          <button
            onClick={() => {
              setDeclining(true)
              setTimeout(onDecline, 200)
            }}
            disabled={declining || accepted}
            className="px-4 py-3 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-xl transition-all border border-slate-600 font-medium text-sm disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
