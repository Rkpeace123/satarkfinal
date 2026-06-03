from uuid import uuid4
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import SupervisorAction, Response, CodingResult

router = APIRouter()

# Simulated supervisor ID for the MVP
DEFAULT_SUPERVISOR_ID = "supervisor-001"


class ActionCreate(BaseModel):
    response_id: str
    action_type: str  # "approve","reject","reinterview","correct-code","comment"
    note: Optional[str] = None
    supervisor_id: Optional[str] = DEFAULT_SUPERVISOR_ID
    code_correction: Optional[dict] = None  # {question_id, new_code, new_label}


@router.post("/actions")
def create_action(payload: ActionCreate, db: Session = Depends(get_db)):
    """Record a supervisor action on a response."""
    response = db.get(Response, payload.response_id)
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")

    valid_types = {"approve", "reject", "reinterview", "correct-code", "comment"}
    if payload.action_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"action_type must be one of {sorted(valid_types)}",
        )

    # Apply status change based on action
    if payload.action_type == "approve":
        response.status = "approve"
    elif payload.action_type == "reject":
        response.status = "reject"
    elif payload.action_type == "reinterview":
        response.status = "reinterview"

    # Apply code correction if provided
    if payload.action_type == "correct-code" and payload.code_correction:
        qid = payload.code_correction.get("question_id")
        new_code = payload.code_correction.get("new_code")
        new_label = payload.code_correction.get("new_label")
        if qid and new_code:
            coding = (
                db.query(CodingResult)
                .filter(
                    CodingResult.response_id == payload.response_id,
                    CodingResult.question_id == qid,
                )
                .first()
            )
            if coding:
                coding.suggested_code = new_code
                coding.code_label = new_label or coding.code_label
                coding.status = "corrected"

    action = SupervisorAction(
        id=str(uuid4()),
        response_id=payload.response_id,
        supervisor_id=payload.supervisor_id or DEFAULT_SUPERVISOR_ID,
        action_type=payload.action_type,
        note=payload.note,
        created_at=datetime.utcnow().isoformat(),
    )
    db.add(action)
    db.commit()

    return {
        "actionId": action.id,
        "responseId": action.response_id,
        "supervisorId": action.supervisor_id,
        "actionType": action.action_type,
        "note": action.note,
        "createdAt": action.created_at,
        "responseStatus": response.status,
    }


@router.get("/actions")
def list_actions(
    limit: int = 50,
    response_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List recent supervisor actions."""
    query = db.query(SupervisorAction)
    if response_id:
        query = query.filter(SupervisorAction.response_id == response_id)
    actions = query.order_by(SupervisorAction.created_at.desc()).limit(limit).all()
    return [
        {
            "actionId": a.id,
            "responseId": a.response_id,
            "supervisorId": a.supervisor_id,
            "actionType": a.action_type,
            "note": a.note,
            "createdAt": a.created_at,
        }
        for a in actions
    ]
