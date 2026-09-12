"""create TrustMesh persistence schema

Revision ID: 20bfe2e184b5
Revises:
Create Date: 2026-09-10 17:30:20.073191
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20bfe2e184b5"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "identities",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "organization_id",
            sa.String(64),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column("wallet_address", sa.String(42), nullable=False),
        sa.Column("did", sa.String(255)),
        sa.Column("verification_key", sa.Text),
        sa.Column("active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "roles",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "organization_id",
            sa.String(64),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text),
    )

    op.create_table(
        "permissions",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "organization_id",
            sa.String(64),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("description", sa.Text),
    )

    op.create_table(
        "resources",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "organization_id",
            sa.String(64),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("resource_type", sa.String(100), nullable=False),
        sa.Column("identifier", sa.String(500), nullable=False),
        sa.Column("metadata_json", sa.JSON, nullable=False),
    )

    op.create_table(
        "assets",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "organization_id",
            sa.String(64),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column("token_id", sa.String(100)),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("owner_did", sa.String(255)),
        sa.Column("metadata_json", sa.JSON, nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
    )

    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column(
            "organization_id",
            sa.String(64),
            sa.ForeignKey("organizations.id"),
            nullable=True,
        ),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("actor", sa.String(255), nullable=False),
        sa.Column("subject", sa.String(255)),
        sa.Column("tx_hash", sa.String(100)),
        sa.Column("block_number", sa.BigInteger),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload_json", sa.JSON, nullable=False),
    )

    op.create_table(
        "security_findings",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "organization_id",
            sa.String(64),
            sa.ForeignKey("organizations.id"),
            nullable=True,
        ),
        sa.Column("severity", sa.String(50), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("risk_score", sa.Integer, nullable=False),
        sa.Column("event_id", sa.String(128)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "siwe_nonces",
        sa.Column("nonce", sa.String(128), primary_key=True),
        sa.Column("address", sa.String(42), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean, nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "auth_sessions",
        sa.Column("session_id", sa.String(128), primary_key=True),
        sa.Column("address", sa.String(42), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean, nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_table("auth_sessions")
    op.drop_table("siwe_nonces")
    op.drop_table("security_findings")
    op.drop_table("audit_events")
    op.drop_table("assets")
    op.drop_table("resources")
    op.drop_table("permissions")
    op.drop_table("roles")
    op.drop_table("identities")
    op.drop_table("organizations")
