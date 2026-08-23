# Database

- Database: PostgreSQL
- Hosted provider: Supabase

## Setup

1. Create a PostgreSQL project in Supabase.
2. Copy its PostgreSQL connection string and place it in a local `backend/.env` file as `DATABASE_URL`.
3. From a PostgreSQL client connected to that Supabase database, execute `database/schema.sql`.

The connection value uses the form shown in `backend/.env.example` and must include SSL configuration, such as `sslmode=require`.

Never commit `backend/.env`, database credentials, or a real connection string.
