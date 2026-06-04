/**
 * API Client for SATARK
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface AuthResponse {
  token: string;
  user_id: string;
  email: string;
}

export interface CodingResult {
  system: string;
  suggested_code: string;
  code_label: string;
  confidence: number;
  reason: string;
}

export interface ValidationResult {
  layer: number;
  score: number;
  status: string;
  severity: string;
  reason: string;
}

export interface SyncResponse {
  response_id: string;
  confidence: {
    total_score: number;
    validation_component: number;
    fraud_component: number;
    evidence_component: number;
    behavioural_component: number;
    threshold_band: string;
  };
  fraud_signals: any[];
  validation_results: ValidationResult[];
  coding_results: CodingResult[];
  new_enumerator_trust: number;
}

export const api = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  async getSurveys() {
    const res = await fetch(`${API_URL}/surveys`);
    if (!res.ok) throw new Error('Failed to fetch surveys');
    return res.json();
  },

  async getSurvey(id: string) {
    const res = await fetch(`${API_URL}/surveys/${id}`);
    if (!res.ok) throw new Error('Failed to fetch survey');
    return res.json();
  },

  async createSurvey(name: string, question_graph: any, validation_rules: any) {
    const res = await fetch(`${API_URL}/surveys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, question_graph, validation_rules }),
    });
    if (!res.ok) throw new Error('Failed to create survey');
    return res.json();
  },

  async autoCode(raw_text: string, system: 'NCO' | 'NIC' | 'ISIC'): Promise<CodingResult> {
    const res = await fetch(`${API_URL}/coding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text, system }),
    });
    if (!res.ok) throw new Error('Coding failed');
    return res.json();
  },

  async sync(bundle: {
    survey_id: string;
    enumerator_id: string;
    fsu_id: string;
    answers: Record<string, any>;
    paradata: any;
    consent_granted: boolean;
  }): Promise<SyncResponse> {
    const res = await fetch(`${API_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle),
    });
    if (!res.ok) throw new Error('Sync failed');
    return res.json();
  },

  async getResponses(status?: string) {
    let url = `${API_URL}/responses`;
    if (status) url += `?status=${status}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch responses');
    return res.json();
  },

  async getResponse(id: string) {
    const res = await fetch(`${API_URL}/responses/${id}`);
    if (!res.ok) throw new Error('Failed to fetch response');
    return res.json();
  },

  async getEnumerators() {
    const res = await fetch(`${API_URL}/enumerators`);
    if (!res.ok) throw new Error('Failed to fetch enumerators');
    return res.json();
  },

  async recordAction(response_id: string, action: string, note?: string) {
    const res = await fetch(`${API_URL}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response_id, action, note }),
    });
    if (!res.ok) throw new Error('Action failed');
    return res.json();
  },

  async exportData(confidence_min?: number) {
    let url = `${API_URL}/export`;
    if (confidence_min !== undefined) url += `?confidence_min=${confidence_min}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Export failed');
    return res.text();
  },
};
