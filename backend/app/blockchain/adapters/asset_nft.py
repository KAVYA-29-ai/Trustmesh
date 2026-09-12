from typing import Any

from app.blockchain.client import BlockchainClient


class AssetNFTAdapter:
    """Backend adapter for the TrustMesh AssetNFT contract."""

    CONTRACT_NAME = "asset_nft"

    def __init__(self, client: BlockchainClient) -> None:
        self.client = client

    def _contract_config(self):
        return self.client.require_contract(self.CONTRACT_NAME)

    async def get_asset(self, token_id: int) -> Any:
        """Return the on-chain asset record."""
        return await self.client.call(
            self._contract_config(),
            "getAsset",
            token_id,
        )

    async def asset_did(self, token_id: int) -> bytes:
        """Return the DID hash associated with an asset."""
        return await self.client.call(
            self._contract_config(),
            "assetDID",
            token_id,
        )

    async def asset_metadata(self, token_id: int) -> str:
        """Return the metadata URI associated with an asset."""
        return await self.client.call(
            self._contract_config(),
            "assetMetadata",
            token_id,
        )

    async def asset_exists(self, token_id: int) -> bool:
        """Return whether an asset exists on-chain."""
        return bool(
            await self.client.call(
                self._contract_config(),
                "assetExists",
                token_id,
            )
        )

    async def owner_of(self, token_id: int) -> str:
        """Return the current on-chain owner of an asset."""
        return await self.client.call(
            self._contract_config(),
            "ownerOf",
            token_id,
        )

    async def token_uri(self, token_id: int) -> str:
        """Return the ERC-721 token metadata URI."""
        return await self.client.call(
            self._contract_config(),
            "tokenURI",
            token_id,
        )
