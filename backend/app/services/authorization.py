from web3 import Web3

from app.blockchain.adapters.policy_engine import PolicyEngineAdapter


class AuthorizationService:
    """Application service for blockchain-backed authorization checks."""

    def __init__(self, policy_engine: PolicyEngineAdapter):
        self.policy_engine = policy_engine

    @staticmethod
    def _identifier_hash(value: str) -> bytes:
        """Convert an application identifier into the PolicyEngine bytes32 ID."""
        return Web3.keccak(text=value)

    async def check_access(
        self,
        org_id: str,
        subject: str,
        role: str,
        resource_id: str,
        action: str,
    ) -> bool:
        """Check access through the on-chain PolicyEngine."""
        del role
        org_hash = self._identifier_hash(org_id)
        resource_hash = self._identifier_hash(resource_id)

        return await self.policy_engine.has_permission(
            org_hash,
            subject,
            resource_hash,
            action,
        )
