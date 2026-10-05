import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    cash_balance = Column(Numeric(14, 2), nullable=False, default=100000000.00) # $100M
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    holdings = relationship("Holding", back_populates="user", cascade="all, delete-orphan")

class Player(Base):
    __tablename__ = "players"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    position = Column(String(10), nullable=False)
    team = Column(String(10), nullable=False)
    current_price = Column(Numeric(12, 2), nullable=False, default=10000000.00) # $10M
    total_shares_outstanding = Column(Numeric(14, 4), nullable=False, default=1000.00)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    holdings = relationship("Holding", back_populates="player", cascade="all, delete-orphan")

class Holding(Base):
    __tablename__ = "holdings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    player_id = Column(UUID(as_uuid=True), ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    shares_owned = Column(Numeric(12, 4), nullable=False, default=0.0000)
    avg_buy_price = Column(Numeric(12, 2), nullable=False, default=0.00)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="holdings")
    player = relationship("Player", back_populates="holdings")

    __table_args__ = (
        UniqueConstraint("user_id", "player_id", name="unique_user_player"),
    )

class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    friend_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "friend_id", name="unique_friendship"),
        CheckConstraint("user_id != friend_id", name="no_self_friend"),
    )