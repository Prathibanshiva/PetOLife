# PawTrail

### AI-Powered Pet Health Management Platform

PawTrail is a full-stack veterinary clinic and pet-health platform built for the **PetOLife AI Code-a-Thon**.

The core idea is simple:

> **Turn raw pet health records into a living health story.**

Instead of forcing veterinarians and pet parents to manually interpret a long list of records, PawTrail organizes the pet's history and uses AI to surface meaningful information about what happened, what changed, what patterns exist, and what may need attention.

---

## Features

### 1. Multi-Role Clinic Platform

PawTrail supports three user roles:

#### Pet Parent / Owner

- Login using phone number and demo OTP
- View their own registered pets
- View pet information
- View health records and timeline
- View AI Health Signals
- View AI-generated pet health summaries
- Read-only access to clinical information
- Cannot modify clinical records

#### Receptionist

- Login using phone number and demo OTP
- Search pet parents by phone number
- Register new pet parents
- Register pets
- Add additional pets to existing owners
- Manage clinic doctors
- Create/check-in visits
- Assign doctors to visits
- View registered pets and health information
- Manage non-clinical records where permitted

#### Doctor

- Login using phone number and demo OTP
- View assigned visits
- View assigned pets
- View pet summary
- Review previous consultations
- Record clinical consultations
- Record:
  - Weight
  - Temperature
  - Diagnosis
  - Treatment
  - Medicines
  - Additional notes
  - Follow-up requirement
  - Follow-up date
- Complete visits
- View AI Health Signals
- View AI-generated health summaries

---

## AI Health Intelligence

AI is a core part of PawTrail rather than an additional chatbot feature.

### AI Health Summary

PawTrail converts the available health records into a natural-language health story.

The summary is generated from the documented information available for the pet and is designed to answer questions such as:

- What happened?
- What changed?
- What patterns are visible?
- What may need attention?

For example, instead of displaying raw information such as:

```text
bath weekly one
reduce weight
new skin-care cream
continue same tablets