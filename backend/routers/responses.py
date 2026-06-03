import asyncio
from uuid import uuid4
from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Response,
    ValidationResult,
    FraudSignal,
    CodingResult,
    ConfidenceScore,
)

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ResponseSubmit(BaseModel):
    survey_id: str
    enumerator_id: str
    household_id: Optional[str] = None
    answers: Dict[str, Any]
    paradata: Optional[Dict[str, Any]] = {}
    consent_id: Optional[str] = None


# ── Helper ────────────────────────────────────────────────────────────────────

def _format_response(r: Response, db: Session) -> dict:
    val_results = (
        db.query(ValidationResult)
        .filter(ValidationResult.response_id == r.id)
        .all()
    )
    fraud_signals = (
        db.query(FraudSignal)
        .filter(FraudSignal.response_id == r.id)
        .all()
    )
    coding_results = (
        db.query(CodingResult)
        .filter(CodingResult.response_id == r.id)
        .all()
    )
    conf_score = (
        db.query(ConfidenceScore)
        .filter(ConfidenceScore.response_id == r.id)
        .first()
    )

    return {
        "id": r.id,
        "surveyId": r.survey_id,
        "enumeratorId": r.enumerator_id,
        "householdId": r.household_id,
        "answers": r.answers,
        "paradata": r.paradata,
        "consentId": r.consent_id,
        "status": r.status,
        "createdAt": r.created_at,
        "confidenceScore": (
            {
                "score": conf_score.score,
                "breakdown": conf_score.breakdown,
                "action": conf_score.action,
            }
            if conf_score
            else None
        ),
        "validationResults": [
            {
                "layer": v.layer,
                "questionId": v.question_id,
                "status": v.status,
                "severity": v.severity,
                "reason": v.reason,
                "score": v.score,
            }
            for v in val_results
        ],
        "fraudSignals": [
            {
                "signalType": f.signal_type,
                "value": f.value,
                "threshold": f.threshold,
                "triggered": f.triggered,
                "weight": f.weight,
                "reason": f.reason,
            }
            for f in fraud_signals
        ],
        "codingResults": [
            {
                "questionId": c.question_id,
                "rawText": c.raw_text,
                "system": c.system,
                "suggestedCode": c.suggested_code,
                "codeLabel": c.code_label,
                "confidence": c.confidence,
                "reason": c.reason,
                "alternatives": c.alternatives,
                "status": c.status,
            }
            for c in coding_results
        ],
    }


# ── Routes ────────────────────────────────────────────────────────────────────

async def _run_pipeline_async(response_id: str, db: Session):
    """Run pipeline in background, importing manager lazily to avoid circular imports."""
    from routers.websocket_router import manager
    from services.pipeline import run_pipeline

    await run_pipeline(response_id, db, manager)


@router.post("/responses")
async def submit_response(payload: ResponseSubmit, db: Session = Depends(get_db)):
    """Submit a survey response and run the full analysis pipeline."""
    response = Response(
        id=str(uuid4()),
        survey_id=payload.survey_id,
        enumerator_id=payload.enumerator_id,
        household_id=payload.household_id,
        answers=payload.answers,
        paradata=payload.paradata or {},
        consent_id=payload.consent_id,
        status="pending",
        created_at=datetime.utcnow().isoformat(),
    )
    db.add(response)
    db.commit()

    # Run pipeline synchronously so we can return results
    from routers.websocket_router import manager
    from services.pipeline import run_pipeline

    result = await run_pipeline(response.id, db, manager)
    return result


@router.post("/sync")
async def sync_response(payload: ResponseSubmit, db: Session = Depends(get_db)):
    """Alias for POST /responses — supports offline sync clients."""
    return await submit_response(payload, db)


@router.get("/responses")
def list_responses(
    status: Optional[str] = None,
    enumerator_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(Response)
    if status:
        query = query.filter(Response.status == status)
    if enumerator_id:
        query = query.filter(Response.enumerator_id == enumerator_id)

    responses = query.order_by(Response.created_at.desc()).limit(limit).all()

    results = []
    for r in responses:
        conf = (
            db.query(ConfidenceScore)
            .filter(ConfidenceScore.response_id == r.id)
            .first()
        )
        fraud_signals = (
            db.query(FraudSignal).filter(FraudSignal.response_id == r.id).all()
        )
        triggered_weight = sum(
            s.weight for s in fraud_signals if s.triggered
        )
        total_weight = sum(s.weight for s in fraud_signals) or 1.0
        fraud_score = round((triggered_weight / total_weight) * 100, 1) if fraud_signals else 0.0

        results.append(
            {
                "id": r.id,
                "surveyId": r.survey_id,
                "enumeratorId": r.enumerator_id,
                "householdId": r.household_id,
                "status": r.status,
                "createdAt": r.created_at,
                "confidenceScore": conf.score if conf else None,
                "action": conf.action if conf else None,
                "fraudScore": fraud_score,
            }
        )
    return results


@router.get("/responses/{response_id}")
def get_response(response_id: str, db: Session = Depends(get_db)):
    r = db.get(Response, response_id)
    if not r:
        raise HTTPException(status_code=404, detail="Response not found")
    return _format_response(r, db)
