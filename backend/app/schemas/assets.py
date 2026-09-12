from pydantic import BaseModel, Field


class AssetCreate(BaseModel):
    organization_id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    owner_did: str | None = Field(default=None, max_length=255)
    metadata_json: dict = Field(default_factory=dict)
    status: str = Field(default="Active", min_length=1, max_length=50)
