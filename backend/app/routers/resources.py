from uuid import uuid4

from fastapi import APIRouter, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.db.models import Organization, Resource as ResourceModel
from app.db.session import SessionLocal
from app.indexer.events import BlockchainEvent
from app.indexer.service import indexer_service

from app.services.resources import resource_service


router = APIRouter()


class ResourceCreate(BaseModel):
    organization_id: str = Field(default="acme-organization", min_length=1)
    name: str = Field(min_length=1, max_length=255)
    resource_type: str = Field(default="Protected Resource", min_length=1, max_length=100)
    identifier: str = Field(min_length=1, max_length=500)
    application: str = Field(default="Acme Organization", min_length=1, max_length=255)
    owner: str = Field(default="TrustMesh Admin", min_length=1, max_length=255)
    access_level: str = Field(default="Restricted", min_length=1, max_length=100)


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


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_resource(payload: ResourceCreate) -> dict:
    resource_id = payload.identifier.strip()
    with SessionLocal() as db:
        organization = db.get(Organization, payload.organization_id)
        if organization is None:
            db.add(Organization(id=payload.organization_id, name=payload.application.strip()))
            db.flush()
        existing = db.scalar(select(ResourceModel).where(ResourceModel.id == resource_id))
        if existing is not None:
            resource_id = f"resource-{uuid4().hex[:10]}"
        record = ResourceModel(
            id=resource_id,
            organization_id=payload.organization_id,
            name=payload.name.strip(),
            resource_type=payload.resource_type.strip(),
            identifier=payload.identifier.strip(),
            metadata_json={
                "application": payload.application.strip(),
                "owner": payload.owner.strip(),
                "access_level": payload.access_level.strip(),
                "status": "Protected",
            },
        )
        db.add(record)
        db.commit()
        db.refresh(record)

    indexer_service.ingest(
        BlockchainEvent(
            event_name="ResourceRegistered",
            contract_address="trustmesh-resource-registry",
            transaction_hash=f"resource-{uuid4()}",
            block_number=0,
            log_index=0,
            timestamp=None,
            data={
                "resource_id": record.id,
                "resource": record.name,
                "organization_id": record.organization_id,
                "action": "REGISTER",
            },
        )
    )
    return {"service": "resources", "status": "created", "resource": serialize_resource(resource_service.get_resource(record.id))}


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
