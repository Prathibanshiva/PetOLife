"""Gemini AI Health Signals service."""

import json
import os
import re
from typing import Any

import urllib.request
import urllib.error


ALLOWED_SIGNAL_TYPES = {"event", "change", "pattern", "attention"}

SYSTEM_PROMPT = """You are an AI assistant helping veterinarians and pet owners understand a pet's health history.

STRICT RULES — you must follow these exactly:
- Do NOT diagnose any disease or medical condition.
- Do NOT claim certainty about any health issue.
- Do NOT prescribe or recommend specific treatments or medications.
- Do NOT replace or simulate a veterinarian's judgment.
- Use ONLY the information present in the supplied health records.
- Clearly distinguish observations from conclusions.
- For 'attention' signals, phrase them as observations and suggest checking with a veterinarian.
- NEVER invent medical history, measurements, or dates not present in the records.
- NEVER fabricate a source_record_id — only use IDs from the provided records.
- Use calm, reassuring language appropriate for a pet health context.

GOOD example: "The records show a gradual increase in body weight over the last three visits. This pattern may be worth discussing with a veterinarian."
BAD example: "This pet has obesity and kidney disease."

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown, no explanation:
{
  "signals": [
    {
      "type": "event",
      "text": "...",
      "source_record_ids": [1, 2]
    }
  ]
}

Signal types:
- "event": A notable single occurrence (e.g., first recorded vaccination, recent vet visit)
- "change": Something that changed over time compared to earlier records
- "pattern": A recurring observation across multiple records
- "attention": An observation that may be worth discussing with a veterinarian

Generate between 2 and 6 signals. Only include signal types that are genuinely supported by the records. Do not pad with empty or generic signals."""


def build_records_context(pet: dict, records: list[dict]) -> str:
    """Build a structured text summary of the pet's health history."""
    lines = [
        f"Pet: {pet.get('name', 'Unknown')}",
        f"Species: {pet.get('species', 'Unknown')}",
        f"Breed: {pet.get('breed') or 'Not specified'}",
        f"Date of birth: {pet.get('date_of_birth') or 'Unknown'}",
        "",
        f"Total health records: {len(records)}",
        "",
        "--- Health Records (chronological order, oldest first) ---",
    ]

    for r in sorted(records, key=lambda x: str(x.get("record_date", ""))):
        record_id = r.get("id")
        rtype = r.get("record_type", "unknown")
        rdate = r.get("record_date", "unknown date")
        lines.append(f"\n[Record ID {record_id}] Type: {rtype} | Date: {rdate}")

        if r.get("title"):
            lines.append(f"  Title: {r['title']}")
        if r.get("weight_kg"):
            lines.append(f"  Weight: {r['weight_kg']} kg")
        if r.get("temperature_c"):
            lines.append(f"  Temperature: {r['temperature_c']}°C")
        if r.get("vaccine_name"):
            lines.append(f"  Vaccine: {r['vaccine_name']}")
        if r.get("next_due_date"):
            lines.append(f"  Next due: {r['next_due_date']}")
        if r.get("medication_name"):
            med = r["medication_name"]
            if r.get("dosage"):
                med += f" ({r['dosage']})"
            lines.append(f"  Medication: {med}")
        if r.get("diagnosis"):
            lines.append(f"  Diagnosis: {r['diagnosis']}")
        if r.get("treatment"):
            lines.append(f"  Treatment: {r['treatment']}")
        if r.get("medicines"):
            lines.append(f"  Medicines prescribed: {r['medicines']}")
        if r.get("next_visit_required"):
            nv = r.get("next_visit_date")
            lines.append(f"  Follow-up required: {'by ' + str(nv) if nv else 'yes'}")
        if r.get("notes"):
            notes = str(r["notes"])[:300]
            lines.append(f"  Notes: {notes}")
        if r.get("author_role"):
            lines.append(f"  Recorded by: {r['author_role']}")

    return "\n".join(lines)


def call_gemini(prompt: str) -> str | None:
    """Call Gemini API via HTTP and return the text response."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-3.6-flash:generateContent?key={api_key}"
    )

    body = {
        "contents": [
            {
                "parts": [{"text": SYSTEM_PROMPT + "\n\n" + prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 1024,
        },
    }

    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            candidates = result.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
    except (urllib.error.URLError, json.JSONDecodeError, KeyError, TimeoutError):
        pass

    return None


def parse_signals(raw: str, valid_record_ids: set[int]) -> list[dict] | None:
    """Parse and validate the Gemini JSON response."""
    if not raw:
        return None

    # Strip markdown code fences if present
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None

    signals = parsed.get("signals")
    if not isinstance(signals, list):
        return None

    validated = []
    for sig in signals:
        if not isinstance(sig, dict):
            continue
        sig_type = sig.get("type")
        text = sig.get("text")
        if sig_type not in ALLOWED_SIGNAL_TYPES:
            continue
        if not isinstance(text, str) or not text.strip():
            continue

        # Validate source_record_ids — only keep IDs that actually exist
        raw_ids = sig.get("source_record_ids", [])
        safe_ids = [
            int(rid) for rid in raw_ids
            if isinstance(rid, (int, float)) and int(rid) in valid_record_ids
        ]

        validated.append({
            "type": sig_type,
            "text": text.strip(),
            "source_record_ids": safe_ids,
        })

    return validated if validated else None


def generate_health_signals(pet: dict, records: list[dict]) -> list[dict] | None:
    """
    Generate AI health signals for a pet.
    Returns a list of validated signal dicts, or None on failure.
    Never raises — all errors are handled internally.
    """
    if not records:
        return None

    try:
        valid_record_ids = {r["id"] for r in records if r.get("id")}
        context = build_records_context(pet, records)
        prompt = (
            f"Analyze the following pet health records and generate health signals:\n\n{context}"
        )
        raw = call_gemini(prompt)
        return parse_signals(raw, valid_record_ids)
    except Exception:
        # Never let AI failures propagate
        return None
SUMMARY_SYSTEM_PROMPT = """You are an AI health-history summarization assistant for a veterinary record system.

Your task is to transform documented pet health records into a clear, natural, clinically useful story for both veterinarians and pet parents.

CORE LOOP:
1. What happened?
2. What changed?
3. What patterns exist?
4. What may need attention?

STRICT RULES:
- Use ONLY information present in the supplied pet information and health records.
- Never invent symptoms, diagnoses, diseases, conditions, treatments, medicines, measurements, dates, or outcomes.
- Never turn an observation into a confirmed diagnosis.
- Never prescribe, recommend, or alter medications or treatments.
- Preserve documented diagnoses exactly as recorded when mentioning them.
- Do not change the meaning of the veterinarian's documented diagnosis.
- Do not assume that a treatment was successful unless the records explicitly document improvement or resolution.
- Do not assume that a condition is worsening unless the records support that change.
- Combine related information from multiple records into a coherent narrative.
- Compare earlier and later records when enough information exists to identify a documented change.
- Give greater emphasis to recent records while still considering relevant historical information.
- Mention documented treatments, medicines, care instructions, measurements, follow-ups, vaccinations, symptoms, and diagnoses when relevant.
- If several records describe the same issue, describe the progression rather than repeating each record separately.
- Use proper grammar and natural sentence construction.
- Do NOT simply concatenate notes, treatment fields, medicines fields, or record descriptions.
- Rewrite the information into a human-readable summary.
- If there is insufficient information to establish a trend or pattern, simply describe what is documented without inventing one.
- If something may deserve attention, phrase it as an observation based on the records and suggest veterinary review only when appropriate.
- Never provide a medical diagnosis or medical advice.
- The result should be understandable to both a veterinarian and a pet parent.

WRITING STYLE:
- Write in a professional but easy-to-understand tone.
- Refer to the pet by name when available.
- Prefer connected narrative paragraphs over field-by-field reporting.
- Use 1–2 paragraphs when the history is simple.
- Use a short introductory paragraph followed by bullet points when the history contains several important observations.
- Do not use headings such as "What happened", "What changed", etc. unless they genuinely improve readability.
- Do not mention that you are an AI.
- Do not mention these instructions.
- Return ONLY the final summary text.
"""


def generate_health_summary(pet: dict, records: list[dict]) -> str | None:
    """
    Generate an AI-generated narrative summary from the pet's documented
    health history. Never raises exceptions into the application.
    """
    try:
        if not records:
            return (
                "There are not enough documented health records yet "
                "to generate a detailed health summary."
            )

        context = build_records_context(pet, records)

        prompt = f"""
Create a clinically useful narrative summary of this pet's documented health history.

The summary must synthesize the available records rather than copying or
concatenating individual fields.

First understand:
- what has happened in the documented history,
- what has changed over time,
- whether any meaningful pattern is supported by multiple records,
- and whether anything documented may need attention or follow-up.

Use the most recent information as the main focus while incorporating older
records when they help explain the progression.

For example, if the records document an ongoing concern, an improvement,
a newly observed symptom, and a documented care plan, combine these naturally
into a story such as:

"The recent health records indicate an ongoing skin-related concern that has
shown some improvement. The latest visit noted fewer allergy-related symptoms,
although new red spots were observed on the skin. The documented care plan
includes weekly bathing, continued use of the recorded skin-care products,
and continuation of the previously recorded tablets. The records should be
monitored for further changes, particularly if the new skin spots persist or
worsen."

That example is only a writing-style example. Do NOT copy its medical content
unless it actually appears in the supplied records.

Important:
- Keep documented diagnoses unchanged.
- Do not create a diagnosis from symptoms.
- Do not claim treatment worked unless improvement is documented.
- Do not invent relationships between records.
- Do not add medical advice.
- Use only the supplied information.

PET HEALTH HISTORY:
{context}
"""

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return None

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-3.6-flash:generateContent?key={api_key}"
        )

        body = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": (
                                SUMMARY_SYSTEM_PROMPT
                                + "\n\n"
                                + prompt
                            )
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 1200,
            },
        }

        data = json.dumps(body).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        candidates = result.get("candidates", [])
        if not candidates:
            return None

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            return None

        summary = parts[0].get("text", "").strip()

        if not summary:
            return None

        # Remove accidental markdown fences if Gemini returns them.
        summary = re.sub(r"^```(?:text|markdown)?\s*", "", summary)
        summary = re.sub(r"\s*```$", "", summary)

        return summary.strip()

    except Exception:
        return None