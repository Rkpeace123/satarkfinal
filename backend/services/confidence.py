from typing import List, Dict, Any


class ConfidenceEngine:
    """Compute a composite confidence score from validation, fraud, coding and completeness."""

    def compute(
        self,
        validation_results: List,
        fraud_score: float,
        coding_results: List,
        paradata: Dict[str, Any],
    ) -> Dict[str, Any]:
        # ── Validation component (40 points) ─────────────────────────────
        total_v = len(validation_results)
        passed = len([v for v in validation_results if v.status == "pass"])
        val_component = (passed / max(total_v, 1)) * 40

        # ── Fraud component (35 points) ───────────────────────────────────
        fraud_component = (100 - fraud_score) * 0.35

        # ── Coding component (15 points) ──────────────────────────────────
        if coding_results:
            avg_coding = sum(c.confidence for c in coding_results) / len(coding_results)
        else:
            avg_coding = 1.0  # no coded fields — not penalised
        coding_component = avg_coding * 100 * 0.15

        # ── Completeness component (10 points) ───────────────────────────
        completeness = float(paradata.get("completeness", 1.0))
        completeness_component = completeness * 10

        total = val_component + fraud_component + coding_component + completeness_component

        # Cap to [0, 100]
        total = max(0.0, min(100.0, total))

        if total >= 80:
            action = "approve"
        elif total >= 50:
            action = "review"
        else:
            action = "reinterview"

        return {
            "score": round(total, 1),
            "breakdown": {
                "validation": round(val_component, 1),
                "fraud": round(fraud_component, 1),
                "coding": round(coding_component, 1),
                "completeness": round(completeness_component, 1),
            },
            "action": action,
        }


confidence_engine = ConfidenceEngine()
