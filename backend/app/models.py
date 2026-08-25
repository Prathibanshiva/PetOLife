from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


RecordType = Literal[
    "vet_visit", "vaccination", "weight", "medication", "symptom", "consultation"
]


class PetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    species: str = Field(min_length=1, max_length=50)
    breed: str | None = Field(default=None, max_length=100)
    date_of_birth: date | None = None
    photo_url: str | None = None


class PetResponse(PetCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int | None = None
    created_at: datetime | None = None


class HealthRecordCreate(BaseModel):
    record_type: RecordType
    record_date: date
    title: str | None = Field(default=None, max_length=200)
    notes: str | None = None
    weight_kg: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)
    temperature_c: Decimal | None = Field(default=None, max_digits=4, decimal_places=1)
    vaccine_name: str | None = Field(default=None, max_length=100)
    next_due_date: date | None = None
    medication_name: str | None = Field(default=None, max_length=100)
    dosage: str | None = Field(default=None, max_length=100)
    diagnosis: str | None = None
    treatment: str | None = None
    medicines: str | None = None
    next_visit_required: bool = False
    next_visit_date: date | None = None
    visit_id: int | None = None


class HealthRecordResponse(HealthRecordCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pet_id: int
    author_user_id: int | None = None
    author_role: str | None = None
    created_at: datetime | None = None
