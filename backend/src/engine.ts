/**
 * SATARK Deterministic Scoring Engine
 * All validation, fraud, confidence, and coding logic is rule-based + deterministic.
 * Every score comes with a human-readable reason.
 */

export interface ValidationResult {
  layer: 1 | 2 | 3;
  score: number;
  status: 'pass' | 'warn' | 'fail';
  severity: 'low' | 'medium' | 'high';
  reason: string;
}

export interface CodingResult {
  system: 'NCO' | 'NIC' | 'ISIC';
  suggested_code: string;
  code_label: string;
  confidence: number;
  reason: string;
  alternatives?: Array<{ code: string; label: string; confidence: number }>;
}

export interface FraudSignal {
  signal_type: 'speed' | 'straight-lining' | 'cross-field';
  observed_value: string;
  threshold: string;
  triggered: boolean;
  weight: number;
  reason: string;
}

export interface ParadataSnapshot {
  total_duration_seconds: number;
  per_answer_times: Record<string, number>;
  device_type: string;
  network_type: string;
  mode_of_interview: 'web' | 'mobile' | 'whatsapp' | 'ivr';
  gps_lat: number;
  gps_lng: number;
}

export interface ConfidenceBreakdown {
  validation_component: number;
  fraud_component: number;
  evidence_component: number;
  behavioural_component: number;
  total_score: number;
  threshold_band: 'auto_approve' | 'review' | 'reinterview';
}

// ============ VALIDATION ENGINE (L1, L2, L3) ============

export function validateL1(
  answers: Record<string, any>,
  rules: Record<string, any>
): ValidationResult[] {
  const results: ValidationResult[] = [];
  for (const [field, value] of Object.entries(answers)) {
    const rule = rules[field];
    if (!rule) continue;

    // Type check
    if (rule.type) {
      const expectedType = rule.type;
      const actualType = typeof value === 'object' ? 'object' : typeof value;
      if (expectedType === 'number' && actualType !== 'number') {
        results.push({
          layer: 1,
          score: 0,
          status: 'fail',
          severity: 'high',
          reason: `Field "${field}" must be a number, got ${actualType}.`,
        });
        continue;
      }
    }

    // Mandatory
    if (rule.mandatory && (value === null || value === undefined || value === '')) {
      results.push({
        layer: 1,
        score: 0,
        status: 'fail',
        severity: 'high',
        reason: `Field "${field}" is mandatory.`,
      });
      continue;
    }

    // Range (for numbers)
    if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
      results.push({
        layer: 1,
        score: 0,
        status: 'fail',
        severity: 'high',
        reason: `Field "${field}" value (${value}) is below minimum (${rule.min}).`,
      });
      continue;
    }
    if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
      results.push({
        layer: 1,
        score: 0,
        status: 'fail',
        severity: 'high',
        reason: `Field "${field}" value (${value}) exceeds maximum (${rule.max}).`,
      });
      continue;
    }

    // Regex/format
    if (rule.pattern && typeof value === 'string') {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(value)) {
        results.push({
          layer: 1,
          score: 0,
          status: 'fail',
          severity: 'medium',
          reason: `Field "${field}" format is invalid.`,
        });
        continue;
      }
    }

    // Pass
    results.push({
      layer: 1,
      score: 100,
      status: 'pass',
      severity: 'low',
      reason: `Field "${field}" passed type, range, and format checks.`,
    });
  }
  return results;
}

export function validateL2(answers: Record<string, any>): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Cross-field: if unemployed but income > 50000, fail
  if (answers.occupation === 'Unemployed' || answers.occupation === 'Jobless') {
    if (typeof answers.monthly_income === 'number' && answers.monthly_income > 50000) {
      results.push({
        layer: 2,
        score: 0,
        status: 'fail',
        severity: 'high',
        reason: `Income (₹${answers.monthly_income.toLocaleString('en-IN')}) contradicts reported status "Unemployed".`,
      });
      return results;
    }
  }

  results.push({
    layer: 2,
    score: 100,
    status: 'pass',
    severity: 'low',
    reason: 'No cross-field contradictions detected.',
  });
  return results;
}

export function validateL3(
  answers: Record<string, any>,
  baselines: Record<string, { median: number; p05: number; p95: number }>
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const [field, baseline] of Object.entries(baselines)) {
    const value = answers[field];
    if (typeof value !== 'number') continue;

    // z-score / IQR check: if outside p05-p95, warn
    if (value < baseline.p05 || value > baseline.p95) {
      results.push({
        layer: 3,
        score: 50,
        status: 'warn',
        severity: 'medium',
        reason: `Value (${value}) is outside normal regional range (${baseline.p05}–${baseline.p95}).`,
      });
    } else {
      results.push({
        layer: 3,
        score: 100,
        status: 'pass',
        severity: 'low',
        reason: `Value (${value}) is within normal regional range.`,
      });
    }
  }

  return results;
}

// ============ AUTO-CODING ENGINE ============

interface CodeDatabase {
  NCO?: Record<string, { label: string; synonyms: string[] }>;
  NIC?: Record<string, { label: string; synonyms: string[] }>;
  ISIC?: Record<string, { label: string; synonyms: string[] }>;
}

export function autoCode(
  rawText: string,
  system: 'NCO' | 'NIC' | 'ISIC',
  codeDatabase: CodeDatabase
): CodingResult {
  const db = codeDatabase[system] || {};
  const normalized = rawText.toLowerCase().trim();

  // Try exact match first
  for (const [code, { label, synonyms }] of Object.entries(db)) {
    for (const syn of synonyms) {
      if (normalized === syn.toLowerCase()) {
        return {
          system,
          suggested_code: code,
          code_label: label,
          confidence: 0.94,
          reason: `"${syn}" matched the ${system} synonym list for code ${code}.`,
        };
      }
    }
  }

  // Try substring match (lower confidence)
  for (const [code, { label, synonyms }] of Object.entries(db)) {
    for (const syn of synonyms) {
      if (normalized.includes(syn.toLowerCase()) || syn.toLowerCase().includes(normalized)) {
        return {
          system,
          suggested_code: code,
          code_label: label,
          confidence: 0.72,
          reason: `"${syn}" partially matched in the text for ${system} code ${code}.`,
        };
      }
    }
  }

  return {
    system,
    suggested_code: 'UNKNOWN',
    code_label: 'Not classified',
    confidence: 0,
    reason: `No matching ${system} code found in synonym database for "${rawText}".`,
  };
}

// ============ FRAUD DETECTION ENGINE ============

export function detectFraud(
  answers: Record<string, any>,
  paradata: ParadataSnapshot,
  enumeratorHistoricalData?: {
    avg_response_time: number;
    flagged_count: number;
    total_responses: number;
  }
): { signals: FraudSignal[]; risk_score: number; risk_band: 'low' | 'medium' | 'high' } {
  const signals: FraudSignal[] = [];
  let totalWeight = 0;

  // Signal 1: Speed (completed in < 10s or any answer < 3s)
  const minAnswerTime = Math.min(...Object.values(paradata.per_answer_times || {}));
  if (paradata.total_duration_seconds < 10 || minAnswerTime < 3) {
    signals.push({
      signal_type: 'speed',
      observed_value: `${paradata.total_duration_seconds}s total`,
      threshold: '10s',
      triggered: true,
      weight: 25,
      reason: `Completed in ${paradata.total_duration_seconds}s vs regional median 90s.`,
    });
    totalWeight += 25;
  }

  // Signal 2: Straight-lining (identical answers across multiple questions)
  const answerValues = Object.values(answers).filter((v) => typeof v === 'string' || typeof v === 'number');
  const uniqueAnswers = new Set(answerValues);
  if (uniqueAnswers.size === 1 && answerValues.length > 3) {
    signals.push({
      signal_type: 'straight-lining',
      observed_value: `${answerValues.length} identical answers`,
      threshold: '3+',
      triggered: true,
      weight: 30,
      reason: `All ${answerValues.length} answers are identical (suspicious pattern).`,
    });
    totalWeight += 30;
  }

  // Signal 3: Cross-field (any L2 high-severity fail)
  // Inherits from validation; could be triggered by L2
  // (caller should pass validation results)

  // Risk score: capped 0–100, weighted average
  const riskScore = Math.min(100, (totalWeight / 100) * 100);
  const riskBand = riskScore < 30 ? 'low' : riskScore < 60 ? 'medium' : 'high';

  return { signals, risk_score: riskScore, risk_band };
}

// ============ CONFIDENCE DNA (transparent scoring) ============

export function computeConfidence(
  validationResults: ValidationResult[],
  fraudRiskScore: number,
  paradata: ParadataSnapshot,
  codingResults?: CodingResult[]
): ConfidenceBreakdown {
  // Component 1: Validation pass rate
  const validationPassRate =
    validationResults.filter((r) => r.status === 'pass').length /
    Math.max(validationResults.length, 1);

  // Component 2: Fraud inverse (100 - risk)
  const fraudComponent = 100 - fraudRiskScore;

  // Component 3: Evidence completeness (paradata present, coding confirmed)
  let evidenceComponent = 0;
  if (paradata) {
    evidenceComponent += paradata.total_duration_seconds > 0 ? 25 : 0;
    evidenceComponent += paradata.device_type ? 25 : 0;
    evidenceComponent += paradata.gps_lat && paradata.gps_lng ? 25 : 0;
  }
  if (codingResults?.some((r) => r.confidence >= 0.85)) {
    evidenceComponent += 25;
  }

  // Component 4: Behavioural normality (reasonable timing, no network issues)
  let behaviouralComponent = 100;
  if (paradata.total_duration_seconds < 10 || paradata.total_duration_seconds > 900) {
    behaviouralComponent -= 50;
  }
  if (paradata.network_type === 'offline') {
    behaviouralComponent -= 25;
  }

  // Weighted sum: 0.4 + 0.3 + 0.15 + 0.15 = 1.0
  const totalScore =
    0.4 * validationPassRate * 100 +
    0.3 * fraudComponent +
    0.15 * evidenceComponent +
    0.15 * behaviouralComponent;

  const threshold_band =
    totalScore >= 80 ? 'auto_approve' : totalScore >= 50 ? 'review' : 'reinterview';

  return {
    validation_component: validationPassRate * 100,
    fraud_component: fraudComponent,
    evidence_component: evidenceComponent,
    behavioural_component: behaviouralComponent,
    total_score: Math.round(totalScore),
    threshold_band,
  };
}

// ============ ENUMERATOR TRUST SCORE ============

export function updateEnumeratorTrust(
  currentTrust: number,
  responseConfidence: number,
  responseFraudRisk: number
): number {
  // Trust decays if response quality is poor
  // If confidence < 50 or fraud_risk > 60, decay trust by up to 10 points per bad response
  let trustDelta = 0;

  if (responseConfidence < 50) {
    trustDelta -= 15;
  } else if (responseConfidence < 80) {
    trustDelta -= 5;
  } else {
    trustDelta += 2; // Small boost for good response
  }

  if (responseFraudRisk > 60) {
    trustDelta -= 10;
  }

  const newTrust = Math.max(0, Math.min(100, currentTrust + trustDelta));
  return newTrust;
}
