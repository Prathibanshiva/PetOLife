-- PawTrail initial PostgreSQL schema.
-- Apply this file to the Neon database before using backend CRUD endpoints.

CREATE TABLE pets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    species VARCHAR(50) NOT NULL,
    breed VARCHAR(100),
    date_of_birth DATE,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE health_records (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
    record_type VARCHAR(30) NOT NULL,
    record_date DATE NOT NULL,
    title VARCHAR(200),
    notes TEXT,
    weight_kg NUMERIC(5,2),
    vaccine_name VARCHAR(100),
    next_due_date DATE,
    medication_name VARCHAR(100),
    dosage VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE health_signals (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
    signal_type VARCHAR(20) NOT NULL,
    text TEXT NOT NULL,
    source_record_ids INTEGER[],
    generated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_health_records_pet_id ON health_records(pet_id);
CREATE INDEX idx_health_records_record_date ON health_records(record_date);
CREATE INDEX idx_health_signals_pet_id ON health_signals(pet_id);

-- Auth foundation

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(200),
    name VARCHAR(100),
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE otp_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    owner_id INTEGER REFERENCES users(id)
);

-- Auth foundation: assign existing pets to an owner

ALTER TABLE pets
ADD COLUMN owner_id INTEGER REFERENCES users(id);

UPDATE pets
SET owner_id = 1
WHERE LOWER(name) IN ('luna', 'scooby');

ALTER TABLE pets
ALTER COLUMN owner_id SET NOT NULL;