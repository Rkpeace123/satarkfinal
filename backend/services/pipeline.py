import json
from uuid import uuid4
from datetime import datetime
from typing import TYPE_CHECKING

from models import (
    Response,
    CodingResult,
    ValidationResult,
    FraudSignal,
    ConfidenceScore,
    EnumeratorProfile,
)
from services.auto_coder import auto_coder
from services.validation import validation_pipeline
from services.fraud import fraud_engine
from services.confidence import confidence_engine
from services.trust import trust_aggregator


async def run_pipeline(response_id: str, db, ws_manager) -> dict:
    """
    End-to-end processing pipeline for a submitted survey response.

    Steps:
        1. Auto-code free-text fields (occupation → NCO, industry → NIC)
        2. Five-layer validation
        3. Fraud signal analysis
        4. Confidence score computation
        5. Update response status
        6. Update enumerator trust score
        7. Broadcast to WebSocket if flagged
    """
    response: Response = db.get(Response, response_id)
    if not response:
        raise ValueError(f"Response {response_id} not found")

    answers = response.answers or {}

    # ── 1. Auto-code free-text fields ─────────────────────────────────────
    coding_results = []

    if answers.get("occupation"):
        result = auto_coder.code_text(answers["occupation"], "NCO", db)
        cr = CodingResult(
            id=str(uuid4()),
            response_id=response_id,
            question_id="occupation",
            raw_text=answers["occupation"],
            system=result.get("system", "NCO"),
            suggested_code=result.get("suggested_code"),
            code_label=result.get("code_label"),
            confidence=result.get("confidence", 0.0),
            reason=result.get("reason", ""),
            alternatives=result.get("alternatives", []),
            status=result.get("status", "review"),
            created_at=datetime.utcnow().isoformat(),
        )
        db.add(cr)
        coding_results.append(cr)

    if answers.get("industry"):
        result = auto_coder.code_text(answers["industry"], "NIC", db)
        cr = CodingResult(
            id=str(uuid4()),
            response_id=response_id,
            question_id="industry",
            raw_text=answers["industry"],
            system=result.get("system", "NIC"),
            suggested_code=result.get("suggested_code"),
            code_label=result.get("code_label"),
            confidence=result.get("confidence", 0.0),
            reason=result.get("reason", ""),
            alternatives=result.get("alternatives", []),
            status=result.get("status", "review"),
            created_at=datetime.utcnow().isoformat(),
        )
        db.add(cr)
        coding_results.append(cr)

    # ── 2. Validation ─────────────────────────────────────────────────────
    from models import Survey
    survey = db.get(Survey, response.survey_id)

    val_results = validation_pipeline.validate(answers, survey, db)
    for vr in val_results:
        vr.response_id = response_id
        vr.id = str(uuid4())
        db.add(vr)

    # ── 3. Fraud ──────────────────────────────────────────────────────────
    fraud_score, fraud_signals = fraud_engine.analyze(response, val_results, db)
    for fs in fraud_signals:
        fs.id = str(uuid4())
        fs.response_id = response_id
        db.add(fs)

    # ── 4. Confidence ─────────────────────────────────────────────────────
    conf_data = confidence_engine.compute(
        val_results, fraud_score, coding_results, response.paradata or {}
    )
    conf = ConfidenceScore(
        id=str(uuid4()),
        response_id=response_id,
        score=conf_data["score"],
        breakdown=conf_data["breakdown"],
        action=conf_data["action"],
        created_at=datetime.utcnow().isoformat(),
    )
    db.add(conf)

    # ── 5. Update response status ─────────────────────────────────────────
    response.status = conf_data["action"]

    db.commit()

    # ── 6. Update enumerator trust ────────────────────────────────────────
    new_trust = trust_aggregator.update(
        response.enumerator_id, conf_data["score"], fraud_score, db
    )

    # ── 7. Broadcast to WebSocket if flagged ──────────────────────────────
    failures = [v for v in val_results if v.status in ("fail", "warn")]
    if failures or fraud_score > 20 or conf_data["score"] < 80:
        enumerator = db.get(EnumeratorProfile, response.enumerator_id)
        message = {
            "type": "new_flag",
            "response_id": response_id,
            "enumerator_id": response.enumerator_id,
            "enumerator_name": enumerator.name if enumerator else "Unknown",
            "confidence_score": conf_data["score"],
            "fraud_score": round(fraud_score, 1),
            "action": conf_data["action"],
            "trust_score": new_trust,
            "validation_failures": [
                {
                    "layer": v.layer,
                    "reason": v.reason,
                    "severity": v.severity,
                }
                for v in failures
            ],
            "coding_results": [
                {
                    "raw": cr.raw_text,
                    "code": cr.suggested_code,
                    "label": cr.code_label,
                    "confidence": cr.confidence,
                    "reason": cr.reason,
                }
                for cr in coding_results
            ],
            "timestamp": datetime.utcnow().isoformat(),
        }
        await ws_manager.broadcast(json.dumps(message))

    return {
        "response_id": response_id,
        "confidence_score": conf_data["score"],
        "action": conf_data["action"],
        "fraud_score": round(fraud_score, 1),
        "trust_score": new_trust,
        "validation_failures": len([v for v in val_results if v.status == "fail"]),
        "coding_results": [
            {
                "raw": cr.raw_text,
                "code": cr.suggested_code,
                "confidence": cr.confidence,
            }
            for cr in coding_results
        ],
    }
