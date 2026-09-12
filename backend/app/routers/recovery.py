from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.recovery import recovery_service


router = APIRouter()


class RecoveryRequestCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    reason: str = Field(min_length=1)
    required_approvals: int = Field(default=2, ge=1)
    timelock_hours: int = Field(default=48, ge=0)


def serialize_request(request) -> dict:
    return {
        "request_id": request.request_id,
        "subject": request.subject,
        "reason": request.reason,
        "status": request.status,
        "approvals": request.approvals,
        "required_approvals": request.required_approvals,
        "timelock_hours": request.timelock_hours,
        "created_at": request.created_at.isoformat(),
    }


@router.get("/")
async def get_recovery_center() -> dict:
    requests = recovery_service.list_requests()

    return {
        "service": "recovery",
        "status": "ready",
        "summary": recovery_service.get_summary(),
        "requests": [
            serialize_request(request)
            for request in requests
        ],
    }


@router.get("/requests")
async def list_recovery_requests() -> dict:
    requests = recovery_service.list_requests()

    return {
        "service": "recovery",
        "status": "ready",
        "count": len(requests),
        "requests": [
            serialize_request(request)
            for request in requests
        ],
    }


@router.post("/requests", status_code=201)
async def create_recovery_request(
    payload: RecoveryRequestCreate,
) -> dict:
    try:
        request = recovery_service.create_request(
            subject=payload.subject,
            reason=payload.reason,
            required_approvals=payload.required_approvals,
            timelock_hours=payload.timelock_hours,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "service": "recovery",
        "status": "created",
        "request": serialize_request(request),
    }


@router.post("/requests/{request_id}/approve")
async def approve_recovery_request(request_id: str) -> dict:
    try:
        request = recovery_service.approve_request(request_id)
    except ValueError as exc:
        status_code = 404 if "not found" in str(exc) else 409
        raise HTTPException(
            status_code=status_code,
            detail=str(exc),
        ) from exc

    return {
        "service": "recovery",
        "status": "approved",
        "request": serialize_request(request),
    }


@router.post("/requests/{request_id}/execute")
async def execute_recovery_request(request_id: str) -> dict:
    try:
        request = recovery_service.execute_request(request_id)
    except ValueError as exc:
        status_code = 404 if "not found" in str(exc) else 409
        raise HTTPException(
            status_code=status_code,
            detail=str(exc),
        ) from exc

    return {
        "service": "recovery",
        "status": "recovered",
        "request": serialize_request(request),
    }