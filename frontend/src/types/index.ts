export interface Survey {
  id: string
  title: string
  description: string
  languageCodes: string[]
  questionGraph: QuestionGraph
  createdAt: string
}

export interface QuestionGraph {
  questions: Question[]
  edges: Edge[]
}

export interface Question {
  id: string
  type: 'text' | 'number' | 'select' | 'multiselect' | 'consent'
  text_en: string
  text_hi?: string
  text_ta?: string
  options?: string[]
  required?: boolean
  prepopulated?: boolean
  code_binding?: 'NCO' | 'NIC'
  skip_if?: Record<string, string[]>
  min?: number
  max?: number
}

export interface Edge {
  from: string
  to: string
  condition?: Record<string, string>
}

export interface CodingResult {
  suggestedCode: string
  codeLabel: string
  confidence: number
  reason: string
  alternatives: Array<{ code: string; label: string; confidence: number }>
  status: 'auto' | 'confirmed' | 'corrected' | 'review'
}

export interface ValidationFailure {
  layer: number
  reason: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface FraudSignal {
  signalType: string
  value: number
  threshold: number
  triggered: boolean
  weight: number
  reason: string
}

export interface EnumeratorProfile {
  id: string
  name: string
  phone: string
  fsuId: string
  trustScore: number
  status: string
  responseCount?: number
  createdAt: string
}

export interface TrustHistoryPoint {
  trustScore: number
  delta: number
  reason: string
  createdAt: string
}

export interface ResponseSummary {
  id: string
  surveyId: string
  enumeratorId: string
  enumeratorName?: string
  householdId: string
  status: string
  confidenceScore: number
  fraudScore: number
  action: string
  createdAt: string
}

export interface ResponseDetail extends ResponseSummary {
  answers: Record<string, unknown>
  paradata: Record<string, unknown>
  validationResults: Array<{
    layer: number
    questionId: string
    status: string
    severity: string
    reason: string
    score: number
  }>
  fraudSignals: FraudSignal[]
  codingResults: Array<{
    questionId: string
    rawText: string
    system: string
    suggestedCode: string
    codeLabel: string
    confidence: number
    reason: string
    alternatives: unknown[]
    status: string
  }>
  confidenceBreakdown: Record<string, number>
}

export interface LiveFlag {
  type: 'new_flag' | 'trust_update'
  response_id: string
  enumerator_id: string
  enumerator_name: string
  confidence_score: number
  fraud_score: number
  action: string
  trust_score: number
  validation_failures: ValidationFailure[]
  coding_results: Array<{
    raw: string
    code: string
    label: string
    confidence: number
    reason: string
  }>
  timestamp: string
}

export interface Stats {
  totalResponses: number
  flaggedCount: number
  avgConfidenceScore: number
  avgTrustScore: number
  enumeratorCount: number
  sampleSurveyId: string
  pendingCodingReview?: number
}
