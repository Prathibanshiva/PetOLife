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
