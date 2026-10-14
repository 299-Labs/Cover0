"""replace friendships with leagues

Revision ID: 5e9c1f28b4a0
Revises: 4df1798847ac
Create Date: 2026-10-14 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "5e9c1f28b4a0"
down_revision = "4df1798847ac"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Drop old friendships table
    op.drop_table("friendships")

    # 2. Create leagues table
    op.create_table(
        "leagues",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("invite_code", sa.String(length=10), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("invite_code", name="uq_leagues_invite_code"),
    )
    op.create_index(op.f("ix_leagues_invite_code"), "leagues", ["invite_code"], unique=True)

    # 3. Create league_members table
    op.create_table(
        "league_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("league_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("league_id", "user_id", name="unique_league_member"),
    )


def downgrade():
    op.drop_table("league_members")
    op.drop_index(op.f("ix_leagues_invite_code"), table_name="leagues")
    op.drop_table("leagues")

    op.create_table(
        "friendships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("friend_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["friend_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "friend_id", name="unique_friendship"),
        sa.CheckConstraint("user_id != friend_id", name="no_self_friend"),
    )
