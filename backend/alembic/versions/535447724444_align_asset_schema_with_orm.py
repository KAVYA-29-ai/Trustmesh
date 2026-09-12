"""align asset schema with ORM

Revision ID: 535447724444
Revises: a1e3f6b8c920
Create Date: 2026-09-11
"""

from alembic import op
import sqlalchemy as sa


revision = "535447724444"
down_revision = "a1e3f6b8c920"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "assets",
        sa.Column("metadata_uri", sa.String(1000), nullable=True),
    )
    op.add_column(
        "assets",
        sa.Column("contract_address", sa.String(42), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("assets", "contract_address")
    op.drop_column("assets", "metadata_uri")
