from fastapi import APIRouter, HTTPException
from web3 import Web3

from app.blockchain.adapters.policy_engine import PolicyEngineAdapter
from app.blockchain.client import blockchain_client
from app.models.common import AccessCheckRequest, AccessCheckResponse
from app.services.authorization import AuthorizationService


router = APIRouter()

authorization_service = AuthorizationService(
    PolicyEngineAdapter(blockchain_client)
)


@router.post("/check", response_model=AccessCheckResponse)
async def check_access(
    request: AccessCheckRequest,
) -> AccessCheckResponse:
    """Check resource access against the on-chain PolicyEngine."""

    if not Web3.is_address(request.did):
        raise HTTPException(
            status_code=503,
            detail="policy_engine authorization unavailable: invalid subject address",
        )

    try:
        allowed = await authorization_service.check_access(
            org_id=request.org_id,
            subject=request.did,
            role=request.role,
            resource_id=request.resource_id,
            action=request.action,
        )
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"policy_engine authorization unavailable: {exc}",
        ) from exc

    return AccessCheckResponse(
        allowed=allowed,
        reason=(
            "Access granted by PolicyEngine."
            if allowed
            else "Access denied by PolicyEngine."
        ),
        role=request.role,
    )
