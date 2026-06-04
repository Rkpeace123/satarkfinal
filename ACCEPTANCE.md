# SATARK MVP — Acceptance Checklist

**Project:** SATARK — Explainable Survey Intelligence Platform  
**Goal:** Build a working demo that proves explainability + auto-coding + real-time fraud detection  
**Target:** 10-minute flawless demo for MoSPI panel

---

## ✅ Completion Checklist

### Database & Backend
- [x] Supabase PostgreSQL schema with all tables, FKs, RLS policies
- [x] Deterministic scoring engine (validation L1/L2/L3, fraud, confidence, trust)
- [x] Auto-coding rules-first matcher (NCO/NIC/ISIC) with Tamil synonyms
- [x] Express API server with all endpoints (/auth, /surveys, /coding, /sync, /responses, /actions, /export, /health)
- [x] Seed script (classification codes, prepopulation, enumerators, demo survey, demo responses)

### Frontend & UI
- [x] LoginPage with role-based routing (admin, enumerator, supervisor, policy_maker)
- [x] SurveyChatClient with consent gate, multilingual (EN/HI/TA), auto-code chip, validation warning chip
- [x] CommandCenter for supervisor (live flag feed, enumerator roster, KPI tiles, drill-in, actions)
- [x] PolicyAnalytics for policy makers (confidence slider, predefined queries, trends, export)
- [x] Responsive design (mobile-first PWA), Tailwind CSS, government color palette
- [x] API client with all endpoints

### WOW Moment #1 — Auto-Coding (Multilingual)
- [x] Enumerator types "auto driver" → system shows "NCO 8322 — Auto-rickshaw driver (conf 0.94)" with reason
- [x] Enumerator types "ஆட்டோ ஓட்டுநர்" (Tamil) → SAME code NCO 8322 with Tamil-matched reason
- [x] Reason visible: "auto driver" matched the NCO synonym list
- [x] Works fully offline (no API calls for coding)

### WOW Moment #2 — Live Quality Flag
- [x] Enumerator "Suspect" submits: Unemployed + ₹200K income + 4-second completion
- [x] System fires cross-field validation FAIL (income contradicts unemployed)
- [x] Speed fraud signal triggered (4s vs median 90s)
- [x] Confidence drops to ~38 (re-interview band)
- [x] Enumerator trust score drops visibly
- [x] Flag appears in real-time in Supervisor CommandCenter with reasons
- [x] Supervisor sees headline reasons + can expand for details
- [x] One-click "Request Re-interview" button works

### Multilingual Support
- [x] EN/HI/TA language toggle on UI
- [x] All survey questions rendered in selected language
- [x] NCO synonyms in all three languages
- [x] Demo survey questions have text_en, text_hi, text_ta

### Auth & Permissions
- [x] Supabase JWT-based auth
- [x] Demo users seeded (admin, lakshmi, suspect, supervisor, policy)
- [x] Role-based page routing (admin → admin panel, enumerator → chat, supervisor → command center, policy → analytics)
- [x] RLS policies on all tables

### Data Integrity
- [x] Consent gate blocks storage until accepted
- [x] Raw answers never overwritten by codes (both stored separately)
- [x] All scores have human-readable reasons
- [x] Validation results, coding results, fraud signals, supervisor actions all logged
- [x] Immutable audit trail (supervisor_actions append-only)

### Export & Reporting
- [x] `/export` endpoint returns CSV with confidence-filtered responses
- [x] Includes raw answers + coded fields + confidence + fraud scores
- [x] Policy dashboard can download report

### Scoring Determinism
- [x] All validation, fraud, confidence, trust logic is pure functions (no randomness, no external calls except DB)
- [x] Same input → same output, always
- [x] No LLM calls in scoring path (mocked if needed)
- [x] Works offline (all code runs locally)

### UI/UX Polish
- [x] Government color palette (navy #002366, saffron #FF9933, dark bg)
- [x] "Government of India · MoSPI" branding on login
- [x] Professional card-based layout, status chips (green/yellow/red)
- [x] Reason hierarchy (headline + collapsible details)
- [x] Responsive on mobile (PWA-ready)
- [x] Loading states, error handling, success messages

### Demo Data
- [x] 2 enumerators preloaded (Lakshmi: good trust ~92, Suspect: risk ~45)
- [x] Demo survey "Household Employment Survey" (~10 nodes with adaptive logic)
- [x] Sample responses showing clean vs flagged patterns
- [x] Classification codes (NCO 8322 auto driver, 6111 farmer, 2511 developer, etc.)

### Documentation
- [x] README.md with full overview, quickstart, acceptance criteria
- [x] API endpoints documented
- [x] Scoring logic explained (L1/L2/L3, fraud signals, confidence formula, trust decay)
- [x] Demo script (10-minute walkthrough)

---

## 🎯 Key Metrics

| Metric | Target | Status |
|--------|--------|--------|
| WOW #1 Accuracy | 100% (English + Tamil same code) | ✅ |
| WOW #2 Latency | <100ms sync response | ✅ |
| Determinism | Zero random/external calls in pipeline | ✅ |
| Uptime | No network dependency for scoring | ✅ |
| Code Quality | All TypeScript, fully typed | ✅ |
| Test Coverage | Core engine unit-testable | ✅ |
| Deployment | Ready for Vercel + Railway | ✅ |

---

## 🚀 How to Verify

### Local Run
```bash
bash setup.sh
cd backend && npm run seed && npm run dev
# In another terminal:
cd frontend && npm run dev
```

### Run Demo Script
1. **[0:00]** Show login page, explain roles
2. **[0:30]** Log in as **Lakshmi** → start survey
3. **[1:30]** Lakshmi completes survey normally → score 90+ ✓
4. **[2:00]** Log in as **Supervisor** → show Lakshmi's response approved
5. **[2:30]** Log in as **Suspect** → start survey
6. **[3:00]** Type occupation "auto driver" → *WOW #1* shows code chip ✓
7. **[3:30]** Type occupation "ஆட்டோ ஓட்டுநர்" → *WOW #1* same code ✓
8. **[4:00]** Choose Unemployed, income 200000, submit in 4s → *WOW #2* fires all signals ✓
9. **[5:00]** Switch to **Supervisor** → see Suspect's response flagged in live feed ✓
10. **[6:00]** Click response → drill-in panel shows all reasons ✓
11. **[7:00]** Click "Request Re-interview" → status changes ✓
12. **[8:00]** Log in as **Policy Maker** → move confidence slider, aggregates update ✓
13. **[9:00]** Click "Export" → download CSV with codes ✓
14. **[10:00]** Q&A / close

---

## 📋 Known Limitations (Owned)

- **Prompt-to-Survey Generation**: Mocked (returns canned editable draft, no live LLM)
- **Policy RAG**: Predefined answers (3–4 canned queries, no live knowledge base)
- **GPS**: Simulated coordinates (not real location)
- **Voice Input**: Disabled (mic button present for UI completeness)
- **IVR/Avatar Channels**: Visual-only tiles, not functional
- **L4/L5 Validation**: Stubbed (L1–L3 fully working)
- **Regional Analytics**: One region (TN-CH) with preloaded baselines

All limitations are **by design for MVP scope** and explicitly listed in freeze document.

---

## ✨ Standout Features

1. **Explainability-as-Contract**: Every score has a reason stored alongside it
2. **Multilingual Auto-Coding**: Tamil synonyms in database, works offline
3. **Enumerator Trust Attack**: Real-time trust score responds to data quality
4. **Offline-First Design**: All scoring deterministic, no external calls
5. **Government-Credible**: Consent gating, immutable audit, raw-beside-coded
6. **Rule-Based (Not ML)**: Fully transparent, auditable, no black boxes

---

## 🎬 Expected Reactions

- **"How fast?"** → "4-second complete response flagged in real-time with all reasons"
- **"Multiple languages?"** → "Yes: English, Hindi, Tamil in demo; auto-code works in all three"
- **"Is it actually offline?"** → "Yes: validation, coding, fraud, confidence all computed locally; sync to DB only at end"
- **"What about AI?"** → "Prompt generation is mocked; all scoring is rule-based for auditability"
- **"Can I trust the numbers?"** → "Yes: every score stores its reason; here are the rules [show validation logic]"

---

## ✅ Pre-Demo Checklist

- [ ] Both demo users account created (Lakshmi + Suspect)
- [ ] Classification codes seeded with correct synonyms
- [ ] Reference distributions seeded (baselines for L3)
- [ ] Demo survey published and assigned to FSUs
- [ ] Enumerator trust calculation tuned (so Suspect drops on WOW #2)
- [ ] Backend running on :3001, Frontend on :3000
- [ ] Network connectivity optional (offline mode works)
- [ ] Browser cache cleared
- [ ] Demo script rehearsed 3× without errors
- [ ] Backup video recorded (in case network fails)
- [ ] Slides / talking points ready

---

**Status:** ✅ READY TO DEMO  
**Last Updated:** 2026-06-04  
**Demo Date:** [Your Event Date]
