"""align security findings schema with ORM model

Revision ID: 9d2e5f8a1b30
Revises: 8c1d4e7f9a20
Create Date: 2026-09-10
"""

from alembic import op
import sqlalchemy as sa


revision = "9d2e5f8a1b30"
down_revision = "8c1d4e7f9a20"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "security_findings",
        sa.Column(
            "event_name",
            sa.String(length=150),
            nullable=True,
        ),
    )

    op.add_column(
        "security_findings",
        sa.Column(
            "threat_detected",
            sa.Boolean(),
            nullable=True,
        ),
    )

    op.add_column(
        "security_findings",
        sa.Column(
            "reason",
            sa.Text(),
            nullable=True,
        ),
    )

    op.add_column(
        "security_findings",
        sa.Column(
            "recommendation",
            sa.Text(),
            nullable=True,
        ),
    )

    op.execute(
        """
        UPDATE security_findings
        SET
            event_name = COALESCE(category, 'Unknown'),
            threat_detected = CASE
                WHEN risk_score > 0 THEN TRUE
                ELSE FALSE
            END,
            reason = description,
            recommendation = 'Review the security finding.'
        """
    )

    op.alter_column(
        "security_findings",
        "event_name",
        nullable=False,
    )

    op.alter_column(
        "security_findings",
        "threat_detected",
        nullable=False,
    )

    op.alter_column(
        "security_findings",
        "reason",
        nullable=False,
    )

    op.alter_column(
        "security_findings",
        "recommendation",
        nullable=False,
    )

    op.drop_column("security_findings", "organization_id")
    op.drop_column("security_findings", "category")
    op.drop_column("security_findings", "description")


def downgrade() -> None:
    op.add_column(
        "security_findings",
        sa.Column(
            "organization_id",
            sa.String(length=64),
            nullable=True,
        ),
    )

    op.add_column(
        "security_findings",
        sa.Column(
            "category",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "security_findings",
        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),
    )

    op.execute(
        """
        UPDATE security_findings
        SET
            category = event_name,
            description = reason
        """
    )

    op.alter_column(
        "security_findings",
        "category",
        nullable=False,
    )

    op.alter_column(
        "security_findings",
        "description",
        nullable=False,
    )

    op.drop_column("security_findings", "recommendation")
    op.drop_column("security_findings", "reason")
    op.drop_column("security_findings", "threat_detected")
    op.drop_column("security_findings", "event_name")


# Repository normalization is handled in application code.
