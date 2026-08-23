from fastapi import APIRouter, HTTPException, status

from app.database import get_connection
from app.models import PetCreate, PetResponse


router = APIRouter(prefix="/pets", tags=["pets"])

PET_COLUMNS = "id, name, species, breed, date_of_birth, photo_url, created_at"


@router.get("", response_model=list[PetResponse])
def list_pets() -> list[dict]:
    with get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(f"SELECT {PET_COLUMNS} FROM pets ORDER BY created_at DESC, id DESC")
        return cursor.fetchall()


@router.post("", response_model=PetResponse, status_code=status.HTTP_201_CREATED)
def create_pet(pet: PetCreate) -> dict:
    with get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(
            f"""
            INSERT INTO pets (name, species, breed, date_of_birth, photo_url)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING {PET_COLUMNS}
            """,
            (pet.name, pet.species, pet.breed, pet.date_of_birth, pet.photo_url),
        )
        created_pet = cursor.fetchone()
    return created_pet


@router.get("/{pet_id}", response_model=PetResponse)
def get_pet(pet_id: int) -> dict:
    with get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(f"SELECT {PET_COLUMNS} FROM pets WHERE id = %s", (pet_id,))
        pet = cursor.fetchone()
    if pet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found.")
    return pet

@router.delete("/{pet_id}")
def delete_pet(pet_id: int) -> dict:
    with get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(
            "DELETE FROM pets WHERE id = %s RETURNING id",
            (pet_id,),
        )
        deleted_pet = cursor.fetchone()

    if deleted_pet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pet not found.",
        )

    return {
        "message": "Pet deleted successfully.",
        "id": deleted_pet["id"],
    }
