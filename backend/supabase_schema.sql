-- SATARK MVP Schema (Postgres / Supabase)
-- Immutable audit trail, explainability first

-- ============ USERS & AUTH ============
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Use Supabase auth.users; add role-based column
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'enumerator', 'supervisor', 'policy_maker')),
  full_name TEXT,
  region_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============ SURVEYS & QUESTION BANK ============
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  version INT DEFAULT 1,
  question_graph JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  validation_rules JSONB,
  status TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.question_bank (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text_en TEXT NOT NULL,
  text_hi TEXT,
  text_ta TEXT,
  type TEXT CHECK (type IN ('text', 'number', 'select', 'multi', 'date')) NOT NULL,
  options JSONB,
  validation_rule JSONB,
  code_binding TEXT, -- e.g. 'NCO' or 'NIC'
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  system TEXT CHECK (system IN ('NCO', 'NIC', 'ISIC')) NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  synonyms TEXT[] DEFAULT ARRAY[]::TEXT[],
  parent_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(system, code)
);

CREATE INDEX idx_classification_codes_synonyms ON public.classification_codes USING GIN(synonyms);

-- ============ PREPOPULATION & REFERENCE ============
CREATE TABLE IF NOT EXISTS public.prepopulation_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier_type TEXT NOT NULL,
  identifier_value TEXT NOT NULL,
  known_fields JSONB,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(identifier_type, identifier_value)
);

CREATE TABLE IF NOT EXISTS public.reference_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id TEXT,
  field_key TEXT NOT NULL,
  median FLOAT,
  p05 FLOAT,
  p95 FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============ FIELD STAFF ============
CREATE TABLE IF NOT EXISTS public.enumerators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  device_fingerprint TEXT,
  region_id TEXT,
  trust_score FLOAT DEFAULT 100.0,
  responses_count INT DEFAULT 0,
  flagged_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fsu_id TEXT,
  region_id TEXT,
  prior_round_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============ RESPONSE & COLLECTION ============
CREATE TABLE IF NOT EXISTS public.responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID REFERENCES public.surveys(id),
  survey_version INT DEFAULT 1,
  enumerator_id UUID REFERENCES public.enumerators(id),
  household_id UUID REFERENCES public.households(id),
  fsu_id TEXT,
  answers JSONB NOT NULL DEFAULT '{}',
  paradata JSONB NOT NULL DEFAULT '{}',
  adaptive_log JSONB DEFAULT '[]'::JSONB,
  confidence_score FLOAT DEFAULT 0,
  fraud_risk_score FLOAT DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'approved', 'flagged', 'reinterview')) DEFAULT 'pending',
  gps_lat FLOAT,
  gps_lng FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE,
  superseded_by UUID
);

CREATE INDEX idx_responses_enumerator_created ON public.responses(enumerator_id, created_at);
CREATE INDEX idx_responses_survey_status ON public.responses(survey_id, status);
CREATE INDEX idx_responses_status_flagged ON public.responses(status) WHERE status = 'flagged';

-- ============ EXPLAINABILITY & SCORING ============
CREATE TABLE IF NOT EXISTS public.validation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID REFERENCES public.responses(id) ON DELETE CASCADE,
  layer INT NOT NULL, -- 1, 2, or 3
  score FLOAT,
  status TEXT CHECK (status IN ('pass', 'warn', 'fail')) NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coding_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID REFERENCES public.responses(id) ON DELETE CASCADE,
  question_id UUID,
  raw_text TEXT NOT NULL,
  system TEXT, -- NCO, NIC, ISIC
  suggested_code TEXT,
  code_label TEXT,
  confidence FLOAT DEFAULT 0,
  reason TEXT NOT NULL,
  alternatives JSONB DEFAULT '[]'::JSONB,
  status TEXT CHECK (status IN ('auto', 'review', 'confirmed')) DEFAULT 'auto',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_coding_results_status_review ON public.coding_results(status) WHERE status = 'review';

CREATE TABLE IF NOT EXISTS public.fraud_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID REFERENCES public.responses(id) ON DELETE CASCADE,
  enumerator_id UUID REFERENCES public.enumerators(id),
  signal_type TEXT NOT NULL, -- 'speed', 'straight-lining', 'cross-field', etc.
  observed_value TEXT,
  threshold TEXT,
  triggered BOOLEAN DEFAULT FALSE,
  weight FLOAT DEFAULT 0,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============ CONSENT & AUDIT ============
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID REFERENCES public.responses(id),
  household_id UUID REFERENCES public.households(id),
  text_version TEXT,
  scope JSONB DEFAULT '[]'::JSONB,
  granted BOOLEAN DEFAULT FALSE,
  granted_at TIMESTAMP WITH TIME ZONE,
  method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supervisor_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID REFERENCES public.responses(id),
  supervisor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'approve', 'reject', 'reinterview', 'correct_code'
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID REFERENCES public.responses(id),
  question_id UUID,
  author_type TEXT, -- 'enumerator', 'supervisor', 'admin'
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enumerator_id UUID REFERENCES public.enumerators(id),
  batch_size INT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============ RLS POLICIES ============
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enumerators ENABLE ROW LEVEL SECURITY;

-- Admin sees all; enumerator sees own; supervisor sees own region
CREATE POLICY surveys_access ON public.surveys FOR SELECT USING (
  auth.uid() = created_by OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

CREATE POLICY responses_access ON public.responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
  OR enumerator_id = (SELECT id FROM public.enumerators WHERE id = auth.uid() LIMIT 1)
);

-- ============ INDEXES ============
CREATE INDEX idx_surveys_status ON public.surveys(status);
CREATE INDEX idx_question_bank_domain ON public.question_bank(domain);
