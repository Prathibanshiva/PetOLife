"""Pets router — CRUD with role-based access control."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth_deps import get_current_user
from app.database import get_connection
from app.models import PetCreate, PetResponse


router = APIRouter(prefix="/pets", tags=["pets"])

PET_COLUMNS = "id, owner_id, name, species, breed, date_of_birth, photo_url, created_at"


@router.get("", response_model=list[PetResponse])
def list_pets(
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> list[dict]:
    """
    Owner: sees only their own pets.
    Receptionist/Doctor: sees all pets.
    """
    with get_connection() as conn, conn.cursor() as cur:
        if current_user["role"] == "owner":
            cur.execute(
                f"SELECT {PET_COLUMNS} FROM pets WHERE owner_id = %s ORDER BY created_at DESC, id DESC",
                (current_user["user_id"],),
            )
        else:
            cur.execute(
                f"SELECT {PET_COLUMNS} FROM pets ORDER BY created_at DESC, id DESC"
            )
        return cur.fetchall()


@router.post("", response_model=PetResponse, status_code=status.HTTP_201_CREATED)
def create_pet(
    pet: PetCreate,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> dict:
    """
    Owner: creates pet under their own account.
    Receptionist: can create pets (must supply owner_id via owner route; this creates for self).
    Doctor: cannot create pets.
    """
    if current_user["role"] == "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctors cannot create pet records directly.",
        )

    owner_id = current_user["user_id"]

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            INSERT INTO pets (owner_id, name, species, breed, date_of_birth, photo_url)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING {PET_COLUMNS}
            """,
            (owner_id, pet.name, pet.species, pet.breed, pet.date_of_birth, pet.photo_url),
        )
        created_pet = cur.fetchone()
        conn.commit()

    return created_pet


@router.get("/{pet_id}", response_model=PetResponse)
def get_pet(
    pet_id: int,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> dict:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(f"SELECT {PET_COLUMNS} FROM pets WHERE id = %s", (pet_id,))
        pet = cur.fetchone()

    if pet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found.")

    if current_user["role"] == "owner" and pet["owner_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return pet


@router.delete("/{pet_id}")
def delete_pet(
    pet_id: int,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> dict:
    """Only receptionist or the owner themselves can delete a pet."""
    if current_user["role"] == "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctors cannot delete pets.",
        )

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(f"SELECT {PET_COLUMNS} FROM pets WHERE id = %s", (pet_id,))
        pet = cur.fetchone()

    if pet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found.")

    if current_user["role"] == "owner" and pet["owner_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM pets WHERE id = %s RETURNING id", (pet_id,))
        deleted = cur.fetchone()
        conn.commit()

    if deleted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found.")

    return {"message": "Pet deleted successfully.", "id": deleted["id"]}
