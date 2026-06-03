from uuid import uuid4
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import ConsentRecord

router = APIRouter()


class ConsentCreate(BaseModel):
    response_id: Optional[str] = None
    household_id: str
    text_version: str = "v1.0"
    scope: Optional[List[str]] = ["survey_data", "data_sharing"]
    method: str = "verbal"  # "verbal", "digital", "written"
    granted: bool = True


@router.post("/consent")
def record_consent(payload: ConsentCreate, db: Session = Depends(get_db)):
    """Record a consent decision for a household/response."""
    consent = ConsentRecord(
        id=str(uuid4()),
        response_id=payload.response_id,
        household_id=payload.household_id,
        text_version=payload.text_version,
        scope=payload.scope,
        granted=payload.granted,
        granted_at=datetime.utcnow().isoformat() if payload.granted else None,
        method=payload.method,
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)

    return {
        "consentId": consent.id,
        "responseId": consent.response_id,
        "householdId": consent.household_id,
        "granted": consent.granted,
        "grantedAt": consent.granted_at,
        "method": consent.method,
        "textVersion": consent.text_version,
        "scope": consent.scope,
    }


@router.get("/consent/{consent_id}")
def get_consent(consent_id: str, db: Session = Depends(get_db)):
    consent = db.get(ConsentRecord, consent_id)
    if not consent:
        raise HTTPException(status_code=404, detail="Consent record not found")
    return {
        "consentId": consent.id,
        "responseId": consent.response_id,
        "householdId": consent.household_id,
        "granted": consent.granted,
        "grantedAt": consent.granted_at,
        "method": consent.method,
        "textVersion": consent.text_version,
        "scope": consent.scope,
    }
