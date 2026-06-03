export interface Survey {
  id: string
  title: string
  description: string
  language_codes: string[]
  question_graph: QuestionGraph
  created_at: string
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
  suggested_code: string
  code_label: string
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
  signal_type: string
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
  fsu_id: string
  trust_score: number
  status: string
  created_at: string
}

export interface TrustHistoryPoint {
  trust_score: number
  delta: number
  reason: string
  created_at: string
}

export interface ResponseSummary {
  id: string
  survey_id: string
  enumerator_id: string
  enumerator_name: string
  household_id: string
  status: string
  confidence_score: number
  fraud_score: number
  created_at: string
}

export interface ResponseDetail extends ResponseSummary {
  answers: Record<string, unknown>
  paradata: Record<string, unknown>
  validation_results: Array<{
    layer: number
    question_id: string
    status: string
    severity: string
    reason: string
    score: number
  }>
  fraud_signals: FraudSignal[]
  coding_results: Array<{
    question_id: string
    raw_text: string
    system: string
    suggested_code: string
    code_label: string
    confidence: number
    reason: string
    alternatives: unknown[]
    status: string
  }>
  confidence_breakdown: Record<string, number>
  action: string
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
  total_responses: number
  flagged_count: number
  avg_confidence: number
  avg_trust: number
  enumerator_count: number
  sample_survey_id: string
  pending_coding_review: number
}
