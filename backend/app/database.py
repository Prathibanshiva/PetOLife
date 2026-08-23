"""Database configuration helpers for the PawTrail API."""

import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row


load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")


def get_database_url() -> str:
    """Return the configured PostgreSQL connection URL."""
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured.")

    return DATABASE_URL


pool = ConnectionPool(
    conninfo=get_database_url(),
    min_size=1,
    max_size=5,
    kwargs={"row_factory": dict_row},
)


def get_connection():
    """Get a reusable PostgreSQL connection from the connection pool."""
    return pool.connection()