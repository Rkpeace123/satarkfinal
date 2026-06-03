from typing import List, Tuple
from datetime import datetime
from models import FraudSignal, Response, ValidationResult


class FraudEngine:
    SIGNALS = {
        "speed": {"weight": 0.30, "threshold": 30},
        "straight_line": {"weight": 0.25},
        "cross_field": {"weight": 0.25},
        "gps_static": {"weight": 0.10},
        "device_change": {"weight": 0.10},
    }

    def analyze(
        self,
        response: Response,
        validation_results: List[ValidationResult],
        db,
    ) -> Tuple[float, List[FraudSignal]]:
        signals = []
        paradata = response.paradata or {}
        answers = response.answers or {}

        # ── Speed signal ──────────────────────────────────────────────────
        duration = paradata.get("duration_seconds", 120)
        question_count = len(answers)
        avg_per_q = duration / max(question_count, 1)
        speed_triggered = avg_per_q < 8

        signals.append(
            FraudSignal(
                signal_type="speed",
                value=round(avg_per_q, 2),
                threshold=8.0,
                triggered=speed_triggered,
                weight=0.30,
                reason=(
                    f"Avg {avg_per_q:.0f}s/question vs 30s threshold — "
                    f"{'suspicious speed' if speed_triggered else 'normal'}"
                ),
                created_at=datetime.utcnow().isoformat(),
            )
        )

        # ── Straight-line signal ──────────────────────────────────────────
        answer_values = [str(v) for v in answers.values() if v is not None]
        sl_count = 0
        straight_line = False
        if len(answer_values) >= 5:
            most_common = max(set(answer_values), key=answer_values.count)
            sl_count = answer_values.count(most_common)
            straight_line = sl_count >= 5 and sl_count / len(answer_values) > 0.6

        signals.append(
            FraudSignal(
                signal_type="straight_line",
                value=float(sl_count),
                threshold=5.0,
                triggered=straight_line,
                weight=0.25,
                reason=(
                    f"Same answer repeated {sl_count}x — "
                    f"{'straight-lining detected' if straight_line else 'varied responses'}"
                ),
                created_at=datetime.utcnow().isoformat(),
            )
        )

        # ── Cross-field signal (from validation failures) ─────────────────
        high_sev_failures = [
            v
            for v in validation_results
            if v.status == "fail" and v.severity in ("high", "critical")
        ]
        cross_triggered = len(high_sev_failures) > 0

        signals.append(
            FraudSignal(
                signal_type="cross_field",
                value=float(len(high_sev_failures)),
                threshold=1.0,
                triggered=cross_triggered,
                weight=0.25,
                reason=(
                    f"{len(high_sev_failures)} cross-field inconsistencies — "
                    f"{'suspicious' if cross_triggered else 'clean'}"
                ),
                created_at=datetime.utcnow().isoformat(),
            )
        )

        # ── GPS static signal (uses paradata hint) ────────────────────────
        gps_static = paradata.get("gps_static", False)
        signals.append(
            FraudSignal(
                signal_type="gps_static",
                value=1.0 if gps_static else 0.0,
                threshold=1.0,
                triggered=bool(gps_static),
                weight=0.10,
                reason=(
                    f"GPS {'static/unchanged across submissions' if gps_static else 'shows natural movement'}"
                ),
                created_at=datetime.utcnow().isoformat(),
            )
        )

        # ── Device change signal ──────────────────────────────────────────
        device_change = paradata.get("device_change", False)
        signals.append(
            FraudSignal(
                signal_type="device_change",
                value=1.0 if device_change else 0.0,
                threshold=1.0,
                triggered=bool(device_change),
                weight=0.10,
                reason=(
                    f"Device ID {'changed mid-survey' if device_change else 'consistent'}"
                ),
                created_at=datetime.utcnow().isoformat(),
            )
        )

        # ── Weighted fraud score ──────────────────────────────────────────
        total_weight = sum(s.weight for s in signals)
        triggered_weight = sum(s.weight for s in signals if s.triggered)
        fraud_score = (triggered_weight / total_weight) * 100 if total_weight > 0 else 0.0

        return round(fraud_score, 2), signals


fraud_engine = FraudEngine()
