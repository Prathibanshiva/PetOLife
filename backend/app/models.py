from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


RecordType = Literal["vet_visit", "vaccination", "weight", "medication", "symptom"]


class PetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    species: str = Field(min_length=1, max_length=50)
    breed: str | None = Field(default=None, max_length=100)
    date_of_birth: date | None = None
    photo_url: str | None = None


class PetResponse(PetCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime | None = None


class HealthRecordCreate(BaseModel):
    record_type: RecordType
    record_date: date
    title: str | None = Field(default=None, max_length=200)
    notes: str | None = None
    weight_kg: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)
    vaccine_name: str | None = Field(default=None, max_length=100)
    next_due_date: date | None = None
    medication_name: str | None = Field(default=None, max_length=100)
    dosage: str | None = Field(default=None, max_length=100)


class HealthRecordResponse(HealthRecordCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    created_at: datetime | None = None
