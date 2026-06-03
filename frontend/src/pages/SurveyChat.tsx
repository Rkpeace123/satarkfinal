import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Send,
  CheckCircle,
  AlertTriangle,
  XCircle,
  User,
  BarChart2,
  Globe,
  Database,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import clsx from 'clsx'
import type { Survey, Question, CodingResult } from '../types'
import { api } from '../api/client'
import ConsentScreen from '../components/ConsentScreen'
import AutoCodeChip from '../components/AutoCodeChip'

// ─── Types ───────────────────────────────────────────────────────────────────

type Language = 'en' | 'hi' | 'ta'

interface Message {
  id: string
  role: 'system' | 'user'
  content: string
  questionId?: string
  timestamp: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getQuestionText(q: Question, lang: Language): string {
  if (lang === 'hi' && q.text_hi) return q.text_hi
  if (lang === 'ta' && q.text_ta) return q.text_ta
  return q.text_en
}

function getLangLabel(lang: Language) {
  return { en: 'EN', hi: 'हि', ta: 'த' }[lang]
}

function PrepopBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-medium ml-2">
      <Database size={9} />
      Pre-filled
    </span>
  )
}

function ActionResult({ action }: { action: string }) {
  const configs: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    approve: {
      icon: <CheckCircle size={20} />,
      label: 'Approved',
      cls: 'text-green-400 bg-green-500/10 border-green-500/30'
    },
    review: {
      icon: <AlertTriangle size={20} />,
      label: 'Flagged for Review',
      cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    },
    reinterview: {
      icon: <XCircle size={20} />,
      label: 'Re-interview Required',
      cls: 'text-red-400 bg-red-500/10 border-red-500/30'
    }
  }
  const cfg = configs[action?.toLowerCase()] || configs.review
  return (
    <div className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm', cfg.cls)}>
      {cfg.icon}
      {cfg.label}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SurveyChat() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Survey data
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [surveyLoading, setSurveyLoading] = useState(true)
  const [surveyError, setSurveyError] = useState<string | null>(null)

  // Session state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [language, setLanguage] = useState<Language>('en')
  const [consentGiven, setConsentGiven] = useState(false)
  const [consentDeclined, setConsentDeclined] = useState(false)
  const [prepopData, setPrepopData] = useState<Record<string, unknown>>({})
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionStartTime] = useState(Date.now())
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pipelineResult, setPipelineResult] = useState<unknown>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Current input state
  const [inputValue, setInputValue] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])

  // Auto-coding
  const [codingResult, setCodingResult] = useState<CodingResult | null>(null)
  const [isCoding, setIsCoding] = useState(false)
  const [codeConfirmed, setCodeConfirmed] = useState(false)

  // UI refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const msgCounter = useRef(0)

  // ── Load survey ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return
    api.getSurvey(id)
      .then((s) => {
        setSurvey(s)
        setSurveyLoading(false)
      })
      .catch((err) => {
        setSurveyError(err instanceof Error ? err.message : 'Failed to load survey')
        setSurveyLoading(false)
      })
  }, [id])

  // ── Prepopulate ──────────────────────────────────────────────────────────

  const doPrepopulate = useCallback(async () => {
    try {
      const data = await api.prepopulate('household_id', 'HH-TN-0042')
      setPrepopData(data)
    } catch {
      // Non-critical — continue without prepop
    }
  }, [])

  // ── Consent grant ────────────────────────────────────────────────────────

  const handleConsentGrant = useCallback(async () => {
    try {
      await api.logConsent({
        household_id: 'HH-TN-0042',
        text_version: 'v2.1-NEHS-2025',
        scope: ['name', 'age', 'employment', 'income', 'household_size'],
        method: 'oral_digital'
      })
    } catch {
      // Non-critical
    }
    setConsentGiven(true)
    await doPrepopulate()
  }, [doPrepopulate])

  // ── Start survey once consent given ─────────────────────────────────────

  useEffect(() => {
    if (!consentGiven || !survey || messages.length > 0) return
    const questions = survey.question_graph.questions
    if (questions.length === 0) return
    const firstQ = questions[0]
    setMessages([
      {
        id: `msg-${msgCounter.current++}`,
        role: 'system',
        content: getQuestionText(firstQ, language),
        questionId: firstQ.id,
        timestamp: Date.now()
      }
    ])
  }, [consentGiven, survey, language])

  // ── Scroll to bottom ─────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when question appears
  useEffect(() => {
    if (consentGiven && !submitted) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [currentQuestionIdx, consentGiven, submitted])

  // ── Get current question ─────────────────────────────────────────────────

  const questions = survey?.question_graph.questions ?? []
  const currentQuestion = questions[currentQuestionIdx] ?? null

  // ── Auto-coding debounce ─────────────────────────────────────────────────

  const triggerAutoCode = useCallback(
    (value: string, system: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      setCodingResult(null)
      setCodeConfirmed(false)
      if (!value.trim()) return
      setIsCoding(true)
      debounceRef.current = setTimeout(async () => {
        try {
          const result = await api.codeText(value, system)
          setCodingResult(result)
        } catch {
          // ignore
        } finally {
          setIsCoding(false)
        }
      }, 600)
    },
    []
  )

  const handleInputChange = (value: string) => {
    setInputValue(value)
    if (currentQuestion?.code_binding && value.trim()) {
      triggerAutoCode(value, currentQuestion.code_binding)
    } else {
      setCodingResult(null)
      setIsCoding(false)
    }
  }

  // ── Skip logic ───────────────────────────────────────────────────────────

  const getNextQuestionIdx = useCallback(
    (fromIdx: number, answer: unknown): number => {
      if (!survey) return fromIdx + 1
      const q = questions[fromIdx]
      if (!q) return fromIdx + 1

      // Check skip_if
      if (q.skip_if && typeof answer === 'string') {
        for (const [skipValue, skipToIds] of Object.entries(q.skip_if)) {
          if (answer === skipValue && skipToIds.length > 0) {
            const targetId = skipToIds[0]
            const targetIdx = questions.findIndex((qq) => qq.id === targetId)
            if (targetIdx !== -1) return targetIdx
          }
        }
      }

      return fromIdx + 1
    },
    [survey, questions]
  )

  // ── Submit answer ────────────────────────────────────────────────────────

  const submitAnswer = useCallback(
    async (value: unknown) => {
      if (!currentQuestion) return

      const displayValue =
        Array.isArray(value)
          ? value.join(', ')
          : String(value)

      // Add user bubble
      const userMsg: Message = {
        id: `msg-${msgCounter.current++}`,
        role: 'user',
        content: displayValue,
        timestamp: Date.now()
      }

      // Save answer (with code if confirmed)
      const answerValue =
        currentQuestion.code_binding && codingResult && codeConfirmed
          ? { raw: value, code: codingResult.suggested_code, label: codingResult.code_label }
          : value

      const newAnswers = { ...answers, [currentQuestion.id]: answerValue }
      setAnswers(newAnswers)

      // Reset input
      setInputValue('')
      setSelectedOptions([])
      setCodingResult(null)
      setIsCoding(false)
      setCodeConfirmed(false)

      const nextIdx = getNextQuestionIdx(currentQuestionIdx, value)

      if (nextIdx >= questions.length) {
        // Last question — submit
        setMessages((prev) => [...prev, userMsg])
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${msgCounter.current++}`,
              role: 'system',
              content: 'Thank you! Submitting your responses…',
              timestamp: Date.now()
            }
          ])
        }, 300)
        setSubmitting(true)
        try {
          const duration = Math.round((Date.now() - sessionStartTime) / 1000)
          const result = await api.submitResponse({
            survey_id: id,
            answers: newAnswers,
            paradata: {
              duration_seconds: duration,
              enumerator_id: 'enum-a-001',
              household_id: 'HH-TN-0042',
              language,
              device: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
            }
          })
          setPipelineResult(result)
          setSubmitted(true)
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : 'Submission failed')
        } finally {
          setSubmitting(false)
        }
      } else {
        // Show next question after brief delay
        setCurrentQuestionIdx(nextIdx)
        setMessages((prev) => [...prev, userMsg])
        const nextQ = questions[nextIdx]
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${msgCounter.current++}`,
              role: 'system',
              content: getQuestionText(nextQ, language),
              questionId: nextQ.id,
              timestamp: Date.now()
            }
          ])
        }, 300)
      }
    },
    [
      currentQuestion,
      currentQuestionIdx,
      questions,
      answers,
      codingResult,
      codeConfirmed,
      getNextQuestionIdx,
      id,
      language,
      sessionStartTime
    ]
  )

  const handleSend = () => {
    if (!currentQuestion) return
    const type = currentQuestion.type

    if (type === 'multiselect') {
      if (selectedOptions.length === 0) return
      submitAnswer(selectedOptions)
    } else {
      if (!inputValue.trim()) return
      submitAnswer(inputValue.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Prepop helper ────────────────────────────────────────────────────────

  const getPrepopValue = (qId: string): string | undefined => {
    const val = prepopData[qId]
    return val !== undefined ? String(val) : undefined
  }

  // ── Result screen ────────────────────────────────────────────────────────

  const resultData = pipelineResult as {
    confidence_score?: number
    action?: string
    coding_results?: Array<{ raw_text?: string; suggested_code?: string; code_label?: string; confidence?: number }>
  } | null

  // ─────────────────────────────────────────────────────────────────────────
  // Loading / error states
  // ─────────────────────────────────────────────────────────────────────────

  if (surveyLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading survey…</p>
      </div>
    )
  }

  if (surveyError || !survey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-8">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <XCircle size={32} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-slate-100 font-semibold mb-2">Failed to load survey</h2>
          <p className="text-slate-400 text-sm mb-4">{surveyError}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setSurveyError(null); setSurveyLoading(true); window.location.reload() }}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
            <button onClick={() => navigate('/')} className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors">
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (consentDeclined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-8">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <XCircle size={40} className="text-slate-500 mx-auto mb-4" />
          <h2 className="text-slate-100 font-semibold text-lg mb-2">Participation Declined</h2>
          <p className="text-slate-400 text-sm mb-6">
            You have chosen not to participate. Your decision has been recorded. No data has been collected.
          </p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors">
            Return Home
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* Consent overlay */}
      {!consentGiven && (
        <ConsentScreen
          onConsent={handleConsentGrant}
          onDecline={() => setConsentDeclined(true)}
        />
      )}

      {/* Top bar */}
      <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700 h-12 flex items-center px-4 gap-3">
        <button onClick={() => navigate('/')} className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center">
            <BarChart2 size={14} className="text-white" />
          </div>
          <span className="font-bold text-slate-100 text-sm">SATARK</span>
          <span className="text-slate-500 text-xs">Survey</span>
        </button>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <User size={12} />
          <span>Lakshmi R</span>
          <span className="text-slate-600">·</span>
          <span className="font-mono text-slate-500">HH-TN-0042</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Progress */}
          {consentGiven && !submitted && questions.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{Math.min(currentQuestionIdx + 1, questions.length)}/{questions.length}</span>
              <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${((currentQuestionIdx) / questions.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Language toggle */}
          <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            {(['en', 'hi', 'ta'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={clsx(
                  'px-2 py-1 rounded text-xs font-medium transition-colors',
                  language === lang
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {getLangLabel(lang)}
              </button>
            ))}
          </div>
          <Globe size={14} className="text-slate-600" />
        </div>
      </div>

      {/* ── Submitted result screen ── */}
      {submitted && (
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-8">
          <div className="max-w-lg w-full space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h2 className="text-slate-100 text-2xl font-bold mb-1">Survey Submitted</h2>
              <p className="text-slate-400 text-sm">Response processed through SATARK intelligence pipeline</p>
            </div>

            {resultData && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
                {/* Confidence */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-xs mb-1">Confidence Score</div>
                    <div className="text-3xl font-bold text-blue-400">
                      {resultData.confidence_score !== undefined
                        ? `${Math.round(resultData.confidence_score * 100)}%`
                        : '—'}
                    </div>
                  </div>
                  {resultData.action && <ActionResult action={resultData.action} />}
                </div>

                {/* Confidence bar */}
                {resultData.confidence_score !== undefined && (
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.round(resultData.confidence_score * 100)}%` }}
                    />
                  </div>
                )}

                {/* Coding results */}
                {resultData.coding_results && resultData.coding_results.length > 0 && (
                  <div>
                    <div className="text-slate-400 text-xs font-medium mb-2">Auto-coded Fields</div>
                    <div className="space-y-2">
                      {resultData.coding_results.map((cr, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-slate-900/60 rounded-lg text-xs">
                          <span className="text-slate-400 truncate flex-1">{cr.raw_text}</span>
                          <ChevronRight size={12} className="text-slate-600 flex-shrink-0" />
                          <span className="font-mono text-purple-400 flex-shrink-0">{cr.suggested_code}</span>
                          <span className="text-slate-300 flex-shrink-0 truncate max-w-[120px]">{cr.code_label}</span>
                          <span className="text-slate-500 flex-shrink-0">
                            {cr.confidence !== undefined ? `${Math.round(cr.confidence * 100)}%` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {submitError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                {submitError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/supervisor')}
                className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                View in Supervisor
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-colors text-sm"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat area ── */}
      {!submitted && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {messages.map((msg) => {
              const isSystem = msg.role === 'system'
              return (
                <div
                  key={msg.id}
                  className={clsx('flex fade-in', isSystem ? 'justify-start' : 'justify-end')}
                >
                  {isSystem && (
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <BarChart2 size={13} className="text-blue-400" />
                    </div>
                  )}
                  <div
                    className={clsx(
                      'max-w-[65%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                      isSystem
                        ? 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
                        : 'bg-blue-500 text-white rounded-tr-sm'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              )
            })}

            {submitting && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mr-2 mt-0.5">
                  <BarChart2 size={13} className="text-blue-400" />
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-slate-400 text-sm">Processing…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input area ── */}
          {consentGiven && currentQuestion && !submitting && (
            <div className="flex-shrink-0 border-t border-slate-700 bg-slate-800 px-4 py-3">
              {/* Prepop indicator */}
              {currentQuestion.prepopulated && getPrepopValue(currentQuestion.id) && (
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <Database size={10} className="text-blue-400" />
                  <span>Pre-filled from Census data</span>
                  <PrepopBadge />
                </div>
              )}

              {/* Question type input */}
              {currentQuestion.type === 'select' && currentQuestion.options ? (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2">
                    {currentQuestion.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => submitAnswer(opt)}
                        className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-sm hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300 transition-all"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : currentQuestion.type === 'multiselect' && currentQuestion.options ? (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {currentQuestion.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() =>
                          setSelectedOptions((prev) =>
                            prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
                          )
                        }
                        className={clsx(
                          'px-3 py-1.5 rounded-lg border text-sm transition-all',
                          selectedOptions.includes(opt)
                            ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                            : 'border-slate-600 text-slate-400 hover:border-blue-500/50 hover:text-blue-300'
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={selectedOptions.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                  >
                    <Send size={13} />
                    Continue
                  </button>
                </div>
              ) : (
                /* text / number inputs */
                <div>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        ref={inputRef}
                        type={currentQuestion.type === 'number' ? 'number' : 'text'}
                        value={
                          currentQuestion.prepopulated && getPrepopValue(currentQuestion.id) && !inputValue
                            ? getPrepopValue(currentQuestion.id) || ''
                            : inputValue
                        }
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                          currentQuestion.prepopulated && getPrepopValue(currentQuestion.id)
                            ? getPrepopValue(currentQuestion.id)
                            : 'Type your answer…'
                        }
                        min={currentQuestion.min}
                        max={currentQuestion.max}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                      />
                      {isCoding && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-3.5 h-3.5 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim()}
                      className="p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl disabled:opacity-40 transition-all flex items-center justify-center"
                    >
                      <Send size={16} />
                    </button>
                  </div>

                  {/* Auto-code chip */}
                  {codingResult && (
                    <AutoCodeChip
                      result={codingResult}
                      onConfirm={() => {
                        setCodeConfirmed(true)
                        setCodingResult(codingResult)
                      }}
                      onEdit={() => {
                        setCodingResult(null)
                        setCodeConfirmed(false)
                        inputRef.current?.focus()
                      }}
                    />
                  )}

                  {/* Code confirmed indicator */}
                  {codeConfirmed && codingResult && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-400">
                      <CheckCircle size={11} />
                      Code confirmed: {codingResult.suggested_code} — {codingResult.code_label}
                    </div>
                  )}
                </div>
              )}

              {/* Hint */}
              {currentQuestion.type === 'text' || currentQuestion.type === 'number' ? (
                <div className="mt-1.5 flex items-center gap-3">
                  {currentQuestion.code_binding && (
                    <span className="text-xs text-purple-400 flex items-center gap-1">
                      <Database size={10} />
                      Auto-codes to {currentQuestion.code_binding}
                    </span>
                  )}
                  <span className="text-slate-600 text-xs ml-auto">Press Enter to continue</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Submitting spinner */}
          {submitting && (
            <div className="flex-shrink-0 border-t border-slate-700 bg-slate-800 px-4 py-3 flex items-center justify-center gap-2">
              <RefreshCw size={14} className="text-blue-400 animate-spin" />
              <span className="text-slate-400 text-sm">Running validation pipeline…</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
