import type {
  Stats,
  Survey,
  CodingResult,
  ResponseSummary,
  ResponseDetail,
  EnumeratorProfile,
  TrustHistoryPoint
} from '../types'

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

export const api = {
  getStats: () => request<Stats>('/stats'),
  getSurveys: () => request<Survey[]>('/surveys'),
  getSurvey: (id: string) => request<Survey>(`/surveys/${id}`),
  generateSurvey: (prompt: string, count: number) =>
    request<Survey>('/surveys/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, question_count: count })
    }),

  codeText: (raw_text: string, system: string) =>
    request<CodingResult>('/coding', {
      method: 'POST',
      body: JSON.stringify({ raw_text, system })
    }),

  prepopulate: (identifier_type: string, identifier_value: string) =>
    request<Record<string, unknown>>('/prepopulate', {
      method: 'POST',
      body: JSON.stringify({ identifier_type, identifier_value })
    }),

  logConsent: (data: {
    household_id: string
    text_version: string
    scope: unknown
    method: string
  }) =>
    request<{ consent_id: string }>('/consent', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  submitResponse: (data: unknown) =>
    request<unknown>('/responses', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getResponses: (filters?: { status?: string; enumerator_id?: string }) => {
    const qs = new URLSearchParams(
      filters as Record<string, string>
    ).toString()
    return request<ResponseSummary[]>(`/responses${qs ? '?' + qs : ''}`)
  },
  getResponse: (id: string) => request<ResponseDetail>(`/responses/${id}`),

  getEnumerators: () => request<EnumeratorProfile[]>('/enumerators'),
  getEnumerator: (id: string) => request<EnumeratorProfile>(`/enumerators/${id}`),
  getEnumeratorHistory: (id: string) =>
    request<TrustHistoryPoint[]>(`/enumerators/${id}/history`),

  takeAction: (data: {
    response_id: string
    action_type: string
    note?: string
  }) =>
    request<unknown>('/actions', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}
