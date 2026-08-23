from datetime import datetime, timedelta, timezone
import os
import secrets

import jwt
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.database import get_connection


router = APIRouter(prefix="/auth", tags=["auth"])

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY is not configured.")
    return secret


class OTPRequest(BaseModel):
    phone: str = Field(min_length=1, max_length=20)


class OTPResponse(BaseModel):
    message: str
    phone: str
    demo_otp: str
    expires_at: datetime


class OTPVerifyRequest(BaseModel):
    phone: str = Field(min_length=1, max_length=20)
    code: str = Field(min_length=4, max_length=6)


class OTPVerifyResponse(BaseModel):
    message: str
    token: str
    user_id: int
    role: str


@router.post("/request-otp", response_model=OTPResponse)
def request_otp(request: OTPRequest) -> dict:
    otp = str(secrets.randbelow(900000) + 100000)
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=5)

    with get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO otp_codes (phone, code, expires_at)
            VALUES (%s, %s, %s)
            """,
            (request.phone, otp, expires_at),
        )

    return {
        "message": "OTP generated successfully. DEMO MODE: OTP is returned in the API response.",
        "phone": request.phone,
        "demo_otp": otp,
        "expires_at": expires_at,
    }


@router.post("/verify-otp", response_model=OTPVerifyResponse)
def verify_otp(request: OTPVerifyRequest) -> dict:
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    with get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, code, expires_at, verified
            FROM otp_codes
            WHERE phone = %s
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """,
            (request.phone,),
        )
        otp_record = cursor.fetchone()

        if otp_record is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP request found for this phone number.",
            )

        if otp_record["verified"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has already been used.",
            )

        if otp_record["expires_at"] < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired.",
            )

        if otp_record["code"] != request.code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP.",
            )

        cursor.execute(
            """
            UPDATE otp_codes
            SET verified = TRUE
            WHERE id = %s
            """,
            (otp_record["id"],),
        )

        cursor.execute(
            """
            SELECT id, role
            FROM users
            WHERE phone = %s
            LIMIT 1
            """,
            (request.phone,),
        )
        user = cursor.fetchone()

        if user is None:
            cursor.execute(
                """
                INSERT INTO users (phone, role)
                VALUES (%s, %s)
                RETURNING id, role
                """,
                (request.phone, "owner"),
            )
            user = cursor.fetchone()

    token_payload = {
        "user_id": user["id"],
        "role": user["role"],
    }

    token = jwt.encode(
        token_payload,
        get_jwt_secret(),
        algorithm=JWT_ALGORITHM,
    )

    return {
        "message": "OTP verified successfully.",
        "token": token,
        "user_id": user["id"],
        "role": user["role"],
    }