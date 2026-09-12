from dataclasses import dataclass
import json
from pathlib import Path

from app.core.config import settings


ABI_DIR = Path(__file__).resolve().parent / "abi"


@dataclass(frozen=True)
class ContractConfig:
    """Runtime configuration for a deployed TrustMesh contract."""

    address: str
    abi: list[dict]


@dataclass(frozen=True)
class ContractRegistry:
    """Collection of TrustMesh contract configurations."""

    did_registry: ContractConfig | None = None
    policy_engine: ContractConfig | None = None
    asset_nft: ContractConfig | None = None
    audit_logger: ContractConfig | None = None


def load_abi(contract_name: str) -> list[dict]:
    """Load a compiled contract ABI from the backend ABI directory."""
    path = ABI_DIR / f"{contract_name}.json"

    if not path.exists():
        raise FileNotFoundError(f"Contract ABI not found: {path}")

    artifact = json.loads(path.read_text())
    return artifact["abi"]


def build_contract_registry() -> ContractRegistry:
    """Build the registry from environment-backed application settings."""

    def contract(address: str | None, name: str) -> ContractConfig | None:
        if not address:
            return None
        return ContractConfig(
            address=address,
            abi=load_abi(name),
        )

    return ContractRegistry(
        did_registry=contract(
            settings.did_registry_address,
            "DIDRegistry",
        ),
        policy_engine=contract(
            settings.policy_engine_address,
            "PolicyEngine",
        ),
        asset_nft=contract(
            settings.asset_nft_address,
            "AssetNFT",
        ),
        audit_logger=contract(
            settings.audit_logger_address,
            "AuditLogger",
        ),
    )


contract_registry = build_contract_registry()
