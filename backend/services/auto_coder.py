import re
import string
from typing import List, Dict, Any


def _normalize(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    text = text.lower()
    text = re.sub(r"[^\w\sऀ-ॿ஀-௿]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


class AutoCoder:
    """Rules-first synonym matching for NCO/NIC classification."""

    def code_text(self, raw_text: str, system: str, db) -> Dict[str, Any]:
        """
        Map free text to a classification code.

        Returns:
            {
                suggested_code, code_label, confidence, reason,
                alternatives: [{code, label, confidence}],
                status: "auto" | "review"
            }
        """
        from models import ClassificationCode

        if not raw_text or not raw_text.strip():
            return {
                "suggested_code": None,
                "code_label": None,
                "confidence": 0.0,
                "reason": "Empty input text",
                "alternatives": [],
                "status": "review",
                "system": system,
            }

        normalized_input = _normalize(raw_text)

        # Load all codes for this system
        codes: List[ClassificationCode] = (
            db.query(ClassificationCode)
            .filter(ClassificationCode.system == system)
            .all()
        )

        if not codes:
            return {
                "suggested_code": None,
                "code_label": None,
                "confidence": 0.0,
                "reason": f"No {system} codes loaded in database",
                "alternatives": [],
                "status": "review",
                "system": system,
            }

        matches = []

        for code_obj in codes:
            synonyms = code_obj.synonyms or []
            best_score = 0.0
            best_reason = ""

            for synonym in synonyms:
                norm_syn = _normalize(str(synonym))
                if not norm_syn:
                    continue

                # Exact match → highest confidence
                if normalized_input == norm_syn:
                    score = 0.99
                    reason = f"Exact match with synonym '{synonym}'"
                    if score > best_score:
                        best_score = score
                        best_reason = reason
                    continue

                # Input contains entire synonym
                if norm_syn in normalized_input:
                    # Longer synonym = more specific = higher confidence
                    length_bonus = min(len(norm_syn) / 20.0, 0.10)
                    score = 0.88 + length_bonus
                    score = min(score, 0.97)
                    reason = f"Input contains synonym '{synonym}'"
                    if score > best_score:
                        best_score = score
                        best_reason = reason
                    continue

                # Synonym contains entire input
                if normalized_input in norm_syn and len(normalized_input) >= 3:
                    score = 0.82
                    reason = f"Synonym '{synonym}' contains input"
                    if score > best_score:
                        best_score = score
                        best_reason = reason
                    continue

                # Token-level partial match
                input_tokens = set(normalized_input.split())
                syn_tokens = set(norm_syn.split())
                common = input_tokens & syn_tokens
                if common and len(common) / max(len(input_tokens), len(syn_tokens)) >= 0.5:
                    ratio = len(common) / max(len(input_tokens), len(syn_tokens))
                    score = 0.70 + ratio * 0.15
                    reason = f"Partial token match ({', '.join(common)}) with synonym '{synonym}'"
                    if score > best_score:
                        best_score = score
                        best_reason = reason

            if best_score > 0.0:
                matches.append({
                    "code": code_obj.code,
                    "label": code_obj.label,
                    "confidence": round(best_score, 3),
                    "reason": best_reason,
                })

        if not matches:
            return {
                "suggested_code": None,
                "code_label": None,
                "confidence": 0.0,
                "reason": "No matching code found",
                "alternatives": [],
                "status": "review",
                "system": system,
            }

        # Sort by confidence descending
        matches.sort(key=lambda x: x["confidence"], reverse=True)
        top = matches[0]
        alternatives = [
            {"code": m["code"], "label": m["label"], "confidence": m["confidence"]}
            for m in matches[1:4]
        ]

        status = "auto" if top["confidence"] >= 0.80 else "review"

        return {
            "suggested_code": top["code"],
            "code_label": top["label"],
            "confidence": top["confidence"],
            "reason": top["reason"],
            "alternatives": alternatives,
            "status": status,
            "system": system,
        }


auto_coder = AutoCoder()
