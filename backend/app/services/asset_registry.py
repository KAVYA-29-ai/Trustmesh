from uuid import uuid4

from sqlalchemy.orm import Session

from app.db.models import Asset


class AssetRegistryService:
    """Persistence service for application-level digital assets."""

    def list_assets(self, db: Session) -> list[Asset]:
        return db.query(Asset).order_by(Asset.id.desc()).all()

    def get_asset(self, db: Session, asset_id: str) -> Asset | None:
        return db.query(Asset).filter(Asset.id == asset_id).first()

    def create_asset(
        self,
        db: Session,
        *,
        organization_id: str,
        name: str,
        owner_did: str | None,
        metadata_json: dict,
        status: str,
    ) -> Asset:
        asset = Asset(
            id=f"asset-{uuid4().hex[:16]}",
            organization_id=organization_id,
            name=name,
            owner_did=owner_did,
            metadata_json=metadata_json,
            status=status,
        )

        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset


asset_registry_service = AssetRegistryService()
