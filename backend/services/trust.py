from uuid import uuid4
from datetime import datetime
from models import EnumeratorProfile, TrustHistory


class TrustAggregator:
    """Exponential Moving Average trust scoring for enumerators."""

    def update(
        self,
        enumerator_id: str,
        confidence_score: float,
        fraud_score: float,
        db,
    ) -> float:
        enumerator = db.get(EnumeratorProfile, enumerator_id)
        if not enumerator:
            return 0.0

        old_trust = enumerator.trust_score

        # EMA: new = old * 0.85 + current_quality * 0.15
        current_quality = confidence_score  # 0-100
        new_trust = old_trust * 0.85 + current_quality * 0.15

        # Immediate deduction for high fraud
        if fraud_score > 50:
            new_trust -= 5

        new_trust = max(0.0, min(100.0, new_trust))
        delta = round(new_trust - old_trust, 2)

        enumerator.trust_score = round(new_trust, 1)

        # Record history
        history = TrustHistory(
            id=str(uuid4()),
            enumerator_id=enumerator_id,
            trust_score=round(new_trust, 1),
            delta=delta,
            reason=(
                f"Response processed: confidence={confidence_score:.0f}, "
                f"fraud={fraud_score:.0f}"
            ),
            created_at=datetime.utcnow().isoformat(),
        )
        db.add(history)
        db.commit()

        return round(new_trust, 1)


trust_aggregator = TrustAggregator()
