"""align audit events schema with ORM model

Revision ID: 8c1d4e7f9a20
Revises: 7f4c9d1a2b6e
Create Date: 2026-09-10
"""

from alembic import op
import sqlalchemy as sa


revision = "8c1d4e7f9a20"
down_revision = "7f4c9d1a2b6e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "audit_events",
        "event_type",
        new_column_name="event_name",
        existing_type=sa.String(length=100),
        type_=sa.String(length=150),
    )

    op.alter_column(
        "audit_events",
        "tx_hash",
        new_column_name="transaction_hash",
        existing_type=sa.String(length=100),
    )

    op.alter_column(
        "audit_events",
        "payload_json",
        new_column_name="data",
        existing_type=sa.JSON(),
    )

    op.add_column(
        "audit_events",
        sa.Column(
            "contract_address",
            sa.String(length=42),
            nullable=True,
        ),
    )

    op.add_column(
        "audit_events",
        sa.Column(
            "log_index",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.drop_column("audit_events", "actor")
    op.drop_column("audit_events", "subject")


def downgrade() -> None:
    op.add_column(
        "audit_events",
        sa.Column(
            "actor",
            sa.String(length=255),
            nullable=False,
            server_default="unknown",
        ),
    )

    op.add_column(
        "audit_events",
        sa.Column(
            "subject",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.drop_column("audit_events", "log_index")
    op.drop_column("audit_events", "contract_address")

    op.alter_column(
        "audit_events",
        "data",
        new_column_name="payload_json",
        existing_type=sa.JSON(),
    )

    op.alter_column(
        "audit_events",
        "transaction_hash",
        new_column_name="tx_hash",
        existing_type=sa.String(length=100),
    )

    op.alter_column(
        "audit_events",
        "event_name",
        new_column_name="event_type",
        existing_type=sa.String(length=150),
        type_=sa.String(length=100),
    )
