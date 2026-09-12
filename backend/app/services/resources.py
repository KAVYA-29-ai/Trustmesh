from dataclasses import dataclass

from sqlalchemy import select

from app.db.models import Resource as ResourceModel
from app.db.session import SessionLocal


@dataclass
class Resource:
    resource_id: str
    name: str
    resource_type: str
    application: str
    owner: str
    status: str
    access_level: str


class ResourceService:
    """PostgreSQL-backed resource service."""

    @staticmethod
    def _to_resource(record: ResourceModel) -> Resource:
        metadata = record.metadata_json or {}

        return Resource(
            resource_id=record.id,
            name=record.name,
            resource_type=record.resource_type,
            application=str(
                metadata.get("application")
                or metadata.get("app")
                or "TrustLayer"
            ),
            owner=str(
                metadata.get("owner")
                or metadata.get("owner_did")
                or "Unassigned"
            ),
            status=str(metadata.get("status") or "Active"),
            access_level=str(metadata.get("access_level") or "Restricted"),
        )

    def list_resources(self) -> list[Resource]:
        with SessionLocal() as db:
            records = db.execute(
                select(ResourceModel).order_by(ResourceModel.name)
            ).scalars().all()

            return [self._to_resource(record) for record in records]

    def get_resource(self, resource_id: str) -> Resource | None:
        with SessionLocal() as db:
            record = db.get(ResourceModel, resource_id)

            if record is None:
                return None

            return self._to_resource(record)


resource_service = ResourceService()
