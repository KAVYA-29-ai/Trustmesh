from typing import Any

from app.blockchain.client import BlockchainClient


class PolicyEngineAdapter:
    """Backend adapter for the TrustMesh PolicyEngine contract."""

    CONTRACT_NAME = "policy_engine"

    _SET_RESOURCE_FREEZE_ABI = {
        "type": "function",
        "name": "setResourceFreeze",
        "stateMutability": "nonpayable",
        "inputs": [
            {"type": "bytes32", "name": "orgId"},
            {"type": "address", "name": "did"},
            {"type": "bytes32", "name": "resourceId"},
            {"type": "bool", "name": "frozen"},
        ],
        "outputs": [],
    }

    def __init__(self, client: BlockchainClient) -> None:
        self.client = client

    def _contract_config(self):
        return self.client.require_contract(self.CONTRACT_NAME)

    async def get_user_role(self, org_id: bytes, subject: str) -> bytes:
        """Return the role assigned to an address."""
        return await self.client.call(
            self._contract_config(),
            "roleAssignments",
            org_id,
            subject,
        )

    async def get_role(self, role_id: bytes) -> Any:
        """Return role existence and metadata."""
        return await self.client.call(
            self._contract_config(),
            "getRole",
            role_id,
        )

    async def has_permission(
        self,
        org_id: bytes,
        subject: str,
        resource_id: bytes,
        action: str,
    ) -> bool:
        """Perform the contract's read-only authorization check."""
        return bool(
            await self.client.call(
                self._contract_config(),
                "checkAccess",
                org_id,
                subject,
                resource_id,
                action,
            )
        )

    async def check_access(
        self,
        org_id: bytes,
        subject: str,
        resource_id: bytes,
        action: str,
    ) -> Any:
        """
        Execute the PolicyEngine access-check transaction.

        This function is intentionally not treated as a read-only call because
        the Solidity contract records AccessGranted/AccessDenied audit events.
        """
        contract_config = self._contract_config()
        contract = self.client.contract(contract_config)

        return getattr(contract.functions, "checkAccess")(
            org_id,
            subject,
            resource_id,
            action,
        )

    def set_resource_freeze(
        self,
        org_id: bytes,
        did: str,
        resource_id: bytes,
        frozen: bool,
    ) -> str:
        """Freeze or unfreeze one identity/resource pair on-chain."""
        return self.client.send_transaction(
            self._contract_config(),
            "setResourceFreeze",
            org_id,
            did,
            resource_id,
            frozen,
            function_abi=self._SET_RESOURCE_FREEZE_ABI,
        )
