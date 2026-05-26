"""
evaluation_core.py
──────────────────
Pure evaluation logic extracted from main.py.
Imported by both:
  - main.py  (single-paper /api/evaluate endpoint)
  - bulk_evaluation.py  (Celery worker for bulk jobs)

DO NOT change the logic here — it is the canonical evaluation engine.
"""

import os
import re
import json
from json import JSONDecodeError
from collections import defaultdict

import google.generativeai as genai

# ── Pricing constants (can be overridden via env) ─────────────────────────────
AI_TIMEOUT_SECONDS         = 180
AI_MAX_OUTPUT_TOKENS       = 30000
JSON_REPAIR_MAX_OUTPUT_TOKENS = 16000
GEMINI_MODEL               = "gemini-2.5-flash-lite"
GEMINI_INPUT_USD_PER_1M    = float(os.getenv("GEMINI_INPUT_USD_PER_1M",  "0.10"))
GEMINI_OUTPUT_USD_PER_1M   = float(os.getenv("GEMINI_OUTPUT_USD_PER_1M", "0.40"))
VISION_DOCUMENT_TEXT_USD_PER_1000 = float(os.getenv("VISION_DOCUMENT_TEXT_USD_PER_1000", "1.50"))
USD_TO_INR                 = float(os.getenv("USD_TO_INR", "84"))

NUMBER_WORDS = {
    "one": 1, "first": 1, "two": 2, "second": 2, "three": 3, "third": 3,
    "four": 4, "fourth": 4, "five": 5, "fifth": 5, "six": 6, "sixth": 6,
    "seven": 7, "seventh": 7, "eight": 8, "eighth": 8, "nine": 9, "ninth": 9,
    "ten": 10, "tenth": 10,
}


# ── JSON helpers ──────────────────────────────────────────────────────────────

def _clean_json(raw):
    text = re.sub(r"```(?:json)?\s*", "", raw)
    text = re.sub(r"```\s*", "", text)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    return match.group(0) if match else text.strip()


def _escape_invalid_json_backslashes(text):
    text = re.sub(r"\\u(?![0-9a-fA-F]{4})", r"\\\\u", text)
    return re.sub(r'\\(?!["\\/bfnrtu])', r"\\\\", text)


def _parse_json(raw):
    cleaned = _clean_json(raw)
    try:
        return json.loads(cleaned)
    except JSONDecodeError:
        pass
    repaired = cleaned
    repaired = repaired.replace("“", '"').replace("”", '"')
    repaired = repaired.replace("‘", "'").replace("’", "'")
    repaired = _escape_invalid_json_backslashes(repaired)
    repaired = re.sub(r",(\s*[}\]])", r"\1", repaired)
    repaired = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", repaired)
    return json.loads(repaired)


def _repair_json_with_gemini(model, malformed_json):
    repair_prompt = f"""
Repair this malformed JSON into valid JSON.

Rules:
- Return ONLY valid JSON.
- Preserve all fields and values as much as possible.
- Do not add markdown fences.
- If a string is cut off, close it safely.

MALFORMED JSON:
{malformed_json}
"""
    response = model.generate_content(
        repair_prompt,
        generation_config=genai.GenerationConfig(
            temperature=0,
            max_output_tokens=JSON_REPAIR_MAX_OUTPUT_TOKENS,
            response_mime_type="application/json",
        ),
        request_options={"timeout": 60},
    )
    return _parse_json(response.text)


# ── Grading helpers ───────────────────────────────────────────────────────────

def _grade(pct):
    if pct >= 90: return "A+"
    if pct >= 80: return "A"
    if pct >= 70: return "B"
    if pct >= 60: return "C"
    if pct >= 50: return "D"
    return "F"


def _leniency_instruction(v):
    if v <= 3:
        return f"LENIENCY {v}/10 — VERY STRICT. Penalise every missing concept. Competitive exam standard."
    elif v <= 6:
        return f"LENIENCY {v}/10 — MODERATE. Fair balanced grading, partial credit for partial understanding."
    else:
        return f"LENIENCY {v}/10 — LENIENT. Reward effort. Tolerate minor errors. Focus on what student got right."


def _normalize_answer_text(text):
    return re.sub(r"[^a-z0-9]+", "", str(text or "").lower())


def _ocr_suspicion(text):
    raw = str(text or "")
    if not raw.strip():
        return "No answer text detected by OCR."
    if "?" in raw or "�" in raw:
        return "OCR contains uncertain characters; verify this answer manually."
    spaced_letters = re.findall(r"(?:\b[A-Za-z]\s+){4,}[A-Za-z]\b", raw)
    if spaced_letters:
        return "OCR appears to have split handwriting into spaced letters; verify manually."
    return ""


def _to_number(value):
    value = str(value or "").strip().lower()
    if value in NUMBER_WORDS:
        return NUMBER_WORDS[value]
    try:
        return int(float(value))
    except ValueError:
        return None


# ── Attempt-any / OR-question logic ──────────────────────────────────────────

def _extract_attempt_any_rules(qp_text):
    text = re.sub(r"\s+", " ", str(qp_text or " "))
    rules = []
    number_words_pattern = "one|two|three|four|five|six|seven|eight|nine|ten|\\d+"
    choose_verb = (
        r"(?:attempt|answer|solve|do|write|complete)"
        r"\s+"
        r"(?:any|only|just)"
    )

    def latest_section_hint(context):
        matches = list(re.finditer(
            r"(part\s+[ivxlcdm]+|section\s+[a-z0-9]+)[^.;:|]*",
            context or "", re.IGNORECASE,
        ))
        return matches[-1].group(0).strip().lower() if matches else ""

    formula_pattern = re.compile(
        rf"(?P<context>.{{0,220}}?){choose_verb}\s+(?P<count>{number_words_pattern})"
        rf".{{0,140}}?(?P<per>\d+(?:\.\d+)?)\s*marks?\s*[x×]\s*(?P<count2>{number_words_pattern})"
        r".{0,40}?=\s*(?P<total>\d+(?:\.\d+)?)\s*marks?",
        re.IGNORECASE,
    )
    for match in formula_pattern.finditer(text):
        count  = _to_number(match.group("count"))
        count2 = _to_number(match.group("count2"))
        per    = float(match.group("per"))
        total  = float(match.group("total"))
        if not count:
            continue
        context = match.group("context") or ""
        section_hint = latest_section_hint(context)
        rules.append({"count": count, "count2": count2 or count, "per_marks": per,
                       "total_marks": total, "section_hint": section_hint})

    simple_pattern = re.compile(
        rf"(?P<context>.{{0,220}}?){choose_verb}\s+(?P<count>{number_words_pattern})"
        rf"(?:\s+(?:out\s+of|from)\s+(?:{number_words_pattern})?)?"
        r"(?:[^.]{0,80}?(?P<per>\d+(?:\.\d+)?)\s*marks?\s*each)?",
        re.IGNORECASE,
    )
    formula_spans = [(m.start(), m.end()) for m in formula_pattern.finditer(text)]
    for match in simple_pattern.finditer(text):
        if any(start <= match.start() < end for start, end in formula_spans):
            continue
        count = _to_number(match.group("count"))
        if not count:
            continue
        per_raw = match.group("per")
        per = float(per_raw) if per_raw else None
        context = match.group("context") or ""
        section_hint = latest_section_hint(context)
        rules.append({"count": count, "count2": count, "per_marks": per,
                       "total_marks": (per * count) if per else None,
                       "section_hint": section_hint})
    return rules


def _section_key(value):
    text = str(value or "").lower()
    text = re.sub(r"\b(section|part)\b", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text).strip()
    as_number = _to_number(text)
    if as_number is not None:
        return str(as_number)
    roman = {"i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5"}
    return roman.get(text, text)


def _extract_part_mark_totals(qp_text):
    text = re.sub(r"\s+", " ", str(qp_text or " "))
    totals = {}
    patterns = [
        r"(?P<label>first|second|third|fourth|fifth|\d+)(?:\s+part|part).*?(?:contains|contain|carries|carry)\s+(?P<marks>\d+(?:\.\d+)?)\s*marks?",
        r"part\s+(?P<label>i{1,3}|iv|v|\d+)\s*\([^)]*?(?P<marks>\d+(?:\.\d+)?)\s*marks?",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            key = _section_key(match.group("label"))
            try:
                marks = float(match.group("marks"))
            except ValueError:
                continue
            if key and marks > 0:
                totals[key] = marks
    return totals


def _rule_section_key(rule):
    hint = str(rule.get("section_hint", ""))
    matches = list(re.finditer(r"(?:part|section)\s+([ivxlcdm]+|\d+|first|second|third|fourth|fifth)", hint, re.IGNORECASE))
    return _section_key(matches[-1].group(1)) if matches else ""


def _question_section_key(question):
    fields = [question.get("section_name", ""), question.get("question_text", ""), question.get("marks_breakdown", "")]
    for field in fields:
        match = re.search(r"(?:part|section)\s+([ivxlcdm]+|\d+|first|second|third|fourth|fifth)", str(field), re.IGNORECASE)
        if match:
            return _section_key(match.group(1))
    return ""


def _extract_declared_total_marks(qp_text):
    text = re.sub(r"\s+", " ", str(qp_text or " "))
    patterns = [
        r"(?:total|maximum|max\.?|m\.m\.?)\s*(?:marks?)?\s*[:=\-]\s*(?P<marks>\d+(?:\.\d+)?)",
        r"(?:total|maximum|max\.?)\s+(?P<marks>\d+(?:\.\d+)?)\s*marks?",
        r"(?P<marks>\d+(?:\.\d+)?)\s*marks?\s*(?:total|maximum|max\.?)",
    ]
    values = []
    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            try:
                value = float(match.group("marks"))
            except ValueError:
                continue
            if value > 0:
                values.append(value)
    formula_total = 0.0
    formula_pattern = re.compile(
        r"(?P<left>\d+(?:\.\d+)?)\s*marks?\s*[x×]\s*(?P<right>\d+(?:\.\d+)?)"
        r".{0,40}?=\s*(?P<total>\d+(?:\.\d+)?)\s*marks?", re.IGNORECASE,
    )
    for match in formula_pattern.finditer(text):
        try:
            total = float(match.group("total"))
        except ValueError:
            continue
        if total > 0:
            formula_total += total
    if formula_total > 0:
        values.append(formula_total)
    return max(values) if values else 0.0


def _matches_attempt_rule(question, rule):
    max_marks = float(question.get("max_marks", 0) or 0)
    per = rule.get("per_marks")
    rule_key = _rule_section_key(rule)
    question_key = _question_section_key(question)
    if rule_key and question_key and rule_key != question_key:
        return False
    hint = rule.get("section_hint", "")
    section = str(question.get("section_name", "")).lower()
    if rule_key and not question_key and hint and section and not (hint in section or section in hint):
        return False
    if per is None:
        if not hint:
            return True
        return hint in section or section in hint
    if abs(max_marks - per) > 0.25:
        return bool(rule_key and question_key == rule_key)
    return True


def _deduplicate_or_questions(questions):
    for i in range(1, len(questions)):
        qt = str(questions[i].get("question_text") or "").strip()
        if re.match(r"^or\b", qt, re.IGNORECASE):
            prev = questions[i - 1]
            curr = questions[i]
            prev_awarded = float(prev.get("marks_awarded", 0) or 0)
            curr_awarded = float(curr.get("marks_awarded", 0) or 0)
            if not prev.get("excluded_from_total") and not curr.get("excluded_from_total"):
                if curr_awarded >= prev_awarded:
                    prev["excluded_from_total"] = True
                    prev["selection_note"] = "OR alternative — student attempted the other option."
                else:
                    curr["excluded_from_total"] = True
                    curr["selection_note"] = "OR alternative — student attempted the other option."
    groups = defaultdict(list)
    for idx, q in enumerate(questions):
        qno = str(q.get("question_no") or "").strip().lower()
        key = re.sub(r"\s+", "", qno)
        if key:
            groups[key].append((idx, q))
    for qno, group in groups.items():
        if len(group) <= 1:
            continue
        marks_vals = [float(q.get("max_marks", 0) or 0) for _, q in group]
        if len(set(marks_vals)) != 1:
            continue
        best = max(range(len(group)), key=lambda i: float(group[i][1].get("marks_awarded", 0) or 0))
        for i, (idx, q) in enumerate(group):
            if i != best and not q.get("excluded_from_total"):
                q["excluded_from_total"] = True
                q["selection_note"] = f"OR alternative for Q{qno} — only the attempted answer counts toward total."
    return questions


def _apply_attempt_any_caps(questions, qp_text):
    total_max = 0.0
    total_awarded = 0.0
    used = set()
    applied_any_rule = False
    part_totals = _extract_part_mark_totals(qp_text)

    for rule in _extract_attempt_any_rules(qp_text):
        candidates = [
            (idx, q) for idx, q in enumerate(questions)
            if idx not in used and _matches_attempt_rule(q, rule) and not q.get("excluded_from_total")
        ]
        if len(candidates) < rule["count"] and rule.get("section_hint"):
            rule_key = _rule_section_key(rule)
            if rule_key:
                candidates = [
                    (idx, q) for idx, q in enumerate(questions)
                    if idx not in used and not q.get("excluded_from_total")
                    and _question_section_key(q) == rule_key
                ]
        if len(candidates) < rule["count"] and rule.get("section_hint"):
            candidates = [
                (idx, q) for idx, q in enumerate(questions)
                if idx not in used and not q.get("excluded_from_total")
                and (not _rule_section_key(rule) or _question_section_key(q) == _rule_section_key(rule))
                and (rule.get("per_marks") is None or abs(float(q.get("max_marks", 0) or 0) - rule["per_marks"]) <= 0.25)
            ]
        if len(candidates) < rule["count"]:
            continue
        applied_any_rule = True
        selected = sorted(candidates, key=lambda item: float(item[1].get("marks_awarded", 0) or 0), reverse=True)[: rule["count"]]
        for idx, _ in candidates:
            used.add(idx)
        rule_per = rule.get("per_marks") or (float(selected[0][1].get("max_marks", 0)) if selected else 0)
        section_total = part_totals.get(_rule_section_key(rule), 0)
        rule_total = section_total or rule.get("total_marks") or (rule["count"] * rule_per)
        total_max += rule_total
        total_awarded += min(rule_total, sum(float(q.get("marks_awarded", 0) or 0) for _, q in selected))
        selected_indexes = {selected_idx for selected_idx, _ in selected}
        for idx, q in candidates:
            if idx not in selected_indexes:
                q["excluded_from_total"] = True
                q["selection_note"] = (
                    f"Excluded from total: optional section asks to attempt any {rule['count']}; "
                    "this extra question was evaluated for feedback only."
                )

    for idx, q in enumerate(questions):
        if idx in used:
            continue
        if q.get("excluded_from_total"):
            continue
        total_max     += float(q.get("max_marks",     0) or 0)
        total_awarded += float(q.get("marks_awarded", 0) or 0)

    return round(total_awarded, 1), round(total_max, 1), applied_any_rule


# ── Cost builder ──────────────────────────────────────────────────────────────

def _build_cost(usage, ocr_units):
    input_tokens  = int(usage.get("input_tokens")  or 0)
    output_tokens = int(usage.get("output_tokens") or 0)
    total_tokens  = int(usage.get("total_tokens")  or input_tokens + output_tokens)

    gemini_input_usd  = (input_tokens  / 1_000_000) * GEMINI_INPUT_USD_PER_1M
    gemini_output_usd = (output_tokens / 1_000_000) * GEMINI_OUTPUT_USD_PER_1M
    gemini_total_usd  = gemini_input_usd + gemini_output_usd
    vision_total_usd  = (ocr_units / 1000) * VISION_DOCUMENT_TEXT_USD_PER_1000
    total_usd         = gemini_total_usd + vision_total_usd

    return {
        "currency": "USD",
        "usd_to_inr": USD_TO_INR,
        "total_usd": round(total_usd, 8),
        "total_inr": round(total_usd * USD_TO_INR, 6),
        "google_vision": {
            "feature": "DOCUMENT_TEXT_DETECTION",
            "units": ocr_units,
            "price_per_1000_units_usd": VISION_DOCUMENT_TEXT_USD_PER_1000,
            "cost_usd": round(vision_total_usd, 8),
            "cost_inr": round(vision_total_usd * USD_TO_INR, 6),
        },
        "gemini": {
            "model": GEMINI_MODEL,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "input_price_per_1m_tokens_usd": GEMINI_INPUT_USD_PER_1M,
            "output_price_per_1m_tokens_usd": GEMINI_OUTPUT_USD_PER_1M,
            "input_cost_usd": round(gemini_input_usd, 8),
            "output_cost_usd": round(gemini_output_usd, 8),
            "cost_usd": round(gemini_total_usd, 8),
            "cost_inr": round(gemini_total_usd * USD_TO_INR, 6),
        },
    }


# ── Prompt builder ────────────────────────────────────────────────────────────

def _build_prompt(qp_text, as_text, leniency, ms=""):
    if ms.strip():
        ms_block = f'MARKING SCHEME:\n"""\n{ms}\n"""\n'
    else:
        ms_block = "MARKING SCHEME: Not provided. Use your own knowledge.\n"

    return f"""
You are an AI exam evaluator.

{_leniency_instruction(leniency)}

{ms_block}

QUESTION PAPER:
\"\"\"
{qp_text}
\"\"\"

ANSWER SHEET:
\"\"\"
{as_text}
\"\"\"

Evaluate each question carefully.

Important grading rules:
- First read the ENTIRE question paper and identify ALL sections, passages, groups, questions, and subquestions.
- Do not evaluate only Section 1. If the paper has Section A/B/C or multiple passages, evaluate every section.
- Preserve the section name/title for every question in section_name.
- Extract max marks from the question paper exactly. Use section-wise marking instructions, per-question marks, or subsection marks.
- If a section says "Answer any N", the section total_max_marks must be capped to N × per-question marks. Do not add every listed option to the denominator.
- For "Answer any N" sections, evaluate all detected attempted answers for feedback, but calculate the exam total using only the required N attempts.
- CRITICAL — OR questions: when two questions are alternatives (the paper shows "Q3 OR Q3B", or the word OR appears between questions), they share one slot in the total marks. Only evaluate the question the student actually attempted. Set max_marks for the unattempted OR alternative to 0 or omit it. Never add both OR alternatives to the denominator.
- If you cannot tell which OR alternative was attempted, pick the one the student wrote more content for.
- If a question has subparts, keep each meaningful subpart as its own question entry unless the question paper explicitly gives one combined mark.
- The correct_answer must come from the question paper, marking scheme, or your academic knowledge.
- Never copy the student's answer into correct_answer unless it is genuinely the expected answer.
- If OCR text looks uncertain, mention that in ocr_warning and reduce confidence.
- For student_answer, transcribe what the student wrote, but clean obvious OCR artifacts: join wrongly spaced letters, fix clearly broken near-words, remove repeated junk symbols, and keep the student's original meaning. Do not upgrade a wrong answer into a correct one.
- For MCQ-style questions, infer the correct option from the question/options, not from the student's selected answer.
- If the student's answer is wrong, marks_awarded must reflect that even if the answer text is OCR-noisy.
- Be detailed and teacher-like. For every question, break down the expected answer into key points.
- Compare the student's exact answer against those points.
- Explicitly list what was present, what was wrong/weak, and what was missing.
- feedback must explain why the marks were awarded, not just say "Correct" or "Incorrect".

Return ONLY valid JSON in this exact format:

{{
  "total_max_marks": <number>,
  "overall_feedback": "<2-3 sentences>",
  "questions": [
    {{
      "section_name": "<section title/name, e.g. Section A - Reading>",
      "question_no": "1",
      "question_text": "<question>",
      "student_answer": "<answer>",
      "correct_answer": "<ideal answer or marking-scheme answer>",
      "marks_breakdown": "<how marks were assigned from the question paper>",
      "concepts_tested": ["<concept 1>", "<concept 2>"],
      "expected_key_points": ["<point required for full marks>"],
      "matched_points": ["<point student included correctly>"],
      "incorrect_points": ["<point student wrote that is wrong or irrelevant>"],
      "marking_rationale": "<short explanation of mark allocation>",
      "ocr_warning": "<blank if OCR is clear, otherwise a short warning>",
      "marks_awarded": <number>,
      "max_marks": <number>,
      "feedback": "<specific feedback>",
      "strengths": [],
      "weaknesses": [],
      "missing_points": [],
      "confidence": <0.0-1.0>
    }}
  ]
}}

Return ONLY JSON.
"""


# ── Main evaluation function ──────────────────────────────────────────────────

def run_evaluation(qp_text, as_text, leniency, ms=""):
    """
    Core evaluation function. Accepts OCR-extracted text and returns
    a structured evaluation result dict.

    Used by:
      - /api/evaluate  (single-paper endpoint in main.py)
      - process_bulk_job  (Celery task in bulk_evaluation.py)
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise Exception("Missing GEMINI_API_KEY in .env")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(GEMINI_MODEL)
    prompt = _build_prompt(qp_text, as_text, leniency, ms)

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.2,
            max_output_tokens=AI_MAX_OUTPUT_TOKENS,
            response_mime_type="application/json",
        ),
        request_options={"timeout": AI_TIMEOUT_SECONDS},
    )

    usage = {}
    try:
        if hasattr(response, 'usage_metadata'):
            um = response.usage_metadata
            usage = {
                "input_tokens":  getattr(um, 'prompt_token_count',     0),
                "output_tokens": getattr(um, 'candidates_token_count', 0),
                "total_tokens":  getattr(um, 'total_token_count',      0),
            }
    except Exception:
        pass

    cleaned = _clean_json(response.text)
    try:
        result = _parse_json(cleaned)
    except JSONDecodeError:
        result = _repair_json_with_gemini(model, cleaned)

    questions = result.get("questions", [])

    for q in questions:
        max_m = float(q.get("max_marks", 0))
        q["marks_awarded"] = round(max(0.0, min(max_m, float(q.get("marks_awarded", 0)))), 1)
        q["max_marks"]     = round(max_m, 1)
        q["confidence"]    = round(max(0.0, min(1.0, float(q.get("confidence", 0.7)))), 2)
        for key in ("strengths", "weaknesses", "missing_points", "concepts_tested",
                    "expected_key_points", "matched_points", "incorrect_points"):
            if not isinstance(q.get(key), list):
                q[key] = []
        q["correct_answer"]    = str(q.get("correct_answer", ""))
        q["section_name"]      = str(q.get("section_name", "General"))
        q["marks_breakdown"]   = str(q.get("marks_breakdown", ""))
        q["marking_rationale"] = str(q.get("marking_rationale", ""))
        q["ocr_warning"]       = str(q.get("ocr_warning", "") or _ocr_suspicion(q.get("student_answer", "")))

        answer_norm  = _normalize_answer_text(q.get("student_answer", ""))
        correct_norm = _normalize_answer_text(q.get("correct_answer", ""))
        if (answer_norm and correct_norm and answer_norm == correct_norm
                and q["marks_awarded"] >= q["max_marks"] and not q.get("strengths")):
            q["ocr_warning"] = (
                q["ocr_warning"]
                or "Student answer and expected answer are identical in model output; verify manually."
            )
            q["confidence"] = min(q["confidence"], 0.55)

    questions = _deduplicate_or_questions(questions)
    capped_awarded, capped_max, applied_attempt_cap = _apply_attempt_any_caps(questions, qp_text)
    declared_total = round(_extract_declared_total_marks(qp_text), 1)

    if applied_attempt_cap and capped_max > 0:
        total_awarded = capped_awarded
        total_max     = capped_max
        if declared_total > 0 and declared_total < total_max:
            if total_max > 0:
                total_awarded = round(total_awarded * (declared_total / total_max), 1)
            total_max = declared_total
    else:
        active_questions = [q for q in questions if not q.get("excluded_from_total")]
        total_awarded    = round(sum(float(q.get("marks_awarded", 0) or 0) for q in active_questions), 1)
        summed_max       = round(sum(float(q.get("max_marks",     0) or 0) for q in active_questions), 1)
        total_max        = round(float(result.get("total_max_marks", summed_max)), 1)
        if declared_total > 0 and declared_total <= summed_max:
            total_max = declared_total
        elif total_max <= 0:
            total_max = summed_max

    percentage = round((total_awarded / total_max * 100) if total_max > 0 else 0, 1)

    return {
        "leniency":             leniency,
        "total_marks_awarded":  total_awarded,
        "total_max_marks":      total_max,
        "percentage":           percentage,
        "grade":                _grade(percentage),
        "overall_feedback":     str(result.get("overall_feedback", "")),
        "questions":            questions,
        "marking_scheme_used":  bool(ms.strip()),
        "usage":                usage,
    }


# Keep old name as alias so main.py import doesn't need to change
_run_evaluation = run_evaluation


# ──────────────────────────────────────────────────────────────────────────────
# OCR self-correction using Gemini Vision
# ──────────────────────────────────────────────────────────────────────────────
# Google Vision sometimes mis-reads handwriting ("pwd" → "pwo",
# "kernel" → "kemel"). We send the original image + OCR text to Gemini and
# ask it to cross-check, returning a corrected version + a list of changes
# that the frontend can display in a "Gemini Corrections" tab.
# Falls back to original OCR on any error — never breaks evaluation.
# ──────────────────────────────────────────────────────────────────────────────

def _correct_ocr_with_vision(image_bytes: bytes, mime_type: str, ocr_text: str, label: str = "answer sheet"):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not ocr_text.strip():
        return {"corrected_text": ocr_text, "corrections": [], "confidence": 0.0, "usage": {}}

    # PDFs can't be sent as inline image data to Gemini in this code path;
    # only run vision-correction on image MIME types.
    if not mime_type.startswith("image/"):
        return {"corrected_text": ocr_text, "corrections": [], "confidence": 0.0, "usage": {}, "skipped": "non-image"}

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(GEMINI_MODEL)
        prompt = f"""You are an OCR proofreader. Google Vision OCR extracted the text below from a {label} image, but it may contain mis-read characters, joined words, or split words from messy handwriting.
Look at the image carefully and compare it to the OCR text. Return a corrected version of the text matching what is ACTUALLY written on the page.
CRITICAL RULES:
- Only fix what you can verify from the image. If unsure, keep the OCR text as-is.
- DO NOT improve the student's answer. Spelling/grammar mistakes by the student must stay exactly as the student wrote them.
- DO NOT add any content that is not in the image.
- For truly illegible handwriting, keep the OCR text and note actual="[illegible]" in corrections.
- Preserve line breaks and overall structure.
OCR TEXT TO REVIEW:
\"\"\"
{ocr_text}
\"\"\"
Return ONLY this JSON (no markdown, no extra text):
{{
  "corrected_text": "<the corrected full text>",
  "corrections": [
    {{"ocr": "<what OCR read>", "actual": "<what is actually written>", "context": "<short surrounding phrase>"}}
  ],
  "confidence": <0.0 to 1.0>
}}
If OCR is already accurate:
{{"corrected_text": "<same text>", "corrections": [], "confidence": 0.95}}
"""
        response = model.generate_content(
            [
                {"mime_type": mime_type, "data": image_bytes},
                prompt,
            ],
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                max_output_tokens=AI_MAX_OUTPUT_TOKENS,
                response_mime_type="application/json",
            ),
            request_options={"timeout": AI_TIMEOUT_SECONDS},
        )

        usage = {}
        try:
            if hasattr(response, "usage_metadata"):
                um = response.usage_metadata
                usage = {
                    "input_tokens":  getattr(um, "prompt_token_count",     0),
                    "output_tokens": getattr(um, "candidates_token_count", 0),
                    "total_tokens":  getattr(um, "total_token_count",      0),
                }
        except Exception:
            pass

        cleaned = _clean_json(response.text)
        try:
            data = _parse_json(cleaned)
        except JSONDecodeError:
            data = _repair_json_with_gemini(model, cleaned)

        corrected = str(data.get("corrected_text", "") or "").strip() or ocr_text
        corrections_raw = data.get("corrections", []) or []
        confidence = float(data.get("confidence", 0.7) or 0.7)

        # Filter trivial / whitespace-only / duplicate corrections
        meaningful = []
        seen = set()
        for c in corrections_raw:
            ocr_w    = str(c.get("ocr",    "") or "").strip()
            actual_w = str(c.get("actual", "") or "").strip()
            if not ocr_w or not actual_w:
                continue
            if ocr_w.lower() == actual_w.lower():
                continue
            key = (ocr_w.lower(), actual_w.lower())
            if key in seen:
                continue
            seen.add(key)
            meaningful.append({
                "ocr":     ocr_w,
                "actual":  actual_w,
                "context": str(c.get("context", "") or "").strip()[:160],
            })

        return {
            "corrected_text": corrected,
            "corrections":    meaningful,
            "confidence":     max(0.0, min(1.0, confidence)),
            "usage":          usage,
        }

    except Exception as e:
        print(f"⚠ OCR correction skipped ({label}): {e}")
        return {
            "corrected_text": ocr_text,
            "corrections":    [],
            "confidence":     0.0,
            "usage":          {},
            "error":          str(e),
        }


def _attach_corrections_to_questions(questions, corrections):
    """
    For each question, find which OCR corrections fall inside its student_answer
    so the UI can show 'OCR read X, Gemini corrected to Y' per question.
    """
    if not corrections:
        return
    for q in questions:
        ans = str(q.get("student_answer", "") or "")
        if not ans:
            continue
        q_corrections = []
        ans_lower = ans.lower()
        for c in corrections:
            ocr_token = c.get("ocr", "").lower()
            context   = c.get("context", "").lower()
            if (ocr_token and ocr_token in ans_lower) or (context and context[:40] and context[:40] in ans_lower):
                q_corrections.append(c)
        if q_corrections:
            q["ocr_corrections"] = q_corrections
