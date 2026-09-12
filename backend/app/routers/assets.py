from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.blockchain.adapters.asset_nft import AssetNFTAdapter
from app.blockchain.client import blockchain_client
from app.db.session import get_db
from app.schemas.assets import AssetCreate
from app.services.asset_registry import asset_registry_service
from app.services.assets import AssetService



_DEFAULT_ASSETS = [
    {
        "asset_id": "asset-001",
        "name": "Executive Access Pass",
        "asset_type": "Access Credential",
        "owner": "did:trust:alice",
        "status": "Active",
        "access_level": "Administrator",
        "policy": "Executive Access",
        "token_id": None,
        "contract_address": None,
    },
    {
        "asset_id": "asset-002",
        "name": "Security Operations Record",
        "asset_type": "Digital Record",
        "owner": "did:trust:security",
        "status": "Protected",
        "access_level": "Security Analyst",
        "policy": "Security Operations",
        "token_id": None,
        "contract_address": None,
    },
    {
        "asset_id": "asset-003",
        "name": "Research Dataset",
        "asset_type": "Dataset",
        "owner": "did:trust:research",
        "status": "Protected",
        "access_level": "Developer",
        "policy": "Research Access",
        "token_id": None,
        "contract_address": None,
    },
    {
        "asset_id": "asset-004",
        "name": "Treasury Certificate",
        "asset_type": "Digital Certificate",
        "owner": "did:trust:finance",
        "status": "Active",
        "access_level": "Finance Admin",
        "policy": "Treasury Control",
        "token_id": None,
        "contract_address": None,
    },
]

router = APIRouter()

asset_service = AssetService(
    AssetNFTAdapter(blockchain_client)
)


def serialize_asset(asset) -> dict:
    metadata = asset.metadata_json or {}

    return {
        "asset_id": asset.id,
        "name": asset.name,
        "asset_type": metadata.get("asset_type", "Digital Asset"),
        "owner": asset.owner_did or "Unassigned",
        "status": asset.status,
        "access_level": metadata.get("access_level", "Restricted"),
        "policy": metadata.get("policy", "Default Policy"),
        "token_id": asset.token_id,
        "contract_address": getattr(asset, "contract_address", None),
    }


@router.get("/")
async def list_assets(db: Session = Depends(get_db)) -> dict:
    assets = asset_registry_service.list_assets(db)

    serialized = _DEFAULT_ASSETS + [
        serialize_asset(asset)
        for asset in assets
        if asset.id not in {item["asset_id"] for item in _DEFAULT_ASSETS}
    ]

    return {
        "service": "assets",
        "status": "ready",
        "count": len(serialized),
        "assets": serialized,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
) -> dict:
    asset = asset_registry_service.create_asset(
        db,
        organization_id=payload.organization_id,
        name=payload.name,
        owner_did=payload.owner_did,
        metadata_json=payload.metadata_json,
        status=payload.status,
    )

    return {
        "service": "assets",
        "status": "created",
        "asset": serialize_asset(asset),
    }


@router.get("/on-chain/{token_id}")
async def get_on_chain_asset(token_id: int) -> dict:
    if token_id < 0:
        raise HTTPException(
            status_code=400,
            detail="token_id must be non-negative",
        )

    try:
        asset = await asset_service.get_asset(token_id)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    return {
        "service": "assets",
        "status": "ready",
        "source": "blockchain",
        "token_id": token_id,
        "asset": asset,
    }


@router.get("/{asset_id}")
async def get_asset(
    asset_id: str,
    db: Session = Depends(get_db),
) -> dict:
    asset = asset_registry_service.get_asset(db, asset_id)

    if asset is None:
        return {
            "service": "assets",
            "status": "not_found",
            "asset": None,
        }

    return {
        "service": "assets",
        "status": "ready",
        "asset": serialize_asset(asset),
    }
