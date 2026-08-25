@'
# PawTrail

PawTrail is a veterinary pet health management platform for pet owners, receptionists, and doctors.

## Features

### Authentication & Roles
- JWT-based authentication
- Role-based access control
- Owner, receptionist, and doctor workflows
- Protected backend API routes

### Pet Management
- Add and manage pets
- Pet profiles
- Species and breed information
- Date of birth and owner information
- Pet health history

### Veterinary Workflow
- Receptionist visit management
- Doctor dashboard
- Scheduled and completed visits
- Start consultation workflow
- Complete consultation workflow

### Health Records
Supported health record types include:
- Vet visits
- Vaccinations
- Weight
- Medication
- Symptoms / notes
- Consultations

Consultation records support:
- Diagnosis
- Treatment
- Medicines prescribed
- Clinical notes
- Weight
- Temperature
- Follow-up requirement and date

### Health Timeline
- Chronological pet health records
- Record type filtering
- Record editing
- Record deletion
- Consultation information
- Source record tracking

### AI Health Signals
- Gemini-powered health signal generation
- Signals linked to source health records
- Cached health signals
- Guardrails for AI-generated information
- Health information remains based on stored veterinary records

## Technology Stack

### Frontend
- React
- Vite
- React Router
- CSS

### Backend
- Python
- FastAPI
- Pydantic
- JWT authentication

### Database
- PostgreSQL / Supabase

### AI
- Google Gemini API

## Project Structure

```text
PetOLife/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── auth_deps.py
│   │   ├── gemini.py
│   │   ├── models.py
│   │   └── main.py
│   ├── migrate.py
│   ├── requirements.txt
│   └── test_gemini.py
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   └── pages/
│   ├── package.json
│   └── vite.config.js
│
├── database/
│   └── schema.sql
│
└── README.md