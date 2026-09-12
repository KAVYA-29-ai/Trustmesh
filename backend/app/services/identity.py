from typing import Any

from app.blockchain.adapters.did_registry import DIDRegistryAdapter


class IdentityService:
    """Application service for blockchain-backed decentralized identity."""

    def __init__(self, did_registry: DIDRegistryAdapter):
        self.did_registry = did_registry

    async def resolve_did(self, did: str) -> Any:
        """Resolve a DID document from DIDRegistry."""
        return await self.did_registry.resolve_did(did)

    async def is_active(self, did: str) -> bool:
        """Return whether a DID is active on-chain."""
        return await self.did_registry.is_active(did)

    async def get_did_hash(self, did: str) -> bytes:
        """Return the deterministic on-chain DID hash."""
        return await self.did_registry.get_did_hash(did)
