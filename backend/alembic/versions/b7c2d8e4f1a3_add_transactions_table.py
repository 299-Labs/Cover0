"""add transactions table

Revision ID: b7c2d8e4f1a3
Revises: 7bf2064872a4
Create Date: 2026-10-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c2d8e4f1a3'
down_revision: Union[str, Sequence[str], None] = '7bf2064872a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('transactions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('player_id', sa.UUID(), nullable=False),
    sa.Column('side', sa.String(length=10), nullable=False),
    sa.Column('shares', sa.Numeric(precision=12, scale=4), nullable=False),
    sa.Column('price_per_share', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('total_amount', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('transactions')