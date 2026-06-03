from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import PrepopulationSource

router = APIRouter()


class PrepopulateRequest(BaseModel):
    identifier_type: str   # "household_id", "phone", etc.
    identifier_value: str


@router.post("/prepopulate")
def prepopulate(payload: PrepopulateRequest, db: Session = Depends(get_db)):
    """
    Look up known fields from prior census/SECC data for a given identifier.
    Returns pre-filled field values or empty dict if not found.
    """
    record = (
        db.query(PrepopulationSource)
        .filter(
            PrepopulationSource.identifier_type == payload.identifier_type,
            PrepopulationSource.identifier_value == payload.identifier_value,
        )
        .first()
    )

    if not record:
        return {
            "found": False,
            "identifierType": payload.identifier_type,
            "identifierValue": payload.identifier_value,
            "knownFields": {},
            "source": None,
        }

    return {
        "found": True,
        "identifierType": record.identifier_type,
        "identifierValue": record.identifier_value,
        "knownFields": record.known_fields or {},
        "source": record.source,
        "updatedAt": record.updated_at,
    }
