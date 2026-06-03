import React, { useState } from 'react'
import {
  Plus,
  Trash2,
  Save,
  Wand2,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  CheckCircle,
  Type,
  Hash,
  List,
  CheckSquare,
  Shield,
  Tag,
  GripVertical,
  AlertTriangle
} from 'lucide-react'
import clsx from 'clsx'
import type { Question } from '../types'
import { api } from '../api/client'

type QuestionType = Question['type']
type Language = 'en' | 'hi' | 'ta'

interface BuilderQuestion extends Question {
  _key: string
}

const TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  text: <Type size={13} />,
  number: <Hash size={13} />,
  select: <List size={13} />,
  multiselect: <CheckSquare size={13} />,
  consent: <Shield size={13} />
}

const TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Text',
  number: 'Number',
  select: 'Select',
  multiselect: 'Multi-select',
  consent: 'Consent'
}

function newQuestion(type: QuestionType, idx: number): BuilderQuestion {
  return {
    _key: `q-${Date.now()}-${idx}`,
    id: `q${idx + 1}`,
    type,
    text_en: '',
    required: true
  }
}

function QuestionTypeBtn({
  type,
  onClick
}: {
  type: QuestionType
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors border border-slate-600"
    >
      {TYPE_ICONS[type]}
      {TYPE_LABELS[type]}
    </button>
  )
}

function QuestionCard({
  question,
  index,
  total,
  selected,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown
}: {
  question: BuilderQuestion
  index: number
  total: number
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={clsx(
        'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
        selected
          ? 'bg-blue-500/10 border-blue-500/30'
          : 'bg-slate-900/50 border-slate-700/50 hover:border-slate-600'
      )}
    >
      <GripVertical size={14} className="text-slate-600 mt-1 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-slate-500 text-xs font-mono">Q{index + 1}</span>
          <span
            className={clsx(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
              selected ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'
            )}
          >
            {TYPE_ICONS[question.type]}
            {TYPE_LABELS[question.type]}
          </span>
          {question.code_binding && (
            <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 text-xs font-medium flex items-center gap-1">
              <Tag size={10} />
              {question.code_binding}
            </span>
          )}
          {question.required && (
            <span className="text-red-400 text-xs">*</span>
          )}
        </div>
        <p className="text-slate-300 text-sm truncate">
          {question.text_en || <span className="text-slate-600 italic">No question text</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp() }}
          disabled={index === 0}
          className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"
        >
          <ChevronUp size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown() }}
          disabled={index === total - 1}
          className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"
        >
          <ChevronDown size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

function QuestionEditor({
  question,
  onChange
}: {
  question: BuilderQuestion
  onChange: (updated: BuilderQuestion) => void
}) {
  const [optionsText, setOptionsText] = useState(
    question.options?.join('\n') ?? ''
  )

  const update = (patch: Partial<BuilderQuestion>) =>
    onChange({ ...question, ...patch })

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label className="text-slate-400 text-xs mb-1.5 block">Question ID</label>
        <input
          value={question.id}
          onChange={(e) => update({ id: e.target.value })}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div>
        <label className="text-slate-400 text-xs mb-1.5 block">Question Type</label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
            <button
              key={t}
              onClick={() => update({ type: t })}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
                question.type === t
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
              )}
            >
              {TYPE_ICONS[t]}
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-slate-400 text-xs mb-1.5 block">Question Text (English)</label>
        <textarea
          value={question.text_en}
          onChange={(e) => update({ text_en: e.target.value })}
          rows={2}
          placeholder="Enter question in English…"
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
        />
      </div>

      <div>
        <label className="text-slate-400 text-xs mb-1.5 block">Hindi (optional)</label>
        <input
          value={question.text_hi ?? ''}
          onChange={(e) => update({ text_hi: e.target.value || undefined })}
          placeholder="हिंदी में प्रश्न…"
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div>
        <label className="text-slate-400 text-xs mb-1.5 block">Tamil (optional)</label>
        <input
          value={question.text_ta ?? ''}
          onChange={(e) => update({ text_ta: e.target.value || undefined })}
          placeholder="தமிழில் கேள்வி…"
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {(question.type === 'select' || question.type === 'multiselect') && (
        <div>
          <label className="text-slate-400 text-xs mb-1.5 block">Options (one per line)</label>
          <textarea
            value={optionsText}
            onChange={(e) => {
              setOptionsText(e.target.value)
              update({ options: e.target.value.split('\n').filter((o) => o.trim()) })
            }}
            rows={4}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono resize-none"
          />
        </div>
      )}

      {question.type === 'text' && (
        <div>
          <label className="text-slate-400 text-xs mb-1.5 block">Auto-coding Binding</label>
          <div className="flex gap-2">
            {['NCO', 'NIC', 'none'].map((opt) => (
              <button
                key={opt}
                onClick={() => update({ code_binding: opt === 'none' ? undefined : opt as 'NCO' | 'NIC' })}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  (question.code_binding ?? 'none') === opt
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                )}
              >
                {opt !== 'none' && <Tag size={10} />}
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {question.type === 'number' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-slate-400 text-xs mb-1.5 block">Min</label>
            <input
              type="number"
              value={question.min ?? ''}
              onChange={(e) => update({ min: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="text-slate-400 text-xs mb-1.5 block">Max</label>
            <input
              type="number"
              value={question.max ?? ''}
              onChange={(e) => update({ max: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={question.required ?? false}
            onChange={(e) => update({ required: e.target.checked })}
            className="w-4 h-4 rounded bg-slate-700 border border-slate-600 accent-blue-500"
          />
          <span className="text-slate-400 text-xs">Required</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={question.prepopulated ?? false}
            onChange={(e) => update({ prepopulated: e.target.checked })}
            className="w-4 h-4 rounded bg-slate-700 border border-slate-600 accent-blue-500"
          />
          <span className="text-slate-400 text-xs">Pre-populated from Census</span>
        </label>
      </div>
    </div>
  )
}

function LangPreview({ question, lang }: { question: BuilderQuestion; lang: Language }) {
  const text = lang === 'hi' ? question.text_hi : lang === 'ta' ? question.text_ta : question.text_en
  return (
    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700 text-sm text-slate-300">
      {text || <span className="text-slate-600 italic">No translation for {lang.toUpperCase()}</span>}
    </div>
  )
}

export default function SurveyBuilder() {
  const [questions, setQuestions] = useState<BuilderQuestion[]>([])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [prompt, setPrompt] = useState('')
  const [questionCount, setQuestionCount] = useState(8)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [previewLang, setPreviewLang] = useState<Language>('en')

  const selectedQuestion = selectedIdx !== null ? questions[selectedIdx] : null

  const addQuestion = (type: QuestionType) => {
    const newQ = newQuestion(type, questions.length)
    setQuestions((prev) => [...prev, newQ])
    setSelectedIdx(questions.length)
  }

  const deleteQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx))
    setSelectedIdx((prev) => {
      if (prev === null) return null
      if (prev === idx) return null
      if (prev > idx) return prev - 1
      return prev
    })
  }

  const updateQuestion = (idx: number, updated: BuilderQuestion) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? updated : q)))
  }

  const moveQuestion = (idx: number, dir: 'up' | 'down') => {
    const newIdx = dir === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= questions.length) return
    setQuestions((prev) => {
      const arr = [...prev]
      ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
      return arr
    })
    setSelectedIdx(newIdx)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setGenerateError(null)
    try {
      const survey = await api.generateSurvey(prompt, questionCount)
      const built: BuilderQuestion[] = survey.question_graph.questions.map((q, i) => ({
        ...q,
        _key: `gen-${Date.now()}-${i}`
      }))
      setQuestions(built)
      setSelectedIdx(0)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate survey')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    // Simulate save — in real app would POST to /api/surveys
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-slate-900 pt-12 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex-shrink-0">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-slate-100 font-bold text-lg">Survey Builder</h1>
            <p className="text-slate-500 text-xs mt-0.5">No-code survey design with AI generation</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Language preview */}
            <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
              {(['en', 'hi', 'ta'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setPreviewLang(l)}
                  className={clsx(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    previewLang === l ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  {l === 'en' ? 'EN' : l === 'hi' ? 'हि' : 'த'}
                </button>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={saving || questions.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 transition-all"
            >
              {saving ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : saved ? (
                <CheckCircle size={14} />
              ) : (
                <Save size={14} />
              )}
              {saved ? 'Saved!' : 'Save Survey'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex max-w-screen-xl mx-auto w-full px-6 py-4 gap-4 min-h-0">
        {/* Left — Question list */}
        <div className="flex flex-col w-72 flex-shrink-0 gap-3">
          {/* AI prompt box */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 size={14} className="text-blue-400" />
              <span className="text-slate-200 font-semibold text-sm">AI Generate</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your survey in plain language… e.g. 'Employment and income survey for rural households'"
              rows={3}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none mb-2"
            />
            <div className="flex items-center gap-2 mb-2">
              <span className="text-slate-500 text-xs">Questions:</span>
              <input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                min={1}
                max={30}
                className="w-16 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 text-xs font-semibold disabled:opacity-40 transition-all"
            >
              {generating ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />}
              {generating ? 'Generating…' : 'Generate Draft'}
            </button>
            {generateError && (
              <div className="mt-2 flex items-center gap-1.5 text-red-400 text-xs">
                <AlertTriangle size={11} />
                {generateError}
              </div>
            )}
          </div>

          {/* Add question buttons */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3">
            <div className="text-slate-400 text-xs font-medium mb-2">Add Question</div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                <QuestionTypeBtn key={t} type={t} onClick={() => addQuestion(t)} />
              ))}
            </div>
          </div>

          {/* Question list */}
          <div className="flex-1 overflow-y-auto bg-slate-800/30 border border-slate-700/50 rounded-2xl p-3 space-y-2">
            {questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                  <List size={18} className="text-slate-600" />
                </div>
                <p className="text-slate-500 text-xs">
                  Generate or add questions to get started
                </p>
              </div>
            ) : (
              questions.map((q, i) => (
                <QuestionCard
                  key={q._key}
                  question={q}
                  index={i}
                  total={questions.length}
                  selected={selectedIdx === i}
                  onSelect={() => setSelectedIdx(i)}
                  onDelete={() => deleteQuestion(i)}
                  onMoveUp={() => moveQuestion(i, 'up')}
                  onMoveDown={() => moveQuestion(i, 'down')}
                />
              ))
            )}
          </div>

          {questions.length > 0 && (
            <div className="text-slate-500 text-xs text-center">
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Center — Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm font-medium">
              Preview — {previewLang === 'en' ? 'English' : previewLang === 'hi' ? 'Hindi' : 'Tamil'}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-800/20 border border-slate-700/50 rounded-2xl p-5">
            {questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Wand2 size={32} className="text-slate-700 mb-4" />
                <p className="text-slate-500 text-sm">
                  Generate a survey with AI or add questions manually
                </p>
                <p className="text-slate-600 text-xs mt-2">
                  The survey preview will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="text-slate-300 font-semibold text-lg">Survey Preview</div>
                  <div className="text-slate-500 text-sm mt-1">
                    {previewLang === 'en' ? 'English' : previewLang === 'hi' ? 'हिंदी' : 'தமிழ்'} version
                  </div>
                </div>
                {questions.map((q, i) => (
                  <div
                    key={q._key}
                    className={clsx(
                      'p-4 rounded-xl border transition-all',
                      selectedIdx === i
                        ? 'border-blue-500/30 bg-blue-500/5'
                        : 'border-slate-700/50 bg-slate-900/40'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-slate-500 text-xs font-mono">Q{i + 1}</span>
                      <span className={clsx(
                        'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
                        'bg-slate-700 text-slate-400'
                      )}>
                        {TYPE_ICONS[q.type]}
                        {TYPE_LABELS[q.type]}
                      </span>
                      {q.code_binding && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 text-xs flex items-center gap-1">
                          <Tag size={9} />
                          {q.code_binding}
                        </span>
                      )}
                      {q.required && <span className="text-red-400 text-xs">*</span>}
                    </div>
                    <LangPreview question={q} lang={previewLang} />
                    {q.options && q.options.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {q.options.map((opt) => (
                          <span
                            key={opt}
                            className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs"
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — Editor */}
        <div className="w-72 flex-shrink-0">
          <div className="text-slate-400 text-sm font-medium mb-3">
            {selectedQuestion ? `Edit Q${selectedIdx! + 1}` : 'Select a question to edit'}
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
            {selectedQuestion ? (
              <QuestionEditor
                question={selectedQuestion}
                onChange={(updated) => updateQuestion(selectedIdx!, updated)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckSquare size={24} className="text-slate-600 mb-3" />
                <p className="text-slate-500 text-xs">Click a question to edit it</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
