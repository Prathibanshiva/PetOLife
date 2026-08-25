"""Visits router — create visits (receptionist), list/complete visits (doctor)."""

from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth_deps import get_current_user, require_clinic, require_doctor, require_receptionist
from app.database import get_connection

router = APIRouter(prefix="/visits", tags=["visits"])


class VisitCreate(BaseModel):
    pet_ids: list[int]
    doctor_id: int
    notes: str | None = None


@router.post("", status_code=status.HTTP_201_CREATED)
def create_visit(
    body: VisitCreate,
    current_user: Annotated[dict, Depends(require_receptionist)] = None,
) -> dict:
    """Receptionist creates a visit assigning pets and a doctor."""
    if not body.pet_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one pet is required.",
        )

    with get_connection() as conn, conn.cursor() as cur:
        # Verify doctor exists
        cur.execute(
            "SELECT id, name FROM users WHERE id = %s AND role = 'doctor' LIMIT 1",
            (body.doctor_id,),
        )
        doctor = cur.fetchone()
        if doctor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found.",
            )

        # Verify all pets exist
        cur.execute(
            "SELECT id FROM pets WHERE id = ANY(%s)",
            (body.pet_ids,),
        )
        found_pet_ids = {row["id"] for row in cur.fetchall()}
        missing = set(body.pet_ids) - found_pet_ids
        if missing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pets not found: {list(missing)}",
            )

        # Create visit
        cur.execute(
            """
            INSERT INTO visits (receptionist_id, doctor_id, status, notes)
            VALUES (%s, %s, 'scheduled', %s)
            RETURNING id, receptionist_id, doctor_id, status, notes, created_at
            """,
            (current_user["user_id"], body.doctor_id, body.notes),
        )
        visit = dict(cur.fetchone())

        # Associate pets
        for pet_id in body.pet_ids:
            cur.execute(
                "INSERT INTO visit_pets (visit_id, pet_id) VALUES (%s, %s)",
                (visit["id"], pet_id),
            )

        conn.commit()

    visit["pet_ids"] = body.pet_ids
    visit["doctor_name"] = doctor["name"]
    return visit


@router.get("")
def list_visits(
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> list[dict]:
    """
    Doctor: returns today's assigned visits.
    Receptionist: returns all visits from today.
    """
    today = date.today()

    with get_connection() as conn, conn.cursor() as cur:
        if current_user["role"] == "doctor":
            cur.execute(
                """
                SELECT v.id, v.doctor_id, v.receptionist_id, v.status, v.notes,
                       v.created_at, v.completed_at,
                       u.name AS doctor_name
                FROM visits v
                JOIN users u ON u.id = v.doctor_id
                WHERE v.doctor_id = %s
                  AND v.created_at >= NOW() - INTERVAL '7 days'
                ORDER BY v.created_at DESC
                """,
                (current_user["user_id"],),
            )
        elif current_user["role"] == "receptionist":
            cur.execute(
                """
                SELECT v.id, v.doctor_id, v.receptionist_id, v.status, v.notes,
                       v.created_at, v.completed_at,
                       u.name AS doctor_name
                FROM visits v
                JOIN users u ON u.id = v.doctor_id
                WHERE v.created_at >= NOW() - INTERVAL '3 days'
                ORDER BY v.created_at DESC
                """,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied.",
            )

        visits = [dict(r) for r in cur.fetchall()]

        # Enrich with pet info
        for visit in visits:
            cur.execute(
                """
                SELECT p.id, p.name, p.species, p.breed, p.date_of_birth,
                       u.name AS owner_name, u.phone AS owner_phone
                FROM visit_pets vp
                JOIN pets p ON p.id = vp.pet_id
                JOIN users u ON u.id = p.owner_id
                WHERE vp.visit_id = %s
                """,
                (visit["id"],),
            )
            visit["pets"] = [dict(r) for r in cur.fetchall()]

    return visits


@router.get("/{visit_id}")
def get_visit(
    visit_id: int,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> dict:
    """Get a single visit with pet details."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT v.id, v.doctor_id, v.receptionist_id, v.status, v.notes,
                   v.created_at, v.completed_at,
                   u.name AS doctor_name
            FROM visits v
            JOIN users u ON u.id = v.doctor_id
            WHERE v.id = %s
            """,
            (visit_id,),
        )
        visit = cur.fetchone()

    if visit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found.",
        )

    visit = dict(visit)

    # Doctors can only see their own visits
    if current_user["role"] == "doctor" and visit["doctor_id"] != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this visit.",
        )

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT p.id, p.name, p.species, p.breed, p.date_of_birth,
                   u.name AS owner_name, u.phone AS owner_phone
            FROM visit_pets vp
            JOIN pets p ON p.id = vp.pet_id
            JOIN users u ON u.id = p.owner_id
            WHERE vp.visit_id = %s
            """,
            (visit_id,),
        )
        visit["pets"] = [dict(r) for r in cur.fetchall()]

    return visit


@router.patch("/{visit_id}/complete")
def complete_visit(
    visit_id: int,
    current_user: Annotated[dict, Depends(require_doctor)] = None,
) -> dict:
    """Doctor marks their assigned visit as completed."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, doctor_id, status FROM visits WHERE id = %s LIMIT 1",
            (visit_id,),
        )
        visit = cur.fetchone()

    if visit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found.",
        )

    if visit["doctor_id"] != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this visit.",
        )

    if visit["status"] == "completed":
        return {"message": "Visit already completed.", "visit_id": visit_id}

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            UPDATE visits
            SET status = 'completed', completed_at = NOW()
            WHERE id = %s
            RETURNING id, status, completed_at
            """,
            (visit_id,),
        )
        updated = dict(cur.fetchone())
        conn.commit()

    return {"message": "Visit completed.", **updated}
