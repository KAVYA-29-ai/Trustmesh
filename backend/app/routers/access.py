from fastapi import APIRouter, HTTPException

from app.models.common import AccessCheckRequest, AccessCheckResponse
from app.services.security_workflow import security_workflow


router = APIRouter()

def local_policy(request: AccessCheckRequest) -> bool:
    if security_workflow.identity_status(request.did) != "ACTIVE":
        return False
    if request.resource_id in {"acme-employee-records", "acme-bank-account"}:
        return request.action.upper() == "READ" and request.role in {"Employee", "Admin"}
    if request.resource_id == "acme-bank-transfer":
        return request.action.upper() == "TRANSFER" and request.role in {"Employee", "Admin"}
    if request.resource_id in {"acme-admin-console", "acme-bank-admin"}:
        return request.action.upper() == "ADMIN" and request.role == "Admin"
    return False


@router.post("/check", response_model=AccessCheckResponse)
async def check_access(
    request: AccessCheckRequest,
) -> AccessCheckResponse:
    """Check demo resources through the wallet-free backend checkpoint."""
    known_resources = {
        "acme-employee-records",
        "acme-admin-console",
        "acme-bank-account",
        "acme-bank-transfer",
        "acme-bank-admin",
    }
    if request.resource_id not in known_resources:
        raise HTTPException(
            status_code=503,
            detail="policy_engine authorization unavailable: unknown resource",
        )
    allowed = local_policy(request)
    result = security_workflow.authorize(request, allowed)

    return AccessCheckResponse(
        allowed=result["allowed"],
        reason=(
            "Access granted by TrustMesh policy."
            if result["allowed"]
            else "Access denied by TrustMesh policy or identity status."
        ),
        role=request.role,
    )
