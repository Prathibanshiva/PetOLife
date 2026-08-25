"""Doctors router — receptionist manages doctor accounts."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth_deps import require_receptionist
from app.database import get_connection

router = APIRouter(prefix="/doctors", tags=["doctors"])


class DoctorCreate(BaseModel):
    phone: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=100)


@router.get("")
def list_doctors(
    _: Annotated[dict, Depends(require_receptionist)] = None,
) -> list[dict]:
    """List all doctor accounts."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, phone, name, created_at
            FROM users
            WHERE role = 'doctor'
            ORDER BY name
            """
        )
        return [dict(r) for r in cur.fetchall()]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_doctor(
    body: DoctorCreate,
    _: Annotated[dict, Depends(require_receptionist)] = None,
) -> dict:
    """Register a new doctor account."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM users WHERE phone = %s LIMIT 1",
            (body.phone,),
        )
        if cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this phone number already exists.",
            )

        cur.execute(
            """
            INSERT INTO users (phone, name, role)
            VALUES (%s, %s, 'doctor')
            RETURNING id, phone, name, created_at
            """,
            (body.phone, body.name),
        )
        doctor = cur.fetchone()
        conn.commit()

    return dict(doctor)


@router.delete("/{doctor_id}")
def delete_doctor(
    doctor_id: int,
    _: Annotated[dict, Depends(require_receptionist)] = None,
) -> dict:
    """Remove a doctor account."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM users
            WHERE id = %s AND role = 'doctor'
            RETURNING id, name
            """,
            (doctor_id,),
        )
        deleted = cur.fetchone()
        conn.commit()

    if deleted is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found.",
        )

    return {"message": f"Doctor {deleted['name']} removed.", "id": deleted["id"]}
