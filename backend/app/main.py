from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, pets, records, owners, doctors, visits, signals

app = FastAPI(title="PawTrail API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(pets.router)
app.include_router(records.router)
app.include_router(signals.router)
app.include_router(owners.router)
app.include_router(doctors.router)
app.include_router(visits.router)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Confirm that the API is running."""
    return {"status": "ok", "message": "PawTrail backend is running"}
