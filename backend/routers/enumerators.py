from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import EnumeratorProfile, TrustHistory, Response, ConfidenceScore, FraudSignal

router = APIRouter()


@router.get("/enumerators")
def list_enumerators(db: Session = Depends(get_db)):
    enumerators = (
        db.query(EnumeratorProfile)
        .order_by(EnumeratorProfile.trust_score.desc())
        .all()
    )
    result = []
    for e in enumerators:
        response_count = db.query(Response).filter(Response.enumerator_id == e.id).count()
        result.append(
            {
                "id": e.id,
                "name": e.name,
                "phone": e.phone,
                "fsuId": e.fsu_id,
                "trustScore": e.trust_score,
                "status": e.status,
                "responseCount": response_count,
                "createdAt": e.created_at,
            }
        )
    return result


@router.get("/enumerators/{enumerator_id}")
def get_enumerator(enumerator_id: str, db: Session = Depends(get_db)):
    e = db.get(EnumeratorProfile, enumerator_id)
    if not e:
        raise HTTPException(status_code=404, detail="Enumerator not found")

    response_count = db.query(Response).filter(Response.enumerator_id == e.id).count()

    # Compute avg confidence and fraud for this enumerator
    responses = db.query(Response).filter(Response.enumerator_id == e.id).all()
    response_ids = [r.id for r in responses]

    avg_confidence = None
    avg_fraud = None
    if response_ids:
        confs = (
            db.query(ConfidenceScore)
            .filter(ConfidenceScore.response_id.in_(response_ids))
            .all()
        )
        if confs:
            avg_confidence = round(sum(c.score for c in confs) / len(confs), 1)

        fraud_scores = []
        for rid in response_ids:
            signals = db.query(FraudSignal).filter(FraudSignal.response_id == rid).all()
            if signals:
                tw = sum(s.weight for s in signals) or 1.0
                triggered_w = sum(s.weight for s in signals if s.triggered)
                fraud_scores.append((triggered_w / tw) * 100)
        if fraud_scores:
            avg_fraud = round(sum(fraud_scores) / len(fraud_scores), 1)

    return {
        "id": e.id,
        "name": e.name,
        "phone": e.phone,
        "fsuId": e.fsu_id,
        "trustScore": e.trust_score,
        "status": e.status,
        "responseCount": response_count,
        "avgConfidenceScore": avg_confidence,
        "avgFraudScore": avg_fraud,
        "createdAt": e.created_at,
    }


@router.get("/enumerators/{enumerator_id}/history")
def get_trust_history(enumerator_id: str, db: Session = Depends(get_db)):
    e = db.get(EnumeratorProfile, enumerator_id)
    if not e:
        raise HTTPException(status_code=404, detail="Enumerator not found")

    history = (
        db.query(TrustHistory)
        .filter(TrustHistory.enumerator_id == enumerator_id)
        .order_by(TrustHistory.created_at.asc())
        .all()
    )
    return {
        "enumeratorId": enumerator_id,
        "name": e.name,
        "currentTrustScore": e.trust_score,
        "history": [
            {
                "id": h.id,
                "trustScore": h.trust_score,
                "delta": h.delta,
                "reason": h.reason,
                "createdAt": h.created_at,
            }
            for h in history
        ],
    }


@router.get("/enumerators/{enumerator_id}/responses")
def get_enumerator_responses(
    enumerator_id: str,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    e = db.get(EnumeratorProfile, enumerator_id)
    if not e:
        raise HTTPException(status_code=404, detail="Enumerator not found")

    responses = (
        db.query(Response)
        .filter(Response.enumerator_id == enumerator_id)
        .order_by(Response.created_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for r in responses:
        conf = (
            db.query(ConfidenceScore)
            .filter(ConfidenceScore.response_id == r.id)
            .first()
        )
        result.append(
            {
                "id": r.id,
                "surveyId": r.survey_id,
                "householdId": r.household_id,
                "status": r.status,
                "createdAt": r.created_at,
                "confidenceScore": conf.score if conf else None,
                "action": conf.action if conf else None,
            }
        )
    return result
