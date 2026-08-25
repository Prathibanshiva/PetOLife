from app.database import get_connection

ddl = """
CREATE TABLE IF NOT EXISTS visits (
    id SERIAL PRIMARY KEY,
    receptionist_id INTEGER REFERENCES users(id),
    doctor_id INTEGER REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visit_pets (
    visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
    pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
    PRIMARY KEY (visit_id, pet_id)
);

ALTER TABLE health_records ADD COLUMN IF NOT EXISTS visit_id INTEGER REFERENCES visits(id) ON DELETE SET NULL;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS temperature_c NUMERIC(4,1);
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS diagnosis TEXT;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS treatment TEXT;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS medicines TEXT;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS next_visit_required BOOLEAN DEFAULT FALSE;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS next_visit_date DATE;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS author_user_id INTEGER REFERENCES users(id);
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS author_role VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_visits_doctor_id ON visits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_visit_pets_pet_id ON visit_pets(pet_id);

INSERT INTO users (phone, name, role) VALUES
    ('+919000010001', 'Ananya Sharma', 'receptionist'),
    ('+919000010002', 'Dr. Arjun Mehta', 'doctor')
ON CONFLICT (phone) DO NOTHING;
"""

with get_connection() as conn, conn.cursor() as cur:
    cur.execute(ddl)
    conn.commit()
    print('Schema migration complete.')
