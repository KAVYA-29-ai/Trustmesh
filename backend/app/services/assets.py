from typing import Any

from app.blockchain.adapters.asset_nft import AssetNFTAdapter


class AssetService:
    """Application service for blockchain-backed digital assets."""

    def __init__(self, asset_nft: AssetNFTAdapter):
        self.asset_nft = asset_nft

    async def get_asset(self, token_id: int) -> Any:
        """Retrieve an asset from AssetNFT."""
        return await self.asset_nft.get_asset(token_id)

    async def asset_exists(self, token_id: int) -> bool:
        """Check whether an AssetNFT token exists."""
        return await self.asset_nft.asset_exists(token_id)

    async def owner_of(self, token_id: int) -> str:
        """Return the current owner of an AssetNFT token."""
        return await self.asset_nft.owner_of(token_id)

    async def metadata_uri(self, token_id: int) -> str:
        """Return the metadata URI for an AssetNFT token."""
        return await self.asset_nft.asset_metadata(token_id)
