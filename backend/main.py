from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
from models import (
    Response,
    ConfidenceScore,
    EnumeratorProfile,
    FraudSignal,
)
from routers import surveys, responses, enumerators, coding, prepopulate, consent, actions, websocket_router
from seed.seed_data import seed_database

app = FastAPI(title="SATARK API", version="2.0", description="Statistical Analysis, Trust and Automation for Response Knowledge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(surveys.router, prefix="/api", tags=["surveys"])
app.include_router(responses.router, prefix="/api", tags=["responses"])
app.include_router(enumerators.router, prefix="/api", tags=["enumerators"])
app.include_router(coding.router, prefix="/api", tags=["coding"])
app.include_router(prepopulate.router, prefix="/api", tags=["prepopulate"])
app.include_router(consent.router, prefix="/api", tags=["consent"])
app.include_router(actions.router, prefix="/api", tags=["actions"])
app.include_router(websocket_router.router, tags=["websocket"])


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    seed_database()


# ── Stats endpoint ────────────────────────────────────────────────────────────
@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    """Dashboard statistics."""
    total_responses = db.query(Response).count()

    # Count flagged (reinterview or review status)
    flagged_count = (
        db.query(Response)
        .filter(Response.status.in_(["reinterview", "review"]))
        .count()
    )

    # Average confidence score
    conf_scores = db.query(ConfidenceScore).all()
    avg_confidence = (
        round(sum(c.score for c in conf_scores) / len(conf_scores), 1)
        if conf_scores
        else 0.0
    )

    # Average trust score across active enumerators
    enumerators = db.query(EnumeratorProfile).filter(EnumeratorProfile.status == "active").all()
    avg_trust = (
        round(sum(e.trust_score for e in enumerators) / len(enumerators), 1)
        if enumerators
        else 0.0
    )

    enumerator_count = len(enumerators)

    # Fraud stats: compute avg fraud score across all responses
    all_responses = db.query(Response).all()
    fraud_scores_list = []
    for r in all_responses:
        signals = db.query(FraudSignal).filter(FraudSignal.response_id == r.id).all()
        if signals:
            tw = sum(s.weight for s in signals) or 1.0
            trig_w = sum(s.weight for s in signals if s.triggered)
            fraud_scores_list.append((trig_w / tw) * 100)

    avg_fraud = (
        round(sum(fraud_scores_list) / len(fraud_scores_list), 1)
        if fraud_scores_list
        else 0.0
    )

    return {
        "totalResponses": total_responses,
        "flaggedCount": flagged_count,
        "avgConfidenceScore": avg_confidence,
        "avgTrustScore": avg_trust,
        "avgFraudScore": avg_fraud,
        "enumeratorCount": enumerator_count,
        "sampleSurveyId": "demo-survey-001",
    }


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "SATARK API v2", "docs": "/docs"}
