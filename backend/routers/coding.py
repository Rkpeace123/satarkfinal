from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from services.auto_coder import auto_coder

router = APIRouter()


class CodingRequest(BaseModel):
    raw_text: str
    system: str  # "NCO" or "NIC"
    question_id: Optional[str] = None


@router.post("/coding")
def code_text(payload: CodingRequest, db: Session = Depends(get_db)):
    """
    Inline auto-coding — no response_id required.
    Maps free-text to an NCO or NIC classification code.
    """
    result = auto_coder.code_text(payload.raw_text, payload.system, db)
    return {
        "rawText": payload.raw_text,
        "system": payload.system,
        "questionId": payload.question_id,
        "suggestedCode": result.get("suggested_code"),
        "codeLabel": result.get("code_label"),
        "confidence": result.get("confidence"),
        "reason": result.get("reason"),
        "alternatives": result.get("alternatives", []),
        "status": result.get("status"),
    }
