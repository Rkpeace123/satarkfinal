import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, LogIn, Eye, EyeOff } from 'lucide-react'
import { login } from '../api/auth'

const DEMO_CREDS = [
  { username: 'admin',      password: 'admin123',  role: 'Administrator',   color: 'text-purple-400' },
  { username: 'lakshmi',    password: 'field123',  role: 'Enumerator',      color: 'text-green-400' },
  { username: 'suspect',    password: 'field123',  role: 'Enumerator (B)',  color: 'text-amber-400' },
  { username: 'supervisor', password: 'super123',  role: 'Supervisor',      color: 'text-blue-400' },
  { username: 'policy',     password: 'policy123', role: 'Policy Analyst',  color: 'text-cyan-400' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(u?: string, p?: string) {
    const user = u || username
    const pass = p || password
    if (!user || !pass) return
    setLoading(true)
    setError('')
    try {
      const authUser = await login(user, pass)
      // Route by role
      if (authUser.role === 'enumerator') navigate('/assignments')
      else if (authUser.role === 'supervisor') navigate('/supervisor')
      else if (authUser.role === 'policy') navigate('/policy')
      else navigate('/builder')
    } catch {
      setError('Invalid credentials. Use the demo accounts below.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#001a4d] flex flex-col">
      {/* GoI Header */}
      <header className="bg-[#002366] border-b-4 border-[#FF9933]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          {/* Ashoka Chakra placeholder */}
          <div className="w-10 h-10 rounded-full border-2 border-[#FF9933] flex items-center justify-center">
            <span className="text-[#FF9933] text-lg font-bold">☸</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-wide">Government of India · Ministry of Statistics &amp; Programme Implementation</div>
            <div className="text-[#FF9933] text-xs tracking-widest">MOSPI · NATIONAL STATISTICAL OFFICE</div>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FF9933]/10 border border-[#FF9933]/30 mb-4">
              <Shield size={32} className="text-[#FF9933]" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">SATARK</h1>
            <p className="text-blue-200/70 text-sm mt-1">Survey Analysis, Trust &amp; Automation for Response Knowledge</p>
          </div>

          {/* Login form */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-white font-semibold mb-5 text-center">Secure Sign In</h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3 mb-4">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-blue-200/70 text-xs mb-1.5 block">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#FF9933]/60 text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <div>
                <label className="text-blue-200/70 text-xs mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#FF9933]/60 text-sm pr-10"
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                  <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                    {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
              <button
                onClick={() => handleLogin()}
                disabled={loading}
                className="w-full bg-[#FF9933] hover:bg-[#FF9933]/90 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <LogIn size={16}/>}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </div>
          </div>

          {/* Demo accounts */}
          <div className="mt-5 bg-white/3 border border-white/10 rounded-xl p-4">
            <p className="text-blue-200/50 text-xs mb-3 text-center uppercase tracking-wider">Demo Accounts</p>
            <div className="space-y-1.5">
              {DEMO_CREDS.map(c => (
                <button
                  key={c.username}
                  onClick={() => handleLogin(c.username, c.password)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm group"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-white/70">{c.username}</span>
                    <span className="text-white/30">/</span>
                    <span className="font-mono text-white/50">{c.password}</span>
                  </div>
                  <span className={`text-xs ${c.color}`}>{c.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-white/20 text-xs border-t border-white/5">
        © 2025 Ministry of Statistics &amp; Programme Implementation, Government of India · SATARK v2.0
      </div>
    </div>
  )
}