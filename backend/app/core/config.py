from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = "TrustLayer API Gateway"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = False

    database_url: str = (
        "postgresql+psycopg://trustmesh:"
        "trustmesh_dev_password@localhost:5432/trustmesh"
    )

    siwe_chain_id: int = 80002
    siwe_domain: str = "localhost"

    polygon_amoy_rpc_url: str = "https://polygon-amoy-bor-rpc.publicnode.com"
    polygon_chain_id: int = 80002

    trustmesh_local: bool = False
    trustmesh_rpc_url: str | None = None
    trustmesh_chain_id: int | None = None

    deployer_private_key: str | None = None
    did_registry_address: str | None = None
    policy_engine_address: str | None = None
    asset_nft_address: str | None = None
    audit_logger_address: str | None = None

    azure_openai_endpoint: str | None = None
    azure_openai_api_key: str | None = None
    azure_openai_api_version: str = "2024-10-21"
    azure_openai_deployment: str | None = None

    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=(
            REPOSITORY_ROOT / "backend" / ".env",
            REPOSITORY_ROOT / ".env",
            REPOSITORY_ROOT / "deployment" / "local.env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
