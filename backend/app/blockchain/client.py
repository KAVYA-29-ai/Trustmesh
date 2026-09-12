from typing import Any

from eth_account import Account
from web3 import Web3

from app.blockchain.contracts import ContractConfig, contract_registry
from app.core.config import settings


class BlockchainClient:
    """Web3 access boundary for TrustMesh smart contracts."""

    def __init__(
        self,
        rpc_url: str | None = None,
        expected_chain_id: int | None = None,
    ) -> None:
        self.rpc_url = (
            rpc_url
            or settings.trustmesh_rpc_url
            or settings.polygon_amoy_rpc_url
        )
        self.expected_chain_id = (
            expected_chain_id
            if expected_chain_id is not None
            else settings.trustmesh_chain_id or settings.polygon_chain_id
        )
        self.web3 = Web3(Web3.HTTPProvider(self.rpc_url))

    def is_configured(self) -> bool:
        """Return whether an RPC endpoint is configured."""
        return bool(self.rpc_url)

    def is_connected(self) -> bool:
        """Return whether the configured RPC endpoint is reachable."""
        return self.web3.is_connected()

    def chain_id(self) -> int:
        """Return the connected blockchain network chain ID."""
        return self.web3.eth.chain_id

    def validate_network(self) -> None:
        """Ensure the connected network is the expected blockchain."""
        actual_chain_id = self.chain_id()

        if actual_chain_id != self.expected_chain_id:
            raise RuntimeError(
                f"Wrong blockchain network: expected "
                f"{self.expected_chain_id}, got {actual_chain_id}"
            )

    def contract(
        self,
        contract_config: ContractConfig,
    ):
        """Create a Web3 contract instance from a registered contract."""
        self.validate_network()

        return self.web3.eth.contract(
            address=Web3.to_checksum_address(contract_config.address),
            abi=contract_config.abi,
        )

    async def call(
        self,
        contract_config: ContractConfig,
        function_name: str,
        *args: Any,
    ) -> Any:
        """Execute a read-only smart-contract function."""
        contract = self.contract(contract_config)
        function = getattr(contract.functions, function_name)
        return function(*args).call()

    def send_transaction(
        self,
        contract_config: ContractConfig,
        function_name: str,
        *args: Any,
        function_abi: dict | None = None,
    ) -> str:
        """Sign, submit, and confirm a state-changing contract transaction."""
        if not settings.deployer_private_key:
            raise RuntimeError("DEPLOYER_PRIVATE_KEY is not configured")

        self.validate_network()
        account = Account.from_key(settings.deployer_private_key)

        if function_abi is None:
            contract = self.contract(contract_config)
        else:
            contract = self.web3.eth.contract(
                address=Web3.to_checksum_address(contract_config.address),
                abi=[function_abi],
            )

        function = getattr(contract.functions, function_name)(*args)
        nonce = self.web3.eth.get_transaction_count(account.address, "pending")
        gas_price = self.web3.eth.gas_price
        gas = function.estimate_gas({"from": account.address})
        transaction = function.build_transaction(
            {
                "from": account.address,
                "nonce": nonce,
                "chainId": self.expected_chain_id,
                "gas": gas,
                "gasPrice": gas_price,
            }
        )
        signed = account.sign_transaction(transaction)
        tx_hash = self.web3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)

        if receipt.status != 1:
            raise RuntimeError(f"Blockchain transaction reverted: {tx_hash.hex()}")

        return tx_hash.hex()

    def require_contract(self, name: str) -> ContractConfig:
        """Return a configured contract or raise a clear configuration error."""
        contract = getattr(contract_registry, name, None)

        if contract is None:
            raise RuntimeError(
                f"Contract '{name}' is not configured. "
                f"Deploy the contract and set its address in .env."
            )

        return contract


blockchain_client = BlockchainClient()
