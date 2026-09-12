from typing import Any

from app.blockchain.client import BlockchainClient


class DIDRegistryAdapter:
    """Backend adapter for the TrustMesh DIDRegistry contract."""

    CONTRACT_NAME = "did_registry"

    def __init__(self, client: BlockchainClient) -> None:
        self.client = client

    def _contract_config(self):
        return self.client.require_contract(self.CONTRACT_NAME)

    async def resolve_did(self, did: str) -> Any:
        """Resolve a DID document from the blockchain."""
        return await self.client.call(
            self._contract_config(),
            "resolveDID",
            did,
        )

    async def is_active(self, did: str) -> bool:
        """Return whether a DID is currently active."""
        return bool(
            await self.client.call(
                self._contract_config(),
                "isActive",
                did,
            )
        )

    async def get_did_hash(self, did: str) -> bytes:
        """Return the deterministic on-chain hash of a DID."""
        return await self.client.call(
            self._contract_config(),
            "getDIDHash",
            did,
        )
