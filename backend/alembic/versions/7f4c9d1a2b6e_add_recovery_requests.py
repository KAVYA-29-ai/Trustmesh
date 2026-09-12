"""add recovery requests table

Revision ID: 7f4c9d1a2b6e
Revises: 20bfe2e184b5
Create Date: 2026-09-10
"""

from alembic import op
import sqlalchemy as sa


revision = "7f4c9d1a2b6e"
down_revision = "20bfe2e184b5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "recovery_requests",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=64),
            nullable=False,
            server_default="Pending Consensus",
        ),
        sa.Column(
            "approvals",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "required_approvals",
            sa.Integer(),
            nullable=False,
            server_default="2",
        ),
        sa.Column(
            "timelock_hours",
            sa.Integer(),
            nullable=False,
            server_default="48",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("recovery_requests")
