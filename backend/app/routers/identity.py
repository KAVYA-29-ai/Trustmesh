from fastapi import APIRouter, HTTPException

from app.blockchain.adapters.did_registry import DIDRegistryAdapter
from app.blockchain.client import blockchain_client
from app.services.identity import IdentityService


router = APIRouter()

identity_service = IdentityService(
    DIDRegistryAdapter(blockchain_client)
)


@router.get("/{did}")
async def resolve_identity(did: str) -> dict:
    """Resolve a decentralized identity from DIDRegistry."""
    try:
        document = await identity_service.resolve_did(did)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    return {
        "service": "identity",
        "status": "ready",
        "source": "blockchain",
        "did": did,
        "document": document,
    }


@router.get("/{did}/status")
async def identity_status(did: str) -> dict:
    """Return the active status of a decentralized identity."""
    try:
        active = await identity_service.is_active(did)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    return {
        "service": "identity",
        "status": "ready",
        "source": "blockchain",
        "did": did,
        "active": active,
    }
