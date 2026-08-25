"""Health records router — role-based CRUD with AI signal trigger on consultation."""

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth_deps import get_current_user
from app.database import get_connection
from app.gemini import generate_health_signals
from app.models import HealthRecordCreate, HealthRecordResponse, RecordType


router = APIRouter(prefix="/pets/{pet_id}/records", tags=["health records"])

# Clinical record types that only doctors may create
CLINICAL_TYPES = {"consultation", "vet_visit"}

RECORD_COLUMNS = """
id, pet_id, visit_id, record_type, record_date, title, notes, weight_kg,
temperature_c, vaccine_name, next_due_date, medication_name, dosage,
diagnosis, treatment, medicines, next_visit_required, next_visit_date,
author_user_id, author_role, created_at
"""


def ensure_pet_exists_and_check_access(pet_id: int, current_user: dict) -> dict:
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


def get_record_or_404(pet_id: int, record_id: int) -> dict:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {RECORD_COLUMNS}
            FROM health_records
            WHERE id = %s AND pet_id = %s
            """,
            (record_id, pet_id),
        )
        record = cur.fetchone()

    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Health record not found.")

    return dict(record)


def is_within_delete_window(created_at: datetime) -> bool:
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - created_at <= timedelta(hours=24)


def _trigger_signal_refresh(pet_id: int, pet: dict) -> None:
    """Background signal refresh — called after clinical record creation. Never raises."""
    try:
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT {RECORD_COLUMNS}
                FROM health_records WHERE pet_id = %s
                ORDER BY record_date ASC, id ASC
                """,
                (pet_id,),
            )
            records = [dict(r) for r in cur.fetchall()]

        signals = generate_health_signals(pet, records)
        if signals:
            with get_connection() as conn, conn.cursor() as cur:
                cur.execute("DELETE FROM health_signals WHERE pet_id = %s", (pet_id,))
                for sig in signals:
                    cur.execute(
                        """
                        INSERT INTO health_signals (pet_id, signal_type, text, source_record_ids)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (pet_id, sig["type"], sig["text"], sig.get("source_record_ids") or []),
                    )
                conn.commit()
    except Exception as exc:
        import logging
        logging.exception("Health signal refresh failed for pet_id=%s: %s", pet_id, exc)


@router.get("", response_model=list[HealthRecordResponse])
def list_records(
    pet_id: int,
    record_type: RecordType | None = Query(default=None, alias="type"),
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> list[dict]:
    ensure_pet_exists_and_check_access(pet_id, current_user)

    with get_connection() as conn, conn.cursor() as cur:
        if record_type is None:
            cur.execute(
                f"SELECT {RECORD_COLUMNS} FROM health_records WHERE pet_id = %s ORDER BY record_date DESC, id DESC",
                (pet_id,),
            )
        else:
            cur.execute(
                f"SELECT {RECORD_COLUMNS} FROM health_records WHERE pet_id = %s AND record_type = %s ORDER BY record_date DESC, id DESC",
                (pet_id, record_type),
            )
        return cur.fetchall()


@router.post("", response_model=HealthRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    pet_id: int,
    record: HealthRecordCreate,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> dict:
    pet = ensure_pet_exists_and_check_access(pet_id, current_user)

    role = current_user["role"]

    # Owners cannot create any health records
    if role == "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owners cannot create health records.",
        )

    # Receptionists cannot create clinical records
    if role == "receptionist" and record.record_type in CLINICAL_TYPES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Receptionists cannot create clinical records (consultation, vet_visit).",
        )

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            INSERT INTO health_records (
                pet_id, visit_id, record_type, record_date, title, notes, weight_kg,
                temperature_c, vaccine_name, next_due_date, medication_name, dosage,
                diagnosis, treatment, medicines, next_visit_required, next_visit_date,
                author_user_id, author_role
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING {RECORD_COLUMNS}
            """,
            (
                pet_id,
                record.visit_id,
                record.record_type,
                record.record_date,
                record.title,
                record.notes,
                record.weight_kg,
                record.temperature_c,
                record.vaccine_name,
                record.next_due_date,
                record.medication_name,
                record.dosage,
                record.diagnosis,
                record.treatment,
                record.medicines,
                record.next_visit_required,
                record.next_visit_date,
                current_user["user_id"],
                role,
            ),
        )
        created_record = dict(cur.fetchone())
        conn.commit()

    # Trigger AI signal refresh for clinical records (non-blocking)
    if record.record_type in CLINICAL_TYPES or record.record_type == "vaccination":
        _trigger_signal_refresh(pet_id, pet)

    return created_record


@router.get("/{record_id}", response_model=HealthRecordResponse)
def get_record(
    pet_id: int,
    record_id: int,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> dict:
    ensure_pet_exists_and_check_access(pet_id, current_user)
    return get_record_or_404(pet_id, record_id)


@router.put("/{record_id}", response_model=HealthRecordResponse)
def update_record(
    pet_id: int,
    record_id: int,
    record: HealthRecordCreate,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> dict:
    pet = ensure_pet_exists_and_check_access(pet_id, current_user)
    role = current_user["role"]

    if role == "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owners cannot modify health records.")

    if role == "receptionist" and record.record_type in CLINICAL_TYPES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Receptionists cannot modify clinical records.")

    get_record_or_404(pet_id, record_id)

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            UPDATE health_records SET
                record_type=%s, record_date=%s, title=%s, notes=%s, weight_kg=%s,
                temperature_c=%s, vaccine_name=%s, next_due_date=%s, medication_name=%s,
                dosage=%s, diagnosis=%s, treatment=%s, medicines=%s,
                next_visit_required=%s, next_visit_date=%s
            WHERE id=%s AND pet_id=%s
            RETURNING {RECORD_COLUMNS}
            """,
            (
                record.record_type, record.record_date, record.title, record.notes,
                record.weight_kg, record.temperature_c, record.vaccine_name,
                record.next_due_date, record.medication_name, record.dosage,
                record.diagnosis, record.treatment, record.medicines,
                record.next_visit_required, record.next_visit_date,
                record_id, pet_id,
            ),
        )
        updated = cur.fetchone()
        conn.commit()

    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Health record not found.")

    return updated


@router.delete("/{record_id}")
def delete_record(
    pet_id: int,
    record_id: int,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> dict:
    ensure_pet_exists_and_check_access(pet_id, current_user)

    if current_user["role"] == "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owners cannot delete health records.")

    existing = get_record_or_404(pet_id, record_id)

    if not is_within_delete_window(existing["created_at"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This health record can no longer be deleted because more than 24 hours have passed.",
        )

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM health_records WHERE id = %s AND pet_id = %s RETURNING id",
            (record_id, pet_id),
        )
        deleted = cur.fetchone()
        conn.commit()

    if deleted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Health record not found.")

    return {"message": "Health record deleted successfully.", "id": deleted["id"]}