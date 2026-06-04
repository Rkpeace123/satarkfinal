# SATARK Architecture (Frozen)

**Last Modified:** Freeze @ Commit SHA `cbc7d4a5`  
**Status:** LOCKED — No further architectural changes after this point  
**Rationale:** All decisions locked Day 1; build only what is below

---

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SATARK Platform                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Frontend (React + TypeScript)                   │   │
│  │  ┌──────────┬─────────────┬───────────┬──────────────┐   │   │
│  │  │  Login   │  Enumerator │ Supervisor│ Policy Maker │   │   │
│  │  │  Page    │  Chat       │ Command   │ Analytics    │   │   │
│  │  │          │             │ Center    │              │   │   │
│  │  └──────────┴─────────────┴───────────┴──────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         ↓ (HTTP)                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Backend API (Express + Node.js)                │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │        Deterministic Scoring Engine               │   │   │
│  │  │  • Validation (L1/L2/L3 with reasons)            │   │   │
│  │  │  • Auto-Coding (NCO/NIC/ISIC + synonyms)        │   │   │
│  │  │  • Fraud Detection (rule signals)                │   │   │
│  │  │  • Confidence DNA (4-component weighted sum)     │   │   │
│  │  │  • Enumerator Trust (decay on quality)           │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                      ↓ (SQL)                              │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │    Supabase PostgreSQL (14 tables, RLS)         │   │   │
│  │  │  • surveys, question_bank, classification_codes │   │   │
│  │  │  • responses, validation_results, fraud_signals │   │   │
│  │  │  • enumerators, consent_records, audit_log      │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Model (Postgres Tables)

### Core Survey Tables
- **surveys** — question graph (nodes + edges), validation rules, version, status
- **question_bank** — multilingual questions (en/hi/ta), type, options, code binding
- **classification_codes** — NCO/NIC/ISIC, code, label, **synonyms[] (GIN indexed)**

### Collection Tables
- **responses** — answers (jsonb), paradata (timing/device/network/mode/GPS), adaptive_log, confidence_score, fraud_risk_score, status
- **prepopulation_sources** — identifier (HH-id) → known_fields (name/state/district/region)
- **reference_distributions** — regional baselines (median/p05/p95) for L3 validation

### Explainability Tables
- **validation_results** — response_id, layer (1/2/3), score, status, severity, **reason** ← FROZEN
- **coding_results** — response_id, raw_text, suggested_code, **reason** ← FROZEN
- **fraud_signals** — response_id, signal_type (speed/straight-lining/cross-field), **reason** ← FROZEN

### Management Tables
- **enumerators** — trust_score, responses_count, flagged_count ← REAL-TIME
- **households** — FSU-level data
- **consent_records** — versioned consent (gates all storage)
- **supervisor_actions** — immutable audit trail (append-only)
- **sync_logs** — offline batches

**Key Invariant:** Raw answers **never overwritten**; codes sit beside raw text. All scores have reasons.

---

## 🧠 Scoring Engine (Deterministic, Rule-Based)

### Input
```typescript
{
  answers: Record<string, any>,          // User's raw responses
  paradata: {
    total_duration_seconds: number,      // Total time to complete
    per_answer_times: {},                // Time per question
    device_type: string,                 // mobile / web
    network_type: string,                // wifi / mobile / offline
    mode_of_interview: string,           // mobile / web / whatsapp / ivr
    gps_lat: number,                     // Simulated latitude
    gps_lng: number                      // Simulated longitude
  },
  baseline: Record<string, {median, p05, p95}> // Regional L3 thresholds
}
```

### Processing Pipeline (Linear, No Loops)

```
1. VALIDATION L1 (Type/Range/Mandatory)
   For each field in validation_rules:
     • Type check (number/string/date)
     • Range check (min/max)
     • Mandatory check
     → ValidationResult { score, status, severity, reason }

2. VALIDATION L2 (Cross-field)
   For each rule in validation_rules:
     • If A AND B then FAIL
     → ValidationResult { score, status, severity, reason }

3. VALIDATION L3 (Statistical)
   For each field with baseline:
     • If value outside p05–p95 → WARN
     → ValidationResult { score, status, severity, reason }

4. AUTO-CODING (Synonyms)
   If code_binding == 'NCO':
     • Lowercase answer
     • Match exact synonyms → conf 0.94
     • Match substring → conf 0.72
     → CodingResult { code, label, confidence, reason }

5. FRAUD DETECTION
   • Speed: if total < 10s → signal
   • Straight-lining: if >3 identical → signal
   • Cross-field: if L2 high severity → signal
   → FraudSignal[] { signal_type, weight, reason }
   → fraud_risk_score (capped 0–100)

6. CONFIDENCE DNA (Transparent Weighted Sum)
   score = 0.4 × (L1+L2+L3 pass%)
         + 0.3 × (100 - fraud_risk)
         + 0.15 × evidence_completeness
         + 0.15 × behavioural_normality
   → ConfidenceBreakdown { total_score, components, threshold_band }

7. ENUMERATOR TRUST UPDATE
   Δ trust = Δ confidence - Δ fraud
   new_trust = old_trust + Δ (clamped [0, 100])
```

### Output
```typescript
{
  validation_results: ValidationResult[],
  fraud_signals: FraudSignal[],
  coding_results: CodingResult[],
  confidence: ConfidenceBreakdown,
  new_enumerator_trust: number
}
```

**All stored in PostgreSQL for audit trail.**

---

## 🌐 API Endpoints (RESTful, Synchronous)

| Method | Path | Input | Output | Purpose |
|--------|------|-------|--------|---------|
| POST | `/auth/login` | email, password | token, role, user_id | JWT auth |
| GET | `/surveys` | — | surveys[] | List published surveys |
| GET | `/surveys/{id}` | id | survey with graph | Fetch survey detail |
| POST | `/surveys` | name, graph, rules | {id, version} | Create survey |
| POST | `/coding` | raw_text, system | CodingResult | Auto-code |
| POST | `/sync` | bundle (answers, paradata, consent) | SyncResponse | Full pipeline |
| GET | `/responses` | status?, limit?, offset? | responses[] | Query responses |
| GET | `/responses/{id}` | id | response + all scoring | Drill-in |
| GET | `/enumerators` | — | enumerators[] | Roster + trust |
| POST | `/actions` | response_id, action, note | {ok} | Approve/Reject/Re-interview |
| GET | `/export` | confidence_min? | CSV | Download filtered data |
| GET | `/health` | — | {status} | Health check |

**No WebSockets in MVP. Live updates via polling or server-sent events (future).**

---

## 🎯 User Journeys (Locked)

### Admin Journey
1. Login → Admin dashboard
2. Build survey: Add questions, set validation rules, bind to codes
3. Publish → Survey available to supervisors

### Enumerator Journey
1. Login → Assignment list
2. Select survey → Consent screen (must accept)
3. Prepopulation (if ID matches) → fields auto-filled
4. Conversational survey (WhatsApp-style chat, multilingual toggle)
5. Auto-code suggestions appear inline
6. Submit → Offline queue if no network
7. Sync on reconnect → Backend runs full pipeline
8. See result: confidence score + reasons

### Supervisor Journey
1. Login → CommandCenter
2. See live flag feed (newest first, organized by confidence)
3. Click response → Drill-in panel
4. See answers + codes + all reasons (hierarchical)
5. Action: Approve / Reject / Request Re-interview / Correct Code
6. Action recorded in immutable audit log

### Policy Maker Journey
1. Login → PolicyAnalytics
2. Move confidence slider → aggregates update
3. Select predefined query → see answer + source data
4. Export confidence-stamped report

---

## 🔐 Auth & Permissions (Frozen Roles)

**4 Roles (immutable):**

| Role | Email | Default | Permissions |
|------|-------|---------|-------------|
| Admin | admin@satark.gov | — | Create surveys, manage codes, publish |
| Enumerator | lakshmi@satark.gov | — | Collect responses, see own submissions |
| Supervisor | supervisor@satark.gov | — | Monitor flags, approve/reject/re-interview |
| Policy Maker | policy@satark.gov | — | View aggregated analytics (confidence ≥ threshold only) |

**RLS Policies:**
- Admin sees all
- Enumerator sees own responses only
- Supervisor sees region-assigned responses
- Policy Maker sees aggregated (PII masked)

---

## 🧩 Components (Frozen)

### Frontend Pages
- **LoginPage** — role selector, email/password, demo user hints
- **SurveyChatClient** — consent → questions → result with scores + reasons
- **CommandCenter** — live flag feed, enumerator roster, KPI tiles, drill-in
- **PolicyAnalytics** — confidence slider, query box, trends, export
- **AdminDashboard** — survey builder, question bank, code management

### Backend Modules
- **engine.ts** — all scoring logic (deterministic functions)
- **index.ts** — Express routes + middleware
- **seed.ts** — demo data loader

---

## 📊 Frozen Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| Scoring Latency | < 100ms | Inline response, no external calls |
| Multilingual Support | EN/HI/TA only | 3 languages sufficient for demo |
| Validation Layers | L1/L2/L3 only | L4/L5 not in MVP (mock) |
| Fraud Signals | 3 types (speed/straight-lining/cross-field) | Enough to demonstrate |
| Confidence Thresholds | 80/50 (approve/review/reinterview) | Industry-standard |
| Enumerator Trust Range | [0, 100] | Normalized scale |
| Regions | TN-CH only | Single region for MVP |
| Deployment | Vercel (frontend) + Railway (backend) | Fully managed |

---

## ❌ Explicitly Removed (Scope Lock)

- PostGIS / pgvector — Not needed (no real GPS/embeddings)
- Async workers (Celery/Bull) — Inline scoring sufficient
- Conflict resolution sync — Single-device demo
- Voice input (live) — Mocked
- IVR/Avatar (live) — Visual-only
- Aadhaar (live demo) — Sensitive; roadmap only
- OCR / Biometrics — Roadmap
- Real RAG — Mocked with predefined queries
- Prompt-to-survey (live LLM) — Returns canned editable draft

---

## 🔒 Security Constraints (Frozen)

- Supabase JWT auth (no custom auth)
- RLS on all tables (no manual permission checks)
- Consent gate (response storage blocked until `consent_granted=true`)
- Immutable audit log (supervisor_actions append-only, never updated/deleted)
- Raw answers never overwritten (alongside codes)
- Paradata attached (timing, device, network, GPS sim) for forensics

---

## 🚀 Deployment Checklist

- [ ] Supabase project created + schema loaded
- [ ] Environment variables (.env) set
- [ ] Seed script run (classification codes, enumerators, demo survey)
- [ ] Backend built & deployed to Railway
- [ ] Frontend built & deployed to Vercel
- [ ] Database migrations applied
- [ ] CORS configured (frontend ↔ backend)
- [ ] Backups enabled
- [ ] Monitoring set up (error logs, latency)
- [ ] Demo users tested in production

---

**Architecture is LOCKED as of this commit. No changes to tables, endpoints, scoring logic, or roles without re-freeze discussion.**
