/**
 * SATARK Backend API Server
 * Express + Supabase + deterministic scoring
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import {
  validateL1,
  validateL2,
  validateL3,
  autoCode,
  detectFraud,
  computeConfidence,
  updateEnumeratorTrust,
} from './engine';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory code database (loaded from DB on startup)
let codeDatabase: Record<string, Record<string, { label: string; synonyms: string[] }>> = {
  NCO: {},
  NIC: {},
  ISIC: {},
};

async function loadCodeDatabase() {
  try {
    const { data } = await supabase.from('classification_codes').select('*');
    if (data) {
      data.forEach((code: any) => {
        if (!codeDatabase[code.system]) {
          codeDatabase[code.system] = {};
        }
        codeDatabase[code.system][code.code] = {
          label: code.label,
          synonyms: code.synonyms || [],
        };
      });
      console.log('✓ Code database loaded');
    }
  } catch (error) {
    console.error('Failed to load code database:', error);
  }
}

// ============ AUTH ENDPOINTS ============

interface LoginRequest {
  email: string;
  password: string;
}

app.post('/auth/login', async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      token: data.session.access_token,
      user_id: data.user?.id,
      email: data.user?.email,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ============ SURVEY ENDPOINTS ============

app.get('/surveys', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('surveys').select('*').eq('status', 'published');
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/surveys/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/surveys', async (req: Request, res: Response) => {
  try {
    const { name, question_graph, validation_rules } = req.body;
    const { data, error } = await supabase.from('surveys').insert([
      {
        name,
        question_graph,
        validation_rules,
        status: 'published',
      },
    ]);
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ============ CODING ENDPOINT ============

interface CodingRequest {
  raw_text: string;
  system: 'NCO' | 'NIC' | 'ISIC';
}

app.post('/coding', async (req: Request<{}, {}, CodingRequest>, res: Response) => {
  try {
    const { raw_text, system } = req.body;
    const result = autoCode(raw_text, system, codeDatabase);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ============ RESPONSE / SYNC ENDPOINT ============

interface ResponseBundle {
  survey_id: string;
  enumerator_id: string;
  household_id?: string;
  fsu_id: string;
  answers: Record<string, any>;
  paradata: any;
  consent_granted: boolean;
}

app.post('/sync', async (req: Request<{}, {}, ResponseBundle>, res: Response) => {
  try {
    const { survey_id, enumerator_id, answers, paradata, consent_granted } = req.body;

    if (!consent_granted) {
      return res.status(400).json({ error: 'Consent must be granted' });
    }

    // Get survey validation rules
    const { data: surveyData } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', survey_id)
      .single();

    if (!surveyData) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    // Get baseline for L3 validation
    const { data: baseline } = await supabase
      .from('reference_distributions')
      .select('*');

    const baselineMap: Record<string, any> = {};
    (baseline || []).forEach((b: any) => {
      baselineMap[b.field_key] = { median: b.median, p05: b.p05, p95: b.p95 };
    });

    // Run validation pipeline
    const validationL1 = validateL1(answers, surveyData.validation_rules || {});
    const validationL2 = validateL2(answers);
    const validationL3 = validateL3(answers, baselineMap);
    const allValidation = [...validationL1, ...validationL2, ...validationL3];

    // Run fraud detection
    const { signals: fraudSignals, risk_score: fraudRiskScore } = detectFraud(answers, paradata);

    // Get enumerator current trust
    const { data: enumData } = await supabase
      .from('enumerators')
      .select('trust_score')
      .eq('id', enumerator_id)
      .single();

    const currentTrust = enumData?.trust_score || 75;

    // Auto-code any NCO field
    const codingResults = [];
    if (answers.occupation) {
      const coding = autoCode(answers.occupation, 'NCO', codeDatabase);
      codingResults.push({
        question_id: 'occupation',
        raw_text: answers.occupation,
        system: 'NCO',
        suggested_code: coding.suggested_code,
        code_label: coding.code_label,
        confidence: coding.confidence,
        reason: coding.reason,
        status: coding.confidence >= 0.85 ? 'auto' : 'review',
      });
    }

    // Compute confidence
    const confidence = computeConfidence(allValidation, fraudRiskScore, paradata, codingResults);

    // Update enumerator trust
    const newTrust = updateEnumeratorTrust(
      currentTrust,
      confidence.total_score,
      fraudRiskScore
    );

    // Insert response
    const responseId = uuidv4();
    const { error: insertError } = await supabase.from('responses').insert([
      {
        id: responseId,
        survey_id,
        enumerator_id,
        answers,
        paradata,
        confidence_score: confidence.total_score,
        fraud_risk_score: fraudRiskScore,
        status: confidence.threshold_band === 'auto_approve' ? 'approved' : 'flagged',
      },
    ]);

    if (insertError) throw insertError;

    // Insert validation results
    for (const validation of allValidation) {
      await supabase.from('validation_results').insert([
        {
          response_id: responseId,
          ...validation,
        },
      ]);
    }

    // Insert fraud signals
    for (const signal of fraudSignals) {
      await supabase.from('fraud_signals').insert([
        {
          response_id: responseId,
          enumerator_id,
          ...signal,
        },
      ]);
    }

    // Insert coding results
    for (const coding of codingResults) {
      await supabase.from('coding_results').insert([
        {
          response_id: responseId,
          ...coding,
        },
      ]);
    }

    // Update enumerator trust
    await supabase
      .from('enumerators')
      .update({ trust_score: newTrust })
      .eq('id', enumerator_id);

    // Return full result to client
    res.json({
      response_id: responseId,
      confidence: confidence,
      fraud_signals: fraudSignals,
      validation_results: allValidation,
      coding_results: codingResults,
      new_enumerator_trust: newTrust,
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: String(error) });
  }
});

// ============ RESPONSE / QUERY ENDPOINTS ============

app.get('/responses', async (req: Request, res: Response) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    let query = supabase.from('responses').select('*');
    if (status) {
      query = query.eq('status', status);
    }
    query = query.order('created_at', { ascending: false }).range(Number(offset), Number(offset) + Number(limit));

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/responses/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get response
    const { data: response } = await supabase
      .from('responses')
      .select('*')
      .eq('id', id)
      .single();

    // Get validation results
    const { data: validation } = await supabase
      .from('validation_results')
      .select('*')
      .eq('response_id', id);

    // Get fraud signals
    const { data: fraud } = await supabase
      .from('fraud_signals')
      .select('*')
      .eq('response_id', id);

    // Get coding results
    const { data: coding } = await supabase
      .from('coding_results')
      .select('*')
      .eq('response_id', id);

    res.json({
      response,
      validation_results: validation || [],
      fraud_signals: fraud || [],
      coding_results: coding || [],
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ============ ENUMERATOR ENDPOINTS ============

app.get('/enumerators', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('enumerators')
      .select('*')
      .order('trust_score', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ============ ACTIONS ENDPOINT ============

interface ActionRequest {
  response_id: string;
  action: 'approve' | 'reject' | 'reinterview' | 'correct_code';
  note?: string;
}

app.post('/actions', async (req: Request<{}, {}, ActionRequest>, res: Response) => {
  try {
    const { response_id, action, note } = req.body;

    // Insert supervisor action
    const { error } = await supabase.from('supervisor_actions').insert([
      {
        response_id,
        action,
        note: note || '',
      },
    ]);

    if (error) throw error;

    // Update response status
    const statusMap: Record<string, string> = {
      approve: 'approved',
      reject: 'flagged',
      reinterview: 'reinterview',
    };

    if (statusMap[action]) {
      await supabase
        .from('responses')
        .update({ status: statusMap[action] })
        .eq('id', response_id);
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ============ EXPORT ENDPOINT ============

app.get('/export', async (req: Request, res: Response) => {
  try {
    const { confidence_min = 50 } = req.query;

    // Get responses above confidence threshold
    const { data: responses } = await supabase
      .from('responses')
      .select('*')
      .gte('confidence_score', Number(confidence_min));

    if (!responses) {
      return res.json({ data: [] });
    }

    // Enrich with coding
    const enriched = await Promise.all(
      responses.map(async (r) => {
        const { data: coding } = await supabase
          .from('coding_results')
          .select('*')
          .eq('response_id', r.id);
        return { ...r, coded_fields: coding || [] };
      })
    );

    // CSV format
    const headers = [
      'response_id',
      'survey_id',
      'enumerator_id',
      'confidence_score',
      'fraud_risk_score',
      'status',
      'answers_json',
      'coding_json',
    ];

    const rows = enriched.map((r) => [
      r.id,
      r.survey_id,
      r.enumerator_id,
      r.confidence_score,
      r.fraud_risk_score,
      r.status,
      JSON.stringify(r.answers),
      JSON.stringify(r.coded_fields),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="satark-export.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ============ HEALTH CHECK ============

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ START SERVER ============

async function start() {
  try {
    await loadCodeDatabase();
    app.listen(port, () => {
      console.log(`✓ SATARK API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
