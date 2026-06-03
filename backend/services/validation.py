from typing import List, Dict, Any
from datetime import datetime
from models import ValidationResult, Survey


class ValidationPipeline:
    """Five-layer validation pipeline."""

    def validate(self, answers: Dict[str, Any], survey: Survey, db) -> List[ValidationResult]:
        results = []
        results += self._layer1_type(answers, survey)
        results += self._layer2_cross_field(answers)
        results += self._layer3_outlier(answers)
        results += self._layer4_consistency(answers)
        results += self._layer5_historical(answers)
        return results

    def _make_result(self, layer: int, question_id: str, status: str,
                     severity: str, reason: str, score: float = None) -> ValidationResult:
        if score is None:
            score = 1.0 if status == "pass" else (0.5 if status == "warn" else 0.0)
        return ValidationResult(
            layer=layer,
            question_id=question_id,
            status=status,
            severity=severity,
            reason=reason,
            score=score,
            created_at=datetime.utcnow().isoformat(),
        )

    # ──────────────────────────────────────────────────────────────────────
    # Layer 1: Type / required-field checks
    # ──────────────────────────────────────────────────────────────────────
    def _layer1_type(self, answers: Dict, survey: Survey) -> List[ValidationResult]:
        results = []
        required_fields = ["name", "age", "gender", "employment_status"]

        for field in required_fields:
            value = answers.get(field)
            if value is None or (isinstance(value, str) and not value.strip()):
                results.append(self._make_result(
                    layer=1,
                    question_id=field,
                    status="fail",
                    severity="high",
                    reason=f"Required field '{field}' is missing or empty",
                    score=0.0,
                ))
            else:
                results.append(self._make_result(
                    layer=1,
                    question_id=field,
                    status="pass",
                    severity="low",
                    reason=f"Field '{field}' present",
                    score=1.0,
                ))

        # Age must be a valid integer in [1, 120]
        age_raw = answers.get("age")
        if age_raw is not None:
            try:
                age = int(age_raw)
                if not (1 <= age <= 120):
                    results.append(self._make_result(
                        layer=1,
                        question_id="age",
                        status="fail",
                        severity="high",
                        reason=f"Age {age} is outside valid range [1, 120]",
                        score=0.0,
                    ))
            except (ValueError, TypeError):
                results.append(self._make_result(
                    layer=1,
                    question_id="age",
                    status="fail",
                    severity="high",
                    reason=f"Age value '{age_raw}' is not a valid number",
                    score=0.0,
                ))

        # Monthly income must be non-negative if provided
        income_raw = answers.get("monthly_income")
        if income_raw is not None:
            try:
                income = float(income_raw)
                if income < 0:
                    results.append(self._make_result(
                        layer=1,
                        question_id="monthly_income",
                        status="fail",
                        severity="medium",
                        reason=f"Monthly income cannot be negative ({income:,.0f})",
                        score=0.0,
                    ))
            except (ValueError, TypeError):
                results.append(self._make_result(
                    layer=1,
                    question_id="monthly_income",
                    status="fail",
                    severity="medium",
                    reason=f"Monthly income '{income_raw}' is not a valid number",
                    score=0.0,
                ))

        return results

    # ──────────────────────────────────────────────────────────────────────
    # Layer 2: Cross-field logic (flagship wow moment)
    # ──────────────────────────────────────────────────────────────────────
    def _layer2_cross_field(self, answers: Dict) -> List[ValidationResult]:
        results = []
        employment_status = str(answers.get("employment_status", "")).strip().lower()
        age_raw = answers.get("age")
        household_size_raw = answers.get("household_size")
        income_raw = answers.get("monthly_income")

        age = None
        if age_raw is not None:
            try:
                age = int(age_raw)
            except (ValueError, TypeError):
                pass

        income = None
        if income_raw is not None:
            try:
                income = float(income_raw)
            except (ValueError, TypeError):
                pass

        household_size = None
        if household_size_raw is not None:
            try:
                household_size = int(household_size_raw)
            except (ValueError, TypeError):
                pass

        # Rule: Unemployed + very high income → FAIL
        if employment_status == "unemployed" and income is not None and income > 50000:
            results.append(self._make_result(
                layer=2,
                question_id="monthly_income",
                status="fail",
                severity="high",
                reason=f"Income ₹{income:,.0f} contradicts status 'Unemployed' — flagged for review",
                score=0.0,
            ))
        # Rule: Unemployed + moderate-high income → WARN
        elif employment_status == "unemployed" and income is not None and income > 10000:
            results.append(self._make_result(
                layer=2,
                question_id="monthly_income",
                status="warn",
                severity="medium",
                reason=f"High income (₹{income:,.0f}) reported for unemployed respondent",
                score=0.4,
            ))
        elif employment_status and income is not None:
            results.append(self._make_result(
                layer=2,
                question_id="monthly_income",
                status="pass",
                severity="low",
                reason="Income is consistent with employment status",
                score=1.0,
            ))

        # Rule: Under 18 + employed → WARN
        if age is not None and age < 18 and employment_status == "employed":
            results.append(self._make_result(
                layer=2,
                question_id="age",
                status="warn",
                severity="medium",
                reason=f"Employment status 'Employed' for respondent aged {age} — verify",
                score=0.3,
            ))

        # Rule: Age > 80 → WARN
        if age is not None and age > 80:
            results.append(self._make_result(
                layer=2,
                question_id="age",
                status="warn",
                severity="low",
                reason=f"Age {age} is unusually high — please verify",
                score=0.5,
            ))

        # Rule: Household size > 15 → WARN
        if household_size is not None and household_size > 15:
            results.append(self._make_result(
                layer=2,
                question_id="household_size",
                status="warn",
                severity="low",
                reason=f"Household size {household_size} is unusually large",
                score=0.5,
            ))

        # Pass result if no issues found for cross-field check
        if not results:
            results.append(self._make_result(
                layer=2,
                question_id="cross_field",
                status="pass",
                severity="low",
                reason="All cross-field checks passed",
                score=1.0,
            ))

        return results

    # ──────────────────────────────────────────────────────────────────────
    # Layer 3: Statistical outliers (TN employment survey reference)
    # ──────────────────────────────────────────────────────────────────────
    def _layer3_outlier(self, answers: Dict) -> List[ValidationResult]:
        results = []
        employment_status = str(answers.get("employment_status", "")).strip().lower()
        income_raw = answers.get("monthly_income")

        income = None
        if income_raw is not None:
            try:
                income = float(income_raw)
            except (ValueError, TypeError):
                pass

        if income is not None:
            # Above p95 for TN employment survey
            if income > 80000:
                results.append(self._make_result(
                    layer=3,
                    question_id="monthly_income",
                    status="warn",
                    severity="low",
                    reason=f"Income ₹{income:,.0f} exceeds p95 for TN employment survey (₹80,000)",
                    score=0.6,
                ))
            # Below p05 for employed
            elif income < 2000 and employment_status == "employed":
                results.append(self._make_result(
                    layer=3,
                    question_id="monthly_income",
                    status="warn",
                    severity="low",
                    reason=f"Income ₹{income:,.0f} below p05 for TN employed (₹2,000)",
                    score=0.6,
                ))
            else:
                results.append(self._make_result(
                    layer=3,
                    question_id="monthly_income",
                    status="pass",
                    severity="low",
                    reason="Income within expected statistical range",
                    score=1.0,
                ))
        else:
            results.append(self._make_result(
                layer=3,
                question_id="monthly_income",
                status="pass",
                severity="low",
                reason="No income value to check for outliers",
                score=1.0,
            ))

        return results

    # ──────────────────────────────────────────────────────────────────────
    # Layer 4: Internal consistency
    # ──────────────────────────────────────────────────────────────────────
    def _layer4_consistency(self, answers: Dict) -> List[ValidationResult]:
        results = []
        occupation = str(answers.get("occupation", "")).strip().lower()
        employment_status = str(answers.get("employment_status", "")).strip().lower()
        income_raw = answers.get("monthly_income")

        income = None
        if income_raw is not None:
            try:
                income = float(income_raw)
            except (ValueError, TypeError):
                pass

        # Student-like occupation codes (occupations starting with "2" or "3" in NCO
        # are professional/technical roles; we check if occupation text has student keywords)
        student_keywords = ["student", "studying", "school", "college", "university"]
        is_student_occupation = any(kw in occupation for kw in student_keywords)

        if is_student_occupation and income is not None and income > 30000:
            results.append(self._make_result(
                layer=4,
                question_id="occupation",
                status="warn",
                severity="medium",
                reason=f"Occupation suggests student but monthly income ₹{income:,.0f} is unusually high (>₹30,000)",
                score=0.4,
            ))

        # Employed but no occupation provided
        if employment_status in ("employed", "self-employed") and not answers.get("occupation"):
            results.append(self._make_result(
                layer=4,
                question_id="occupation",
                status="warn",
                severity="medium",
                reason=f"Employment status '{employment_status}' but no occupation provided",
                score=0.5,
            ))

        if not results:
            results.append(self._make_result(
                layer=4,
                question_id="consistency",
                status="pass",
                severity="low",
                reason="Internal consistency checks passed",
                score=1.0,
            ))

        return results

    # ──────────────────────────────────────────────────────────────────────
    # Layer 5: Historical baseline
    # ──────────────────────────────────────────────────────────────────────
    def _layer5_historical(self, answers: Dict) -> List[ValidationResult]:
        results = []
        # In a production system this would compare against historical averages.
        # For the MVP we flag patterns that deviate strongly from known baselines.
        state = str(answers.get("state", "")).strip()
        income_raw = answers.get("monthly_income")

        income = None
        if income_raw is not None:
            try:
                income = float(income_raw)
            except (ValueError, TypeError):
                pass

        if income is not None and income > 500000:
            results.append(self._make_result(
                layer=5,
                question_id="monthly_income",
                status="warn",
                severity="medium",
                reason=f"Monthly income ₹{income:,.0f} is far outside historical baseline for household surveys",
                score=0.3,
            ))
        else:
            results.append(self._make_result(
                layer=5,
                question_id="historical",
                status="pass",
                severity="low",
                reason="No historical baseline anomalies detected",
                score=1.0,
            ))

        return results


validation_pipeline = ValidationPipeline()
