from typing import Any

from app.blockchain.client import BlockchainClient


class AuditLoggerAdapter:
    """Backend adapter for the TrustMesh AuditLogger contract."""

    CONTRACT_NAME = "audit_logger"

    def __init__(self, client: BlockchainClient) -> None:
        self.client = client

    def _contract_config(self):
        return self.client.require_contract(self.CONTRACT_NAME)

    async def is_authorized_logger(self, logger: str) -> bool:
        """Return whether an address is authorized to write audit records."""
        return bool(
            await self.client.call(
                self._contract_config(),
                "isAuthorizedLogger",
                logger,
            )
        )

    async def authorized_logger(self, logger: str) -> bool:
        """Return the authorization status stored for a logger address."""
        return bool(
            await self.client.call(
                self._contract_config(),
                "authorizedLogger",
                logger,
            )
        )

    async def admin(self) -> str:
        """Return the AuditLogger administrator address."""
        return await self.client.call(
            self._contract_config(),
            "admin",
        )
