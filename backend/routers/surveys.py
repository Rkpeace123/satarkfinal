from uuid import uuid4
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Survey, QuestionBankItem

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class SurveyCreate(BaseModel):
    title: str
    description: Optional[str] = None
    language_codes: Optional[List[str]] = ["en"]
    question_graph: Optional[dict] = None


class SurveyGenerateRequest(BaseModel):
    prompt: str
    question_count: int = 10


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/surveys")
def list_surveys(db: Session = Depends(get_db)):
    surveys = db.query(Survey).all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "languageCodes": s.language_codes,
            "questionCount": len((s.question_graph or {}).get("questions", [])),
            "createdAt": s.created_at,
        }
        for s in surveys
    ]


@router.get("/surveys/{survey_id}")
def get_survey(survey_id: str, db: Session = Depends(get_db)):
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return {
        "id": survey.id,
        "title": survey.title,
        "description": survey.description,
        "languageCodes": survey.language_codes,
        "questionGraph": survey.question_graph,
        "createdAt": survey.created_at,
    }


@router.post("/surveys/generate")
def generate_survey(req: SurveyGenerateRequest, db: Session = Depends(get_db)):
    """Template-based survey generation from a prompt."""
    # Pull from question bank to build the draft
    bank_items = db.query(QuestionBankItem).limit(req.question_count).all()

    questions = []

    # Always include standard demographic questions
    standard_questions = [
        {
            "id": "name",
            "type": "text",
            "text_en": "Respondent name",
            "text_hi": "नाम",
            "text_ta": "பெயர்",
            "required": True,
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
            "required": True,
        },
        {
            "id": "gender",
            "type": "select",
            "text_en": "Gender",
            "text_hi": "लिंग",
            "text_ta": "பாலினம்",
            "options": ["Male", "Female", "Other"],
            "required": True,
        },
    ]

    questions.extend(standard_questions)

    # Add bank items up to requested count
    for item in bank_items[: max(0, req.question_count - len(standard_questions))]:
        questions.append(
            {
                "id": item.id,
                "type": item.type,
                "text_en": item.text_en,
                "text_hi": item.text_hi,
                "text_ta": item.text_ta,
                "options": item.options,
                "code_binding": item.code_binding,
                "domain": item.domain,
            }
        )

    draft = {
        "id": f"draft-{str(uuid4())[:8]}",
        "title": f"Survey: {req.prompt[:60]}",
        "description": f"Auto-generated survey based on: {req.prompt}",
        "language_codes": ["en", "hi", "ta"],
        "question_graph": {
            "questions": questions,
            "edges": [],
        },
        "createdAt": datetime.utcnow().isoformat(),
        "status": "draft",
    }

    return draft


@router.post("/surveys")
def create_survey(payload: SurveyCreate, db: Session = Depends(get_db)):
    survey = Survey(
        id=str(uuid4()),
        title=payload.title,
        description=payload.description,
        language_codes=payload.language_codes,
        question_graph=payload.question_graph or {"questions": [], "edges": []},
        created_at=datetime.utcnow().isoformat(),
    )
    db.add(survey)
    db.commit()
    db.refresh(survey)
    return {
        "id": survey.id,
        "title": survey.title,
        "description": survey.description,
        "languageCodes": survey.language_codes,
        "questionGraph": survey.question_graph,
        "createdAt": survey.created_at,
    }


@router.get("/question-bank")
def list_question_bank(domain: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(QuestionBankItem)
    if domain:
        query = query.filter(QuestionBankItem.domain == domain)
    items = query.all()
    return [
        {
            "id": item.id,
            "textEn": item.text_en,
            "textHi": item.text_hi,
            "textTa": item.text_ta,
            "type": item.type,
            "options": item.options,
            "validationRule": item.validation_rule,
            "codeBinding": item.code_binding,
            "domain": item.domain,
            "usageCount": item.usage_count,
        }
        for item in items
    ]
