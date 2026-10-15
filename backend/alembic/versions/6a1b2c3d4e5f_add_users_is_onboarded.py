"""add users.is_onboarded

Revision ID: 6a1b2c3d4e5f
Revises: 5e9c1f28b4a0
Create Date: 2026-10-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "6a1b2c3d4e5f"
down_revision = "5e9c1f28b4a0"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("is_onboarded", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade():
    op.drop_column("users", "is_onboarded")
