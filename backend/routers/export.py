from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Response, CodingResult, ValidationResult, EnumeratorProfile
import csv, io, json

router = APIRouter()

@router.get("/export")
def export_responses(
    format: str = Query("csv", enum=["csv", "json"]),
    enumerator_id: str = None,
    status: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Response)
    if enumerator_id: query = query.filter(Response.enumerator_id == enumerator_id)
    if status: query = query.filter(Response.status == status)
    responses = query.order_by(Response.created_at.desc()).limit(500).all()

    rows = []
    for r in responses:
        answers = r.answers or {}
        # Get coding results
        codes = db.query(CodingResult).filter(CodingResult.response_id == r.id).all()
        code_map = {c.question_id: {"code": c.suggested_code, "label": c.code_label, "confidence": c.confidence} for c in codes}
        # Get confidence
        conf_score = None
        from models import ConfidenceScore
        cs = db.query(ConfidenceScore).filter(ConfidenceScore.response_id == r.id).first()
        if cs: conf_score = cs.score

        # Get enumerator name
        enum = db.query(EnumeratorProfile).filter(EnumeratorProfile.id == r.enumerator_id).first()

        row = {
            "response_id": r.id,
            "survey_id": r.survey_id,
            "enumerator_id": r.enumerator_id,
            "enumerator_name": enum.name if enum else "",
            "household_id": r.household_id,
            "status": r.status,
            "confidence_score": conf_score,
            "created_at": r.created_at if r.created_at else "",
        }
        # Add answers
        for k, v in answers.items():
            row[f"ans_{k}"] = v if not isinstance(v, dict) else json.dumps(v)
        # Add coded fields beside raw
        for q_id, code_data in code_map.items():
            row[f"code_{q_id}"] = code_data["code"]
            row[f"code_{q_id}_label"] = code_data["label"]
            row[f"code_{q_id}_confidence"] = code_data["confidence"]
        rows.append(row)

    if format == "json":
        content = json.dumps(rows, indent=2, default=str)
        return StreamingResponse(
            io.StringIO(content),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=satark_export.json"}
        )

    # CSV
    if not rows:
        return StreamingResponse(io.StringIO("no data"), media_type="text/csv")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=satark_export.csv"}
    )
