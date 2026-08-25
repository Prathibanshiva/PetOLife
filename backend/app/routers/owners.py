"""Owners router — receptionist-only owner management and search."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.auth_deps import get_current_user, require_receptionist
from app.database import get_connection

router = APIRouter(prefix="/owners", tags=["owners"])


class OwnerCreate(BaseModel):
    phone: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=100)
    email: str | None = None


class PetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    species: str = Field(min_length=1, max_length=50)
    breed: str | None = Field(default=None, max_length=100)
    date_of_birth: str | None = None  # ISO date string


@router.get("/search")
def search_owner(
    phone: str = Query(min_length=1),
    _: Annotated[dict, Depends(require_receptionist)] = None,
) -> dict:
    """Search for an owner by exact phone number."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, phone, name, email, role, created_at
            FROM users
            WHERE phone = %s AND role = 'owner'
            LIMIT 1
            """,
            (phone,),
        )
        owner = cur.fetchone()

    if owner is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No owner found with this phone number.",
        )

    # Fetch their pets
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, name, species, breed, date_of_birth, photo_url, created_at
            FROM pets
            WHERE owner_id = %s
            ORDER BY created_at DESC
            """,
            (owner["id"],),
        )
        pets = cur.fetchall()

    return {
        "owner": dict(owner),
        "pets": [dict(p) for p in pets],
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_owner(
    body: OwnerCreate,
    _: Annotated[dict, Depends(require_receptionist)] = None,
) -> dict:
    """Register a new owner account."""
    with get_connection() as conn, conn.cursor() as cur:
        # Check phone is not already taken
        cur.execute(
            "SELECT id FROM users WHERE phone = %s LIMIT 1",
            (body.phone,),
        )
        existing = cur.fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this phone number already exists.",
            )

        cur.execute(
            """
            INSERT INTO users (phone, name, email, role)
            VALUES (%s, %s, %s, 'owner')
            RETURNING id, phone, name, email, role, created_at
            """,
            (body.phone, body.name, body.email),
        )
        owner = cur.fetchone()
        conn.commit()

    return dict(owner)


@router.post("/{owner_id}/pets", status_code=status.HTTP_201_CREATED)
def add_pet_to_owner(
    owner_id: int,
    body: PetCreate,
    _: Annotated[dict, Depends(require_receptionist)] = None,
) -> dict:
    """Add a pet for an existing owner."""
    with get_connection() as conn, conn.cursor() as cur:
        # Verify owner exists
        cur.execute(
            "SELECT id FROM users WHERE id = %s AND role = 'owner' LIMIT 1",
            (owner_id,),
        )
        if cur.fetchone() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Owner not found.",
            )

        cur.execute(
            """
            INSERT INTO pets (owner_id, name, species, breed, date_of_birth)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, owner_id, name, species, breed, date_of_birth, photo_url, created_at
            """,
            (
                owner_id,
                body.name,
                body.species,
                body.breed,
                body.date_of_birth or None,
            ),
        )
        pet = cur.fetchone()
        conn.commit()

    return dict(pet)
