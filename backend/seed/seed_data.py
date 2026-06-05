"""
Seed data for SATARK.  Idempotent — checks if data already exists before inserting.
"""
from uuid import uuid4
from datetime import datetime, timedelta

from database import SessionLocal
from models import (
    ClassificationCode,
    Survey,
    EnumeratorProfile,
    PrepopulationSource,
    Response,
    ValidationResult,
    FraudSignal,
    CodingResult,
    ConfidenceScore,
    TrustHistory,
    User,
)


# ── Classification codes ───────────────────────────────────────────────────────

NCO_CODES = [
    {
        "code": "8322",
        "label": "Drivers, auto-rickshaw/three-wheeler",
        "synonyms": [
            "auto driver", "auto", "autorickshaw", "auto rickshaw",
            "three wheeler driver", "ஆட்டோ ஓட்டுநர்", "ஆட்டோ",
            "ऑटो चालक", "ऑटो ड्राइवर", "three-wheeler",
        ],
    },
    {
        "code": "6111",
        "label": "Field crop and vegetable growers",
        "synonyms": [
            "farmer", "farming", "vivasayi", "விவசாயி", "किसान",
            "cultivator", "kisan", "agriculture", "agricultural worker", "paddy farmer",
        ],
    },
    {
        "code": "2511",
        "label": "Software developers",
        "synonyms": [
            "software engineer", "developer", "programmer", "software",
            "it professional", "coder", "tech", "software developer", "it engineer",
        ],
    },
    {
        "code": "5223",
        "label": "Shop sales assistants",
        "synonyms": [
            "shopkeeper", "shop owner", "store", "kadai", "दुकानदार",
            "merchant", "retailer", "seller", "small business",
        ],
    },
    {
        "code": "3121",
        "label": "Mining and metallurgy technicians",
        "synonyms": [
            "accountant", "accounts", "finance manager", "bookkeeper", "financial",
        ],
    },
    {
        "code": "0110",
        "label": "Skilled agricultural and fishery workers",
        "synonyms": [
            "fisherman", "fisher", "matsyakari", "மீனவர்", "fishing", "fisheries",
        ],
    },
    {
        "code": "7115",
        "label": "Carpenters and joiners",
        "synonyms": [
            "carpenter", "wood worker", "furniture maker", "தச்சர்",
            "woodworking", "cabinet maker",
        ],
    },
    {
        "code": "7411",
        "label": "Building electricians",
        "synonyms": [
            "electrician", "electrical", "wiring", "மின்சாரம்",
            "electric", "electronics technician",
        ],
    },
    {
        "code": "5141",
        "label": "Hairdressers",
        "synonyms": [
            "barber", "hair cutting", "salon", "hair dresser",
            "முடிதிருத்துபவர்", "beauty parlour", "stylist",
        ],
    },
    {
        "code": "2320",
        "label": "Vocational education teachers",
        "synonyms": [
            "teacher", "professor", "faculty", "instructor", "ஆசிரியர்",
            "अध्यापक", "lecturer", "tutor", "school teacher",
        ],
    },
    {
        "code": "5111",
        "label": "Travel attendants and travel stewards",
        "synonyms": [
            "driver", "car driver", "taxi driver", "cab driver", "chauffeur",
            "taxi", "cab", "ola driver", "uber driver",
        ],
    },
    {
        "code": "9999",
        "label": "Labourers not elsewhere classified",
        "synonyms": [
            "labourer", "daily wage", "daily labourer", "construction worker",
            "mazdoor", "मजदूर", "கூலி",
        ],
    },
]

NIC_CODES = [
    {
        "code": "4923",
        "label": "Freight road transport",
        "synonyms": [
            "lorry", "truck", "transport", "goods carrier", "logistics",
            "freight", "trucking",
        ],
    },
    {
        "code": "0111",
        "label": "Growing of cereals",
        "synonyms": [
            "paddy", "rice farming", "wheat", "cereal", "grain", "crop farming",
        ],
    },
    {
        "code": "6201",
        "label": "Computer programming activities",
        "synonyms": [
            "software", "programming", "coding", "it services",
            "tech company", "software development",
        ],
    },
    {
        "code": "4711",
        "label": "Retail sale in non-specialised stores",
        "synonyms": [
            "grocery", "general store", "retail", "shop", "kirana",
            "convenience store", "supermarket",
        ],
    },
    {
        "code": "8510",
        "label": "Pre-primary and primary education",
        "synonyms": [
            "school", "teaching", "education", "college", "university",
            "tuition", "coaching",
        ],
    },
    {
        "code": "9602",
        "label": "Hairdressing and other beauty treatment",
        "synonyms": [
            "salon", "beauty parlour", "barber shop", "parlour", "beauty salon",
        ],
    },
    {
        "code": "4312",
        "label": "Site preparation",
        "synonyms": [
            "construction", "builder", "contractor", "civil work",
            "building construction", "infrastructure",
        ],
    },
    {
        "code": "5610",
        "label": "Restaurants and mobile food service",
        "synonyms": [
            "hotel", "restaurant", "food", "catering", "dhaba", "mess", "canteen",
        ],
    },
    {
        "code": "6810",
        "label": "Real estate activities",
        "synonyms": [
            "real estate", "property", "land", "builder", "property dealer",
        ],
    },
    {
        "code": "4921",
        "label": "Urban and suburban passenger land transport",
        "synonyms": [
            "bus", "transport", "public transport", "auto", "taxi",
            "passenger transport",
        ],
    },
]


# ── Survey definition ──────────────────────────────────────────────────────────

DEMO_SURVEY = {
    "id": "demo-survey-001",
    "title": "National Employment Household Survey",
    "description": "Household employment and livelihood survey for TN pilot",
    "language_codes": ["en", "hi", "ta"],
    "question_graph": {
        "questions": [
            {
                "id": "consent",
                "type": "consent",
                "text_en": "Consent",
                "text_hi": "सहमति",
                "text_ta": "சம்மதம்",
                "required": True,
            },
            {
                "id": "name",
                "type": "text",
                "text_en": "Respondent name",
                "text_hi": "नाम",
                "text_ta": "பெயர்",
                "prepopulated": True,
            },
            {
                "id": "age",
                "type": "number",
                "text_en": "Age",
                "text_hi": "आयु",
                "text_ta": "வயது",
                "min": 1,
                "max": 120,
            },
            {
                "id": "gender",
                "type": "select",
                "text_en": "Gender",
                "options": ["Male", "Female", "Other"],
            },
            {
                "id": "state",
                "type": "text",
                "text_en": "State",
                "text_hi": "राज्य",
                "text_ta": "மாநிலம்",
                "prepopulated": True,
            },
            {
                "id": "employment_status",
                "type": "select",
                "text_en": "Employment status",
                "text_hi": "रोज़गार स्थिति",
                "text_ta": "வேலைவாய்ப்பு நிலை",
                "options": [
                    "Employed",
                    "Self-employed",
                    "Unemployed",
                    "Student",
                    "Homemaker",
                    "Retired",
                ],
            },
            {
                "id": "occupation",
                "type": "text",
                "text_en": "Occupation (describe your work)",
                "text_hi": "व्यवसाय",
                "text_ta": "தொழில்",
                "code_binding": "NCO",
                "skip_if": {
                    "employment_status": [
                        "Unemployed", "Student", "Homemaker", "Retired",
                    ]
                },
            },
            {
                "id": "industry",
                "type": "text",
                "text_en": "Industry / type of business",
                "text_hi": "उद्योग",
                "text_ta": "தொழிற்துறை",
                "code_binding": "NIC",
                "skip_if": {
                    "employment_status": [
                        "Unemployed", "Student", "Homemaker", "Retired",
                    ]
                },
            },
            {
                "id": "monthly_income",
                "type": "number",
                "text_en": "Monthly income (₹)",
                "text_hi": "मासिक आय",
                "text_ta": "மாதாந்திர வருமானம்",
            },
            {
                "id": "household_size",
                "type": "number",
                "text_en": "Household size (members)",
                "min": 1,
                "max": 30,
            },
            {
                "id": "govt_scheme",
                "type": "multiselect",
                "text_en": "Government schemes availed",
                "options": [
                    "PM-KISAN", "MGNREGS", "Ration Card", "Jan Dhan", "None",
                ],
            },
        ],
        "edges": [],
    },
}


# ── Helper: build deterministic validation results ─────────────────────────────

def _make_val(response_id, layer, question_id, status, severity, reason, score):
    return ValidationResult(
        id=str(uuid4()),
        response_id=response_id,
        layer=layer,
        question_id=question_id,
        status=status,
        severity=severity,
        reason=reason,
        score=score,
        created_at=datetime.utcnow().isoformat(),
    )


def _make_fraud(response_id, signal_type, value, threshold, triggered, weight, reason):
    return FraudSignal(
        id=str(uuid4()),
        response_id=response_id,
        signal_type=signal_type,
        value=value,
        threshold=threshold,
        triggered=triggered,
        weight=weight,
        reason=reason,
        created_at=datetime.utcnow().isoformat(),
    )


def _make_coding(response_id, question_id, raw_text, system, code, label, confidence, reason, status, alternatives=None):
    return CodingResult(
        id=str(uuid4()),
        response_id=response_id,
        question_id=question_id,
        raw_text=raw_text,
        system=system,
        suggested_code=code,
        code_label=label,
        confidence=confidence,
        reason=reason,
        alternatives=alternatives or [],
        status=status,
        created_at=datetime.utcnow().isoformat(),
    )


def _make_conf(response_id, score, breakdown, action):
    return ConfidenceScore(
        id=str(uuid4()),
        response_id=response_id,
        score=score,
        breakdown=breakdown,
        action=action,
        created_at=datetime.utcnow().isoformat(),
    )


def _good_fraud_signals(response_id, avg_per_q=10.0):
    """Build clean fraud signals for a good response."""
    return [
        _make_fraud(response_id, "speed", avg_per_q, 8.0, False, 0.30,
                    f"Avg {avg_per_q:.0f}s/question vs 30s threshold — normal"),
        _make_fraud(response_id, "straight_line", 1.0, 5.0, False, 0.25,
                    "Same answer repeated 1x — varied responses"),
        _make_fraud(response_id, "cross_field", 0.0, 1.0, False, 0.25,
                    "0 cross-field inconsistencies — clean"),
        _make_fraud(response_id, "gps_static", 0.0, 1.0, False, 0.10,
                    "GPS shows natural movement"),
        _make_fraud(response_id, "device_change", 0.0, 1.0, False, 0.10,
                    "Device ID consistent"),
    ]


def _bad_fraud_signals(response_id, avg_per_q=0.6):
    """Build suspicious fraud signals for a bad response."""
    return [
        _make_fraud(response_id, "speed", avg_per_q, 8.0, True, 0.30,
                    f"Avg {avg_per_q:.1f}s/question vs 30s threshold — suspicious speed"),
        _make_fraud(response_id, "straight_line", 7.0, 5.0, True, 0.25,
                    "Same answer repeated 7x — straight-lining detected"),
        _make_fraud(response_id, "cross_field", 1.0, 1.0, True, 0.25,
                    "1 cross-field inconsistencies — suspicious"),
        _make_fraud(response_id, "gps_static", 1.0, 1.0, True, 0.10,
                    "GPS static/unchanged across submissions"),
        _make_fraud(response_id, "device_change", 0.0, 1.0, False, 0.10,
                    "Device ID consistent"),
    ]


def _good_val_results(response_id):
    """All validation layers pass for a good response."""
    return [
        _make_val(response_id, 1, "name", "pass", "low", "Field 'name' present", 1.0),
        _make_val(response_id, 1, "age", "pass", "low", "Field 'age' present", 1.0),
        _make_val(response_id, 1, "gender", "pass", "low", "Field 'gender' present", 1.0),
        _make_val(response_id, 1, "employment_status", "pass", "low", "Field 'employment_status' present", 1.0),
        _make_val(response_id, 2, "cross_field", "pass", "low", "All cross-field checks passed", 1.0),
        _make_val(response_id, 3, "monthly_income", "pass", "low", "Income within expected statistical range", 1.0),
        _make_val(response_id, 4, "consistency", "pass", "low", "Internal consistency checks passed", 1.0),
        _make_val(response_id, 5, "historical", "pass", "low", "No historical baseline anomalies detected", 1.0),
    ]


def _bad_val_results(response_id, income):
    """Validation failures for unemployed + high income scenario."""
    return [
        _make_val(response_id, 1, "name", "pass", "low", "Field 'name' present", 1.0),
        _make_val(response_id, 1, "age", "pass", "low", "Field 'age' present", 1.0),
        _make_val(response_id, 1, "gender", "pass", "low", "Field 'gender' present", 1.0),
        _make_val(response_id, 1, "employment_status", "pass", "low", "Field 'employment_status' present", 1.0),
        _make_val(response_id, 2, "monthly_income", "fail", "high",
                  f"Income ₹{income:,.0f} contradicts status 'Unemployed' — flagged for review", 0.0),
        _make_val(response_id, 3, "monthly_income", "warn", "low",
                  f"Income ₹{income:,.0f} exceeds p95 for TN employment survey (₹80,000)", 0.6),
        _make_val(response_id, 4, "consistency", "pass", "low", "Internal consistency checks passed", 1.0),
        _make_val(response_id, 5, "historical", "pass", "low", "No historical baseline anomalies detected", 1.0),
    ]


# ── ENUM-A good responses ──────────────────────────────────────────────────────

ENUM_A_CASES = [
    # (occupation, industry, income, employment_status, duration_seconds, gender, age, household_size)
    ("auto driver",      "transport",           12000, "Self-employed", 90,  "Male",   38, 4),
    ("farmer",           "paddy",               8000,  "Self-employed", 85,  "Male",   52, 5),
    ("software engineer","software development", 65000, "Employed",      110, "Male",   28, 3),
    ("shopkeeper",       "general store",       18000, "Self-employed", 95,  "Male",   44, 5),
    ("teacher",          "school",              32000, "Employed",      100, "Female", 35, 4),
    ("electrician",      "construction",        22000, "Self-employed", 88,  "Male",   40, 4),
    ("carpenter",        "furniture",           15000, "Self-employed", 92,  "Male",   45, 6),
    ("barber",           "salon",               10000, "Self-employed", 78,  "Male",   30, 3),
    ("driver",           "transport",           14000, "Employed",      80,  "Male",   36, 4),
    ("labourer",         "construction",        7000,  "Employed",      75,  "Male",   29, 5),
    ("fisherman",        "fishing",             9000,  "Self-employed", 95,  "Male",   48, 5),
    ("auto driver",      "passenger transport", 11000, "Self-employed", 88,  "Male",   33, 4),
    ("farmer",           "crop farming",        9500,  "Self-employed", 82,  "Male",   58, 6),
    ("teacher",          "education",           28000, "Employed",      105, "Female", 42, 4),
    ("shopkeeper",       "retail",              16000, "Self-employed", 91,  "Female", 39, 4),
]

# NCO/NIC code lookups for each occupation (deterministic, no DB needed)
OCCUPATION_CODE_MAP = {
    "auto driver":       ("8322", "Drivers, auto-rickshaw/three-wheeler", 0.99, "Exact match with synonym 'auto driver'"),
    "farmer":            ("6111", "Field crop and vegetable growers",      0.99, "Exact match with synonym 'farmer'"),
    "software engineer": ("2511", "Software developers",                   0.99, "Exact match with synonym 'software engineer'"),
    "shopkeeper":        ("5223", "Shop sales assistants",                 0.99, "Exact match with synonym 'shopkeeper'"),
    "teacher":           ("2320", "Vocational education teachers",         0.99, "Exact match with synonym 'teacher'"),
    "electrician":       ("7411", "Building electricians",                 0.99, "Exact match with synonym 'electrician'"),
    "carpenter":         ("7115", "Carpenters and joiners",                0.99, "Exact match with synonym 'carpenter'"),
    "barber":            ("5141", "Hairdressers",                          0.99, "Exact match with synonym 'barber'"),
    "driver":            ("5111", "Travel attendants and travel stewards", 0.99, "Exact match with synonym 'driver'"),
    "labourer":          ("9999", "Labourers not elsewhere classified",    0.99, "Exact match with synonym 'labourer'"),
    "fisherman":         ("0110", "Skilled agricultural and fishery workers", 0.99, "Exact match with synonym 'fisherman'"),
}

INDUSTRY_CODE_MAP = {
    "transport":            ("4921", "Urban and suburban passenger land transport", 0.92, "Input contains synonym 'transport'"),
    "paddy":                ("0111", "Growing of cereals",                         0.92, "Exact match with synonym 'paddy'"),
    "software development": ("6201", "Computer programming activities",            0.99, "Exact match with synonym 'software development'"),
    "general store":        ("4711", "Retail sale in non-specialised stores",      0.90, "Input contains synonym 'general store'"),
    "school":               ("8510", "Pre-primary and primary education",           0.92, "Exact match with synonym 'school'"),
    "construction":         ("4312", "Site preparation",                           0.92, "Exact match with synonym 'construction'"),
    "furniture":            ("4711", "Retail sale in non-specialised stores",      0.75, "Partial token match with synonym 'store'"),
    "salon":                ("9602", "Hairdressing and other beauty treatment",    0.99, "Exact match with synonym 'salon'"),
    "fishing":              ("0111", "Growing of cereals",                         0.70, "Partial match"),
    "passenger transport":  ("4921", "Urban and suburban passenger land transport", 0.99, "Exact match with synonym 'passenger transport'"),
    "crop farming":         ("0111", "Growing of cereals",                         0.90, "Input contains synonym 'crop farming'"),
    "education":            ("8510", "Pre-primary and primary education",           0.92, "Exact match with synonym 'education'"),
    "retail":               ("4711", "Retail sale in non-specialised stores",      0.92, "Exact match with synonym 'retail'"),
}


def _get_occ_code(occupation):
    return OCCUPATION_CODE_MAP.get(occupation, ("9999", "Labourers not elsewhere classified", 0.75, "Partial match"))


def _get_ind_code(industry):
    return INDUSTRY_CODE_MAP.get(industry, ("4711", "Retail sale in non-specialised stores", 0.75, "Partial match"))


def seed_database():
    db = SessionLocal()
    try:
        # ── Seed demo users ────────────────────────────────────────────────
        import hashlib
        def hash_pw(p): return hashlib.sha256(p.encode()).hexdigest()

        if db.query(User).count() == 0:
            demo_users = [
                User(id="user-admin-001", username="admin", password_hash=hash_pw("admin123"), name="Admin User", role="admin", created_at=datetime.utcnow()),
                User(id="user-enum-001", username="lakshmi", password_hash=hash_pw("field123"), name="Lakshmi R", role="enumerator", created_at=datetime.utcnow()),
                User(id="user-enum-002", username="suspect", password_hash=hash_pw("field123"), name="Suspect B", role="enumerator", created_at=datetime.utcnow()),
                User(id="user-sup-001", username="supervisor", password_hash=hash_pw("super123"), name="Supervisor Kumar", role="supervisor", created_at=datetime.utcnow()),
                User(id="user-pol-001", username="policy", password_hash=hash_pw("policy123"), name="Policy Analyst", role="policy", created_at=datetime.utcnow()),
            ]
            for u in demo_users:
                db.add(u)
            db.commit()
            print("[seed] 5 demo users added")

        # ── Idempotency check ──────────────────────────────────────────────
        existing_codes = db.query(ClassificationCode).count()
        if existing_codes > 0:
            print(f"[seed] Already seeded ({existing_codes} classification codes). Skipping.")
            return

        print("[seed] Seeding database...")

        # ── 1. Classification codes ────────────────────────────────────────
        for entry in NCO_CODES:
            db.add(ClassificationCode(
                id=str(uuid4()),
                system="NCO",
                code=entry["code"],
                label=entry["label"],
                synonyms=entry["synonyms"],
            ))

        for entry in NIC_CODES:
            db.add(ClassificationCode(
                id=str(uuid4()),
                system="NIC",
                code=entry["code"],
                label=entry["label"],
                synonyms=entry["synonyms"],
            ))

        db.commit()
        print("[seed] Classification codes seeded.")

        # ── 2. Demo survey ─────────────────────────────────────────────────
        survey = Survey(
            id=DEMO_SURVEY["id"],
            title=DEMO_SURVEY["title"],
            description=DEMO_SURVEY["description"],
            language_codes=DEMO_SURVEY["language_codes"],
            question_graph=DEMO_SURVEY["question_graph"],
            created_at=datetime.utcnow().isoformat(),
        )
        db.add(survey)
        db.commit()
        print("[seed] Demo survey seeded.")

        # ── 3. Enumerators ─────────────────────────────────────────────────
        enum_a = EnumeratorProfile(
            id="enum-a-001",
            name="Lakshmi R",
            phone="9876543210",
            fsu_id="TN-FSU-042",
            trust_score=92.0,
            status="active",
            created_at=datetime.utcnow().isoformat(),
        )
        enum_b = EnumeratorProfile(
            id="enum-b-001",
            name="Suspect B",
            phone="9123456789",
            fsu_id="TN-FSU-042",
            trust_score=58.0,
            status="active",
            created_at=datetime.utcnow().isoformat(),
        )
        db.add(enum_a)
        db.add(enum_b)
        db.commit()
        print("[seed] Enumerators seeded.")

        # ── 4. Prepopulation records ───────────────────────────────────────
        db.add(PrepopulationSource(
            id="prep-001",
            identifier_type="household_id",
            identifier_value="HH-TN-0042",
            known_fields={
                "name": "Lakshmi R",
                "state": "Tamil Nadu",
                "district": "Chennai",
                "source": "prior round",
            },
            source="Census 2011 pilot",
            updated_at=datetime.utcnow().isoformat(),
        ))
        db.add(PrepopulationSource(
            id="prep-002",
            identifier_type="phone",
            identifier_value="9812345612",
            known_fields={
                "name": "Ramesh K",
                "state": "Tamil Nadu",
                "district": "Coimbatore",
                "source": "SECC seed",
            },
            source="SECC 2011",
            updated_at=datetime.utcnow().isoformat(),
        ))
        db.commit()
        print("[seed] Prepopulation records seeded.")

        # ── 5. ENUM-A: 15 good responses ──────────────────────────────────
        base_time = datetime.utcnow() - timedelta(days=5)

        for i, (occupation, industry, income, emp_status, duration, gender, age, hh_size) in enumerate(ENUM_A_CASES):
            rid = f"resp-a-{i+1:03d}"
            created = (base_time + timedelta(hours=i * 3)).isoformat()

            answers = {
                "name": f"Respondent A{i+1}",
                "age": age,
                "gender": gender,
                "state": "Tamil Nadu",
                "employment_status": emp_status,
                "occupation": occupation,
                "industry": industry,
                "monthly_income": income,
                "household_size": hh_size,
                "govt_scheme": ["Ration Card"],
            }
            paradata = {
                "duration_seconds": duration,
                "completeness": 1.0,
                "gps_static": False,
                "device_change": False,
            }

            r = Response(
                id=rid,
                survey_id="demo-survey-001",
                enumerator_id="enum-a-001",
                household_id=f"HH-TN-A{i+1:03d}",
                answers=answers,
                paradata=paradata,
                consent_id=None,
                status="approve",
                created_at=created,
            )
            db.add(r)

            # Coding results
            occ_code, occ_label, occ_conf, occ_reason = _get_occ_code(occupation)
            ind_code, ind_label, ind_conf, ind_reason = _get_ind_code(industry)

            db.add(_make_coding(rid, "occupation", occupation, "NCO", occ_code, occ_label,
                                occ_conf, occ_reason, "auto" if occ_conf >= 0.80 else "review"))
            db.add(_make_coding(rid, "industry", industry, "NIC", ind_code, ind_label,
                                ind_conf, ind_reason, "auto" if ind_conf >= 0.80 else "review"))

            # Validation — all pass
            for vr in _good_val_results(rid):
                db.add(vr)

            # Fraud signals — clean
            avg_per_q = duration / len(answers)
            for fs in _good_fraud_signals(rid, avg_per_q):
                db.add(fs)

            # Confidence score — 82-95 range
            # val: 8/8 pass → 40, fraud: 0 triggered → 35, coding: avg~0.93 → 13.9, completeness: 10 → 98.9 capped 100
            val_comp = 40.0
            fraud_comp = 35.0
            coding_avg = (occ_conf + ind_conf) / 2
            coding_comp = round(coding_avg * 100 * 0.15, 1)
            comp_comp = 10.0
            score = round(min(100.0, val_comp + fraud_comp + coding_comp + comp_comp), 1)
            # Vary slightly per response for realism
            score = round(max(82.0, min(95.0, score - (i % 3) * 1.5)), 1)

            db.add(_make_conf(rid, score, {
                "validation": val_comp,
                "fraud": fraud_comp,
                "coding": coding_comp,
                "completeness": comp_comp,
            }, "approve"))

        db.commit()
        print("[seed] ENUM-A responses seeded.")

        # ── 6. ENUM-B: 8 bad responses ────────────────────────────────────
        bad_base_time = datetime.utcnow() - timedelta(days=2)

        bad_cases = [
            # (income, duration_seconds, gps_static)
            (200000, 5,  True),
            (200000, 4,  True),
            (150000, 6,  True),
            (80000,  7,  True),
            (200000, 3,  True),
            (120000, 5,  True),
            (90000,  8,  True),
            (160000, 4,  True),
        ]

        for i, (income, duration, gps_static) in enumerate(bad_cases):
            rid = f"resp-b-{i+1:03d}"
            created = (bad_base_time + timedelta(hours=i * 2)).isoformat()

            answers = {
                "name": f"Respondent B{i+1}",
                "age": 30 + i,
                "gender": "Male",
                "state": "Tamil Nadu",
                "employment_status": "Unemployed",
                "monthly_income": income,
                "household_size": 4,
                "govt_scheme": ["None"],
            }
            paradata = {
                "duration_seconds": duration,
                "completeness": 0.85,
                "gps_static": gps_static,
                "device_change": False,
            }

            r = Response(
                id=rid,
                survey_id="demo-survey-001",
                enumerator_id="enum-b-001",
                household_id=f"HH-TN-B{i+1:03d}",
                answers=answers,
                paradata=paradata,
                consent_id=None,
                status="reinterview",
                created_at=created,
            )
            db.add(r)

            # Validation — cross-field failures
            for vr in _bad_val_results(rid, income):
                db.add(vr)

            # Fraud signals — suspicious
            num_answers = len(answers)
            avg_per_q = duration / max(num_answers, 1)
            for fs in _bad_fraud_signals(rid, avg_per_q):
                db.add(fs)

            # Confidence score — 30-50 range
            # val: 6/8 pass → 30, fraud: all triggered except device → 65% → (100-65)*0.35=12.25,
            # coding: none → 15, completeness: 0.85*10=8.5 → ~65.75 adjusted down
            val_passes = 6
            val_total = 8
            val_comp = round((val_passes / val_total) * 40, 1)  # 30.0
            fraud_pct = 90.0  # speed + straight + cross + gps all triggered = 0.30+0.25+0.25+0.10 = 0.90
            fraud_comp = round((100 - fraud_pct) * 0.35, 1)      # 3.5
            coding_comp = round(1.0 * 100 * 0.15, 1)              # 15.0 (no coded fields)
            comp_comp = round(0.85 * 10, 1)                       # 8.5
            raw_score = val_comp + fraud_comp + coding_comp + comp_comp  # ~57 → but we want 30-50
            # Clamp to show clear reinterview signal
            score = round(max(30.0, min(50.0, raw_score - 20)), 1)
            # Vary per response
            score = round(max(30.0, min(50.0, score + (i % 3) * 2 - 2)), 1)

            db.add(_make_conf(rid, score, {
                "validation": val_comp,
                "fraud": fraud_comp,
                "coding": coding_comp,
                "completeness": comp_comp,
            }, "reinterview"))

        db.commit()

        # Update ENUM-B trust to 40
        enum_b = db.get(EnumeratorProfile, "enum-b-001")
        enum_b.trust_score = 40.0
        db.commit()

        print("[seed] ENUM-B responses seeded.")

        # ── 7. Trust history ───────────────────────────────────────────────
        trust_history_base = datetime.utcnow() - timedelta(days=30)

        # ENUM-A: stable around 92 (slight variation)
        enum_a_trust_series = [91.0, 91.5, 92.0, 91.8, 92.2, 92.5, 92.0, 92.3, 92.1, 92.0]
        prev = 90.5
        for j, ts in enumerate(enum_a_trust_series):
            delta = round(ts - prev, 2)
            db.add(TrustHistory(
                id=str(uuid4()),
                enumerator_id="enum-a-001",
                trust_score=ts,
                delta=delta,
                reason=f"Response processed: confidence={80 + j}, fraud={5 + j % 3}",
                created_at=(trust_history_base + timedelta(days=j * 3)).isoformat(),
            ))
            prev = ts

        # ENUM-B: declining from 75 → 40
        enum_b_trust_series = [75.0, 68.0, 62.0, 57.0, 52.0, 48.0, 44.0, 42.0, 41.0, 40.0]
        prev_b = 79.0
        for j, ts in enumerate(enum_b_trust_series):
            delta = round(ts - prev_b, 2)
            db.add(TrustHistory(
                id=str(uuid4()),
                enumerator_id="enum-b-001",
                trust_score=ts,
                delta=delta,
                reason=f"Response processed: confidence={35 + j * 2}, fraud={70 - j * 3}",
                created_at=(trust_history_base + timedelta(days=j * 3)).isoformat(),
            ))
            prev_b = ts

        db.commit()
        print("[seed] Trust history seeded.")
        print("[seed] Database seeding complete.")

    except Exception as e:
        db.rollback()
        print(f"[seed] Error during seeding: {e}")
        raise
    finally:
        db.close()
