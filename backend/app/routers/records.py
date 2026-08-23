from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Query, status

from app.database import get_connection
from app.models import HealthRecordCreate, HealthRecordResponse, RecordType


router = APIRouter(prefix="/pets/{pet_id}/records", tags=["health records"])


RECORD_COLUMNS = """
id, pet_id, record_type, record_date, title, notes, weight_kg,
vaccine_name, next_due_date, medication_name, dosage, created_at
"""


def ensure_pet_exists(pet_id: int) -> None:
    with get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM pets WHERE id = %s",
            (pet_id,),
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pet not found.",
            )


def get_record_or_404(pet_id: int, record_id: int) -> dict:
    ensure_pet_exists(pet_id)

    with get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {RECORD_COLUMNS}
            FROM health_records
            WHERE id = %s AND pet_id = %s
            """,
            (record_id, pet_id),
        )

        record = cursor.fetchone()

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health record not found.",
        )

    return record


def is_within_delete_window(created_at: datetime) -> bool:
    """
    A record may only be deleted within 24 hours of creation.
    The restriction is based on created_at, not record_date.
    """

    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    return now - created_at <= timedelta(hours=24)
    


@router.get("", response_model=list[HealthRecordResponse])
def list_records(
    pet_id: int,
    record_type: RecordType | None = Query(default=None, alias="type"),
) -> list[dict]:

    ensure_pet_exists(pet_id)

    with get_connection() as connection, connection.cursor() as cursor:
        if record_type is None:
            cursor.execute(
                f"""
                SELECT {RECORD_COLUMNS}
                FROM health_records
                WHERE pet_id = %s
                ORDER BY record_date DESC, id DESC
                """,
                (pet_id,),
            )
        else:
            cursor.execute(
                f"""
                SELECT {RECORD_COLUMNS}
                FROM health_records
                WHERE pet_id = %s AND record_type = %s
                ORDER BY record_date DESC, id DESC
                """,
                (pet_id, record_type),
            )

        return cursor.fetchall()


@router.post(
    "",
    response_model=HealthRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_record(
    pet_id: int,
    record: HealthRecordCreate,
) -> dict:

    ensure_pet_exists(pet_id)

    with get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(
            f"""
            INSERT INTO health_records (
                pet_id,
                record_type,
                record_date,
                title,
                notes,
                weight_kg,
                vaccine_name,
                next_due_date,
                medication_name,
                dosage
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING {RECORD_COLUMNS}
            """,
            (
                pet_id,
                record.record_type,
                record.record_date,
                record.title,
                record.notes,
                record.weight_kg,
                record.vaccine_name,
                record.next_due_date,
                record.medication_name,
                record.dosage,
            ),
        )

        created_record = cursor.fetchone()

    return created_record


@router.get("/{record_id}", response_model=HealthRecordResponse)
def get_record(
    pet_id: int,
    record_id: int,
) -> dict:

    return get_record_or_404(pet_id, record_id)


@router.put(
    "/{record_id}",
    response_model=HealthRecordResponse,
)
def update_record(
    pet_id: int,
    record_id: int,
    record: HealthRecordCreate,
) -> dict:

    existing_record = get_record_or_404(pet_id, record_id)

    with get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(
            f"""
            UPDATE health_records
            SET
                record_type = %s,
                record_date = %s,
                title = %s,
                notes = %s,
                weight_kg = %s,
                vaccine_name = %s,
                next_due_date = %s,
                medication_name = %s,
                dosage = %s
            WHERE id = %s AND pet_id = %s
            RETURNING {RECORD_COLUMNS}
            """,
            (
                record.record_type,
                record.record_date,
                record.title,
                record.notes,
                record.weight_kg,
                record.vaccine_name,
                record.next_due_date,
                record.medication_name,
                record.dosage,
                record_id,
                pet_id,
            ),
        )

        updated_record = cursor.fetchone()

    if updated_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health record not found.",
        )

    return updated_record


@router.delete("/{record_id}")
def delete_record(
    pet_id: int,
    record_id: int,
) -> dict:

    existing_record = get_record_or_404(pet_id, record_id)

    if not is_within_delete_window(existing_record["created_at"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This health record can no longer be deleted because more than 24 hours have passed since it was created.",
        )

    with get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM health_records
            WHERE id = %s AND pet_id = %s
            RETURNING id
            """,
            (record_id, pet_id),
        )

        deleted_record = cursor.fetchone()

    if deleted_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health record not found.",
        )

    return {
        "message": "Health record deleted successfully.",
        "id": deleted_record["id"],
    }