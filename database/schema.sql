-- PawTrail PostgreSQL schema — full version.
-- Run this against your Supabase/Neon PostgreSQL database.
-- All CREATE TABLE statements use IF NOT EXISTS so re-running is safe.
-- ALTER TABLE statements add columns only if not already present.

-- ─── Core tables ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(200),
    name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'owner',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    owner_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS pets (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) NOT NULL,
    name VARCHAR(100) NOT NULL,
    species VARCHAR(50) NOT NULL,
    breed VARCHAR(100),
    date_of_birth DATE,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Visits ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS visits (
    id SERIAL PRIMARY KEY,
    receptionist_id INTEGER REFERENCES users(id),
    doctor_id INTEGER REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    -- status: scheduled | in_progress | completed
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Junction table so one visit can have multiple pets
CREATE TABLE IF NOT EXISTS visit_pets (
    visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
    pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
    PRIMARY KEY (visit_id, pet_id)
);

-- ─── Health records ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS health_records (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
    visit_id INTEGER REFERENCES visits(id) ON DELETE SET NULL,
    record_type VARCHAR(30) NOT NULL,
    -- record_type: vet_visit | vaccination | weight | medication | symptom | consultation
    record_date DATE NOT NULL,
    title VARCHAR(200),
    notes TEXT,
    weight_kg NUMERIC(5,2),
    temperature_c NUMERIC(4,1),
    vaccine_name VARCHAR(100),
    next_due_date DATE,
    medication_name VARCHAR(100),
    dosage VARCHAR(100),
    diagnosis TEXT,
    treatment TEXT,
    medicines TEXT,
    next_visit_required BOOLEAN DEFAULT FALSE,
    next_visit_date DATE,
    author_user_id INTEGER REFERENCES users(id),
    author_role VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Health signals (AI cache) ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS health_signals (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
    signal_type VARCHAR(20) NOT NULL,
    -- signal_type: event | change | pattern | attention
    text TEXT NOT NULL,
    source_record_ids INTEGER[],
    generated_at TIMESTAMP DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_health_records_pet_id ON health_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_health_records_record_date ON health_records(record_date);
CREATE INDEX IF NOT EXISTS idx_health_signals_pet_id ON health_signals(pet_id);
CREATE INDEX IF NOT EXISTS idx_visits_doctor_id ON visits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_visit_pets_pet_id ON visit_pets(pet_id);

-- ─── Demo seed data ──────────────────────────────────────────────────────────
-- Insert demo accounts with ON CONFLICT DO NOTHING so re-runs are safe.

INSERT INTO users (phone, name, role) VALUES
    ('+919000010001', 'Ananya Sharma', 'receptionist'),
    ('+919000010002', 'Dr. Arjun Mehta', 'doctor')
ON CONFLICT (phone) DO NOTHING;

-- NOTE: The existing owner account (id=1) and their pets (Luna, Scooby)
-- should already exist in your database. This schema preserves them.
-- If starting fresh, add your demo owner here as well.