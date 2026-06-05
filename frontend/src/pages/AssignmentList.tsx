import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, MapPin, User, LogOut, Play } from 'lucide-react'
import { getUser, clearAuth } from '../api/auth'

export default function AssignmentList() {
  const navigate = useNavigate()
  const user = getUser()
  const [surveyId, setSurveyId] = useState('demo-survey-001')

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => {
      if (d.sampleSurveyId) setSurveyId(d.sampleSurveyId)
    }).catch(() => {})
  }, [])

  const assignments = [
    { id: 'HH-TN-0042', fsu: 'TN-FSU-042', district: 'Chennai', respondent: 'Lakshmi R', status: 'pending' },
    { id: 'HH-TN-0043', fsu: 'TN-FSU-042', district: 'Chennai', respondent: 'Ramesh K', status: 'pending' },
    { id: 'HH-TN-0044', fsu: 'TN-FSU-042', district: 'Chennai', respondent: 'Priya S', status: 'completed' },
  ]

  return (
    <div className="min-h-screen bg-[#001a4d]">
      <header className="bg-[#002366] border-b-4 border-[#FF9933]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#FF9933] flex items-center justify-center text-[#FF9933]">☸</div>
            <div>
              <div className="text-white font-bold text-sm">SATARK · Field Survey</div>
              <div className="text-[#FF9933] text-xs">MoSPI · NSO</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User size={14} className="text-green-400"/>
              <span className="text-green-400 font-medium">{user?.name}</span>
              <span className="text-white/30">· Enumerator</span>
            </div>
            <button onClick={() => { clearAuth(); navigate('/login') }} className="text-white/40 hover:text-white/80 flex items-center gap-1 text-sm">
              <LogOut size={14}/>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList size={20} className="text-[#FF9933]"/>
          <h1 className="text-white font-semibold text-lg">Assigned Households</h1>
          <span className="px-2 py-0.5 rounded bg-[#FF9933]/10 text-[#FF9933] text-xs border border-[#FF9933]/20">FSU TN-042</span>
        </div>

        <div className="space-y-3">
          {assignments.map(a => (
            <div key={a.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium text-sm">{a.id}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${a.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {a.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span className="flex items-center gap-1"><MapPin size={10}/>{a.district}</span>
                  <span className="flex items-center gap-1"><User size={10}/>{a.respondent}</span>
                </div>
              </div>
              {a.status === 'pending' && (
                <button
                  onClick={() => navigate(`/survey/${surveyId}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF9933] hover:bg-[#FF9933]/90 text-white rounded-lg text-sm font-medium transition-all"
                >
                  <Play size={12}/> Start
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
