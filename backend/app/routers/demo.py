from fastapi import APIRouter, HTTPException
from app.models.common import AccessCheckRequest
from app.routers.access import authorization_service
from app.services.security_workflow import security_workflow


router = APIRouter()

ORG_ID = "acme-organization"
STUDENT_IDENTITY = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
STUDENT_RESOURCE = "acme-student-records"
ADMIN_RESOURCE = "acme-admin-console"
READ_ACTION = "READ"


async def _check_policy(request: AccessCheckRequest) -> bool:
    return await authorization_service.check_access(
        org_id=request.org_id,
        subject=request.did,
        role=request.role,
        resource_id=request.resource_id,
        action=request.action,
    )


def _policy_error(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail=f"Local PolicyEngine unavailable: {exc}",
    )


@router.post("/authorize")
async def authorize(request: AccessCheckRequest) -> dict:
    """Authorize a request from the generic organization application."""
    try:
        allowed = await _check_policy(request)
    except Exception as exc:
        raise _policy_error(exc) from exc

    return security_workflow.authorize(request, allowed)


@router.post("/student-resource")
async def student_resource_access() -> dict:
    """Check the normal Student Portal resource against PolicyEngine."""
    request = AccessCheckRequest(
        org_id=ORG_ID,
        did=STUDENT_IDENTITY,
        role="Student",
        resource_id=STUDENT_RESOURCE,
        action=READ_ACTION,
    )
    try:
        allowed = await _check_policy(request)
    except Exception as exc:
        raise _policy_error(exc) from exc

    return {
        "identity": "Student",
        "subject": STUDENT_IDENTITY,
        "resource": "Student Records",
        "resource_id": STUDENT_RESOURCE,
        "action": READ_ACTION,
        "decision": "ALLOWED" if allowed else "DENIED",
        "allowed": allowed,
    }


@router.post("/unauthorized-access")
async def simulate_unauthorized_access(
    request: AccessCheckRequest | None = None,
) -> dict:
    """Run the localhost-only Student -> Admin denial demo."""
    request = request or AccessCheckRequest(
        org_id=ORG_ID,
        did=STUDENT_IDENTITY,
        role="Student",
        resource_id=ADMIN_RESOURCE,
        action="ADMIN",
    )
    try:
        allowed = await _check_policy(request)
    except Exception as exc:
        raise _policy_error(exc) from exc

    result = security_workflow.authorize(request, allowed)

    if result["allowed"]:
        raise HTTPException(
            status_code=409,
            detail="Demo policy unexpectedly allowed the Student admin request.",
        )
    legacy_result = dict(result)
    legacy_result["decision"] = "DENIED"
    legacy_result["status"] = "blocked"
    return legacy_result


@router.post("/simulate-attack")
async def simulate_attack(request: AccessCheckRequest) -> dict:
    """Run a safe synthetic violation sequence without mutating policy."""
    return security_workflow.simulate_attack(request)


@router.post("/policy-simulate")
async def simulate_policy(request: dict) -> dict:
    access_request = AccessCheckRequest(**request)
    return security_workflow.policy_simulation(
        access_request,
        str(request.get("simulated_decision", "DENY")),
    )


@router.get("/incidents")
async def list_demo_incidents() -> dict:
    incidents = security_workflow.list_incidents()
    return {"service": "incident-response", "status": "ready", "count": len(incidents), "incidents": incidents}


@router.get("/graph")
async def get_demo_graph() -> dict:
    return security_workflow.graph()


@router.get("/copilot")
async def get_demo_copilot() -> dict:
    return security_workflow.copilot()