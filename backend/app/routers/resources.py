from fastapi import APIRouter

from app.services.resources import resource_service


router = APIRouter()


def serialize_resource(resource) -> dict:
    return {
        "resource_id": resource.resource_id,
        "name": resource.name,
        "resource_type": resource.resource_type,
        "application": resource.application,
        "owner": resource.owner,
        "status": resource.status,
        "access_level": resource.access_level,
    }


@router.get("/")
async def list_resources() -> dict:
    resources = resource_service.list_resources()

    return {
        "service": "resources",
        "status": "ready",
        "count": len(resources),
        "resources": [
            serialize_resource(resource)
            for resource in resources
        ],
    }


@router.get("/{resource_id}")
async def get_resource(resource_id: str) -> dict:
    resource = resource_service.get_resource(resource_id)

    if resource is None:
        return {
            "service": "resources",
            "status": "not_found",
            "resource": None,
        }

    return {
        "service": "resources",
        "status": "ready",
        "resource": serialize_resource(resource),
    }
