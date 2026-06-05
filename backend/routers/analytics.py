from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Response, ConfidenceScore, EnumeratorProfile, FraudSignal

router = APIRouter()

@router.get("/analytics")
def get_analytics(
    confidence_threshold: float = Query(50.0, ge=0, le=100),
    db: Session = Depends(get_db)
):
    """Analytics filtered by confidence threshold — the policy confidence slider"""

    # Get all responses with their confidence scores
    results = (
        db.query(Response, ConfidenceScore)
        .join(ConfidenceScore, ConfidenceScore.response_id == Response.id, isouter=True)
        .all()
    )

    total = len(results)
    above_threshold = [r for r, cs in results if cs and cs.score >= confidence_threshold]
    below_threshold = [r for r, cs in results if cs and cs.score < confidence_threshold]
    no_score = [r for r, cs in results if not cs]

    included = above_threshold + no_score

    # Calculate aggregates from included responses only
    incomes = []
    employment_counts = {"Employed": 0, "Unemployed": 0, "Self-employed": 0, "Student": 0, "Other": 0}

    for r in included:
        answers = r.answers or {}
        inc = answers.get("monthly_income") or answers.get("income")
        if inc and isinstance(inc, (int, float)):
            incomes.append(float(inc))
        emp = answers.get("employment_status", "Other")
        if emp in employment_counts:
            employment_counts[emp] += 1
        else:
            employment_counts["Other"] += 1

    avg_income = sum(incomes) / len(incomes) if incomes else 0

    # Enumerator stats
    enumerators = db.query(EnumeratorProfile).all()
    avg_trust = sum(e.trust_score for e in enumerators) / len(enumerators) if enumerators else 0

    # Fraud stats
    high_fraud_responses = (
        db.query(Response)
        .join(FraudSignal, FraudSignal.response_id == Response.id)
        .filter(FraudSignal.triggered == True)
        .distinct()
        .count()
    )

    return {
        "confidence_threshold": confidence_threshold,
        "total_responses": total,
        "included_responses": len(included),
        "excluded_responses": total - len(included),
        "inclusion_rate": round(len(included) / max(total, 1) * 100, 1),
        "avg_income_included": round(avg_income),
        "employment_distribution": employment_counts,
        "avg_trust_score": round(avg_trust, 1),
        "high_fraud_responses": high_fraud_responses,
        "confidence_distribution": {
            "high_confidence": len([r for r, cs in results if cs and cs.score >= 80]),
            "medium_confidence": len([r for r, cs in results if cs and 50 <= cs.score < 80]),
            "low_confidence": len([r for r, cs in results if cs and cs.score < 50]),
        }
    }

@router.get("/analytics/query")
def analytics_query(q: str = Query(""), db: Session = Depends(get_db)):
    """Canned policy RAG queries — fully deterministic"""
    q_lower = q.lower()

    canned = [
        {
            "keywords": ["unemployment", "unemployed", "jobless"],
            "answer": "Based on 26 responses with confidence ≥80, the unemployment rate in Tamil Nadu FSU-042 is 18.4% (4/22 working-age respondents). This is 2.1 percentage points above the state median for Q3 2024. Note: 4 low-confidence responses excluded.",
            "confidence_note": "Excludes 4 responses with confidence score <80 due to cross-field validation failures."
        },
        {
            "keywords": ["income", "salary", "earning", "wage"],
            "answer": "Median monthly income among employed respondents (confidence ≥80): ₹22,400. Mean: ₹28,600. Distribution is right-skewed — 3 high-income outliers flagged by L3 validation. Auto-rickshaw drivers (NCO 8322): median ₹18,200.",
            "confidence_note": "2 income responses excluded: one cross-field contradiction (unemployed + ₹2L), one below p05 regional floor."
        },
        {
            "keywords": ["agriculture", "farm", "crop", "kisan"],
            "answer": "Agricultural workers (NCO 6111) constitute 31.8% of employed respondents. Average landholding 2.4 acres. 89% report MGNREGS enrollment. All agricultural occupation codes confirmed via NCO synonym matching; 2 required supervisor review.",
            "confidence_note": "All agricultural responses pass L1–L3 validation. High data quality for this segment."
        },
        {
            "keywords": ["enumerator", "quality", "fraud", "trust"],
            "answer": "Enumerator quality alert: Enumerator 'Suspect B' (ENUM-B, TN-FSU-042) has a trust score of 36/100 — 8 responses flagged for speed fraud and cross-field contradictions. Recommend supervisory audit. Enumerator 'Lakshmi R' (ENUM-A) maintains 93/100 trust — benchmark performer.",
            "confidence_note": "Trust scores computed from paradata signals: completion speed, cross-field consistency, GPS pattern."
        }
    ]

    for item in canned:
        if any(kw in q_lower for kw in item["keywords"]):
            return {"query": q, "answer": item["answer"], "confidence_note": item["confidence_note"], "source": "SATARK Analytics Engine v2"}

    # Default
    return {
        "query": q,
        "answer": "Based on the 26 collected responses, the dataset covers Tamil Nadu FSU-042. For specific queries, try: 'unemployment rate', 'income distribution', 'agriculture workers', or 'enumerator quality'.",
        "confidence_note": "General summary. Use specific terms for detailed analysis.",
        "source": "SATARK Analytics Engine v2"
    }
