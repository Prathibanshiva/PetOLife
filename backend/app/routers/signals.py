"""Health signals router — AI-generated signals with caching."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth_deps import get_current_user
from app.database import get_connection
from app.gemini import generate_health_signals

router = APIRouter(prefix="/pets/{pet_id}/signals", tags=["health signals"])


def _get_pet_and_check_access(pet_id: int, current_user: dict) -> dict:
    """Return pet row or raise 404/403."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, owner_id, name, species, breed, date_of_birth FROM pets WHERE id = %s",
            (pet_id,),
        )
        pet = cur.fetchone()

    if pet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found.")

    if current_user["role"] == "owner" and pet["owner_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return dict(pet)


def _get_records(pet_id: int) -> list[dict]:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, record_type, record_date, title, notes, weight_kg,
                   temperature_c, vaccine_name, next_due_date,
                   medication_name, dosage, diagnosis, treatment, medicines,
                   next_visit_required, next_visit_date, author_role
            FROM health_records
            WHERE pet_id = %s
            ORDER BY record_date ASC, id ASC
            """,
            (pet_id,),
        )
        return [dict(r) for r in cur.fetchall()]


def _get_cached_signals(pet_id: int) -> list[dict]:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, signal_type, text, source_record_ids, generated_at
            FROM health_signals
            WHERE pet_id = %s
            ORDER BY generated_at DESC, id ASC
            """,
            (pet_id,),
        )
        return [dict(r) for r in cur.fetchall()]


def _replace_signals(pet_id: int, signals: list[dict]) -> None:
    """Delete old signals for this pet and insert fresh ones."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM health_signals WHERE pet_id = %s", (pet_id,))
        for sig in signals:
            cur.execute(
                """
                INSERT INTO health_signals (pet_id, signal_type, text, source_record_ids)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    pet_id,
                    sig["type"],
                    sig["text"],
                    sig.get("source_record_ids") or [],
                ),
            )
        conn.commit()


@router.get("")
def get_signals(
    pet_id: int,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> dict:
    """Return cached health signals. Generates if cache is empty."""
    pet = _get_pet_and_check_access(pet_id, current_user)
    cached = _get_cached_signals(pet_id)

    if cached:
        return {
            "signals": cached,
            "source": "cache",
            "generated_at": cached[0]["generated_at"].isoformat() if cached else None,
        }

    # No cache — try to generate
    records = _get_records(pet_id)
    signals = generate_health_signals(pet, records)

    if signals:
        _replace_signals(pet_id, signals)
        return {
            "signals": _get_cached_signals(pet_id),
            "source": "generated",
        }

    return {
        "signals": [],
        "source": "none",
        "message": "No signals available yet. Health signals are generated after clinical records are added.",
    }


@router.post("/refresh")
def refresh_signals(
    pet_id: int,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> dict:
    """Force regenerate health signals from the full record history."""
    pet = _get_pet_and_check_access(pet_id, current_user)
    records = _get_records(pet_id)

    if not records:
        return {
            "signals": [],
            "source": "none",
            "message": "No health records to analyze yet.",
        }

    signals = generate_health_signals(pet, records)

    if signals:
        _replace_signals(pet_id, signals)
        return {
            "signals": _get_cached_signals(pet_id),
            "source": "refreshed",
        }

    return {
        "signals": _get_cached_signals(pet_id),
        "source": "ai_unavailable",
        "message": "Health insights are temporarily unavailable. Your health records are still safe.",
    }
