"""align SIWE nonce schema with ORM model

Revision ID: a1e3f6b8c920
Revises: 9d2e5f8a1b30
Create Date: 2026-09-10
"""

from alembic import op
import sqlalchemy as sa


revision = "a1e3f6b8c920"
down_revision = "9d2e5f8a1b30"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "siwe_nonces",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "siwe_nonces",
        sa.Column(
            "consumed",
            sa.Boolean(),
            nullable=True,
            server_default=sa.false(),
        ),
    )

    op.execute(
        """
        UPDATE siwe_nonces
        SET
            created_at = expires_at - INTERVAL '10 minutes',
            consumed = COALESCE(used, FALSE)
        """
    )

    op.alter_column(
        "siwe_nonces",
        "created_at",
        nullable=False,
    )

    op.alter_column(
        "siwe_nonces",
        "consumed",
        nullable=False,
        server_default=None,
    )

    op.drop_column("siwe_nonces", "used")


def downgrade() -> None:
    op.add_column(
        "siwe_nonces",
        sa.Column(
            "used",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    op.execute(
        """
        UPDATE siwe_nonces
        SET used = consumed
        """
    )

    op.drop_column("siwe_nonces", "consumed")
    op.drop_column("siwe_nonces", "created_at")
