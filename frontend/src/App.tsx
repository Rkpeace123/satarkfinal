import React, { Suspense } from 'react'
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { BarChart2, ClipboardList, Settings, Activity } from 'lucide-react'
import clsx from 'clsx'
import { getUser } from './api/auth'

const LandingPage = React.lazy(() => import('./pages/LandingPage'))
const SurveyChat = React.lazy(() => import('./pages/SurveyChat'))
const SurveyBuilder = React.lazy(() => import('./pages/SurveyBuilder'))
const CommandCenter = React.lazy(() => import('./pages/CommandCenter'))
const ResponseDrilldown = React.lazy(() => import('./pages/ResponseDrilldown'))
const CodingReview = React.lazy(() => import('./pages/CodingReview'))
const LoginPage = React.lazy(() => import('./pages/LoginPage'))
const PolicyAnalytics = React.lazy(() => import('./pages/PolicyAnalytics'))
const AssignmentList = React.lazy(() => import('./pages/AssignmentList'))

function NavBar() {
  const location = useLocation()
  const hideNav = ['/', '/login', '/policy', '/assignments'].includes(location.pathname)

  if (hideNav) return null

  const links = [
    { to: '/', label: 'Survey', icon: <ClipboardList size={16} /> },
    { to: '/builder', label: 'Builder', icon: <Settings size={16} /> },
    { to: '/supervisor', label: 'Supervisor', icon: <Activity size={16} /> }
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-700 h-12 flex items-center px-4">
      <Link to="/" className="flex items-center gap-2 mr-8">
        <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center">
          <BarChart2 size={16} className="text-white" />
        </div>
        <span className="font-bold text-slate-100 tracking-wide text-sm">SATARK</span>
      </Link>
      <div className="flex items-center gap-1">
        {links.map((link) => {
          const active =
            link.to === '/'
              ? location.pathname === '/' || location.pathname.startsWith('/survey')
              : location.pathname.startsWith(link.to)
          return (
            <Link
              key={link.to}
              to={link.to}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                active
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          )
        })}
      </div>
      <div className="ml-auto text-xs text-slate-500 font-medium">
        MoSPI · Census 2026
      </div>
    </nav>
  )
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Loading…</span>
      </div>
    </div>
  )
}

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundaryClass>{children}</ErrorBoundaryClass>
}

class ErrorBoundaryClass extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 p-8">
          <div className="max-w-md w-full bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <h2 className="text-red-400 font-semibold text-lg mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm mb-4">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function RootRedirect() {
  const user = getUser()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'enumerator') return <Navigate to="/assignments" replace />
  if (user.role === 'supervisor') return <Navigate to="/supervisor" replace />
  if (user.role === 'policy') return <Navigate to="/policy" replace />
  return <Navigate to="/builder" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <NavBar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/policy" element={<PolicyAnalytics />} />
          <Route path="/assignments" element={<AssignmentList />} />
          <Route path="/" element={<RootRedirect />} />
          <Route path="/survey/:id" element={<SurveyChat />} />
          <Route path="/builder" element={<SurveyBuilder />} />
          <Route path="/supervisor" element={<CommandCenter />} />
          <Route path="/supervisor/response/:id" element={<ResponseDrilldown />} />
          <Route path="/supervisor/coding" element={<CodingReview />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
