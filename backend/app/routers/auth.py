from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.core.session import session_manager
from app.models.common import (
    SIWEMessageRequest,
    SIWEMessageResponse,
    SIWEVerifyRequest,
    SIWEVerifyResponse,
    ServiceStatus,
)

router = APIRouter()


def validate_address(address: str) -> bool:
    return (
        len(address) == 42
        and address.startswith("0x")
        and all(character in "0123456789abcdefABCDEF" for character in address[2:])
    )


def validate_siwe_message(
    message: str,
    address: str,
    nonce: str,
) -> bool:
    required = (
        f"Chain ID: {settings.siwe_chain_id}",
        f"Nonce: {nonce}",
        f"{address}",
    )

    return all(value in message for value in required)


@router.get("/status", response_model=ServiceStatus)
async def auth_status() -> ServiceStatus:
    return ServiceStatus(
        service="authentication",
        status="ready",
    )


@router.post("/siwe/nonce", response_model=dict)
async def create_nonce(
    address: str = Query(..., min_length=42, max_length=42),
) -> dict:
    if not validate_address(address):
        raise HTTPException(
            status_code=400,
            detail="Invalid Ethereum address",
        )

    return {
        "nonce": session_manager.create_nonce(address),
    }


@router.post(
    "/siwe/message",
    response_model=SIWEMessageResponse,
)
async def create_siwe_message(
    request: SIWEMessageRequest,
) -> SIWEMessageResponse:
    if not validate_address(request.address):
        raise HTTPException(
            status_code=400,
            detail="Invalid Ethereum address",
        )

    if request.chain_id != settings.siwe_chain_id:
        raise HTTPException(
            status_code=400,
            detail="Unsupported SIWE chain ID",
        )

    if request.domain != settings.siwe_domain and not request.domain.startswith(
        f"{settings.siwe_domain}:"
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid SIWE domain",
        )

    parsed_uri = urlparse(request.uri)
    if parsed_uri.scheme not in {"http", "https"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid SIWE URI",
        )

    message = (
        f"{request.domain} wants you to sign in with your Ethereum account:\n"
        f"{request.address}\n\n"
        f"{request.statement}\n\n"
        f"URI: {request.uri}\n"
        f"Version: 1\n"
        f"Chain ID: {request.chain_id}\n"
        f"Nonce: {request.nonce}\n"
        f"Issued At: {request.issued_at}"
    )

    return SIWEMessageResponse(message=message)


@router.post(
    "/siwe/verify",
    response_model=SIWEVerifyResponse,
)
async def verify_siwe(
    request: SIWEVerifyRequest,
) -> SIWEVerifyResponse:
    if not validate_address(request.address):
        raise HTTPException(
            status_code=401,
            detail="Invalid Ethereum address",
        )

    if not validate_siwe_message(
        request.message,
        request.address,
        request.nonce,
    ):
        raise HTTPException(
            status_code=401,
            detail="SIWE message does not match authentication request",
        )

    if not session_manager.consume_nonce(
        request.nonce,
        request.address,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid, expired, consumed, or mismatched nonce",
        )

    valid = session_manager.verify_signature(
        message=request.message,
        signature=request.signature,
        expected_address=request.address,
    )

    if not valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid SIWE signature",
        )

    session_id = session_manager.create_session(
        address=request.address,
    )

    return SIWEVerifyResponse(
        authenticated=True,
        address=request.address,
        session_id=session_id,
        message="SIWE authentication successful",
    )
