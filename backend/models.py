import json
from uuid import uuid4
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, Integer, Text, DateTime, TypeDecorator
from database import Base


class JSONType(TypeDecorator):
    """Stores Python dicts/lists as JSON text in SQLite."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return json.dumps(value, ensure_ascii=False)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # admin | enumerator | supervisor | policy
    created_at = Column(DateTime, default=datetime.utcnow)


class Survey(Base):
    __tablename__ = "surveys"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    title = Column(String, nullable=False)
    description = Column(String)
    language_codes = Column(JSONType)  # list of language codes
    question_graph = Column(JSONType)  # full question graph dict
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class QuestionBankItem(Base):
    __tablename__ = "question_bank"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    text_en = Column(String)
    text_hi = Column(String)
    text_ta = Column(String)
    type = Column(String)  # text, number, select, multiselect, consent
    options = Column(JSONType)
    validation_rule = Column(JSONType)
    code_binding = Column(String)  # NCO, NIC, or None
    domain = Column(String)
    usage_count = Column(Integer, default=0)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class ClassificationCode(Base):
    __tablename__ = "classification_codes"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    system = Column(String, nullable=False)  # "NCO" or "NIC"
    code = Column(String, nullable=False)
    label = Column(String, nullable=False)
    synonyms = Column(JSONType)  # list of synonym strings
    parent_code = Column(String)


class EnumeratorProfile(Base):
    __tablename__ = "enumerator_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String, nullable=False)
    phone = Column(String)
    fsu_id = Column(String)
    trust_score = Column(Float, default=100.0)
    status = Column(String, default="active")
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class TrustHistory(Base):
    __tablename__ = "trust_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    enumerator_id = Column(String, nullable=False)
    trust_score = Column(Float)
    delta = Column(Float)
    reason = Column(String)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class PrepopulationSource(Base):
    __tablename__ = "prepopulation_sources"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    identifier_type = Column(String)  # "household_id", "phone", etc.
    identifier_value = Column(String)
    known_fields = Column(JSONType)
    source = Column(String)
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class Response(Base):
    __tablename__ = "responses"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    survey_id = Column(String, nullable=False)
    enumerator_id = Column(String, nullable=False)
    household_id = Column(String)
    answers = Column(JSONType)
    paradata = Column(JSONType)
    consent_id = Column(String)
    status = Column(String, default="pending")
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    response_id = Column(String)
    household_id = Column(String)
    text_version = Column(String)
    scope = Column(JSONType)
    granted = Column(Boolean, default=False)
    granted_at = Column(String)
    method = Column(String)  # "verbal", "digital", "written"


class ValidationResult(Base):
    __tablename__ = "validation_results"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    response_id = Column(String, nullable=False)
    layer = Column(Integer)
    question_id = Column(String)
    status = Column(String)  # "pass", "fail", "warn"
    severity = Column(String)  # "low", "medium", "high", "critical"
    reason = Column(String)
    score = Column(Float, default=1.0)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class FraudSignal(Base):
    __tablename__ = "fraud_signals"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    response_id = Column(String, nullable=False)
    signal_type = Column(String)
    value = Column(Float)
    threshold = Column(Float)
    triggered = Column(Boolean, default=False)
    weight = Column(Float)
    reason = Column(String)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class CodingResult(Base):
    __tablename__ = "coding_results"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    response_id = Column(String, nullable=False)
    question_id = Column(String)
    raw_text = Column(String)
    system = Column(String)  # "NCO" or "NIC"
    suggested_code = Column(String)
    code_label = Column(String)
    confidence = Column(Float)
    reason = Column(String)
    alternatives = Column(JSONType)
    status = Column(String, default="auto")  # "auto", "confirmed", "corrected", "review"
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class ConfidenceScore(Base):
    __tablename__ = "confidence_scores"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    response_id = Column(String, nullable=False)
    score = Column(Float)
    breakdown = Column(JSONType)
    action = Column(String)  # "approve", "review", "reinterview"
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class SupervisorAction(Base):
    __tablename__ = "supervisor_actions"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    response_id = Column(String, nullable=False)
    supervisor_id = Column(String)
    action_type = Column(String)  # "approve", "reject", "reinterview", "correct-code", "comment"
    note = Column(String)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
