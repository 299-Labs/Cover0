from decimal import Decimal
from datetime import datetime
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

# --- TRADE SCHEMAS ---
class TradeRequest(BaseModel):
    user_id: UUID
    player_id: UUID
    side: str = Field(..., pattern="^(BUY|SELL)$", description="Must be 'BUY' or 'SELL'")
    shares: Decimal = Field(..., gt=0, description="Number of shares to trade")

class TradeResponse(BaseModel):
    transaction_id: UUID
    user_id: UUID
    player_id: UUID
    side: str
    shares: Decimal
    execution_price: Decimal
    total_amount: Decimal
    new_cash_balance: Decimal
    timestamp: datetime

class TradePreviewResponse(BaseModel):
    player_id: UUID
    side: str
    shares: Decimal
    current_price: Decimal
    total_amount: Decimal
    execution_price: Decimal
    new_price: Decimal
    price_impact_percent: Decimal

# --- PLAYER SCHEMAS ---
class PricePoint(BaseModel):
    timestamp: datetime
    price: Decimal

class PlayerStatSummary(BaseModel):
    games_played: int = 17
    projected_fpts: float = 285.5
    last_game_fpts: float = 21.4
    touchdowns: int = 12
    primary_stat_label: str = "Yards"
    primary_stat_value: str = "1,240"

class PlayerResponse(BaseModel):
    id: UUID
    external_id: str
    name: str
    position: str
    team: str
    current_price: Decimal
    total_shares_outstanding: Decimal
    headshot_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class PlayerDetailResponse(PlayerResponse):
    price_history: List[PricePoint] = []
    stats: Optional[PlayerStatSummary] = None

# --- USER SCHEMAS ---
class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    cash_balance: Decimal

    model_config = ConfigDict(from_attributes=True)

# --- HOLDING & PORTFOLIO SCHEMAS ---
class HoldingResponse(BaseModel):
    player_id: UUID
    player_name: str
    position: str
    shares_owned: Decimal
    avg_buy_price: Decimal
    current_price: Decimal
    market_value: Decimal
    unrealized_pnl: Decimal
    external_id: Optional[str] = None
    headshot_url: Optional[str] = None

class PortfolioResponse(BaseModel):
    user_id: UUID
    username: str
    cash_balance: Decimal
    total_holdings_value: Decimal
    total_nav: Decimal
    holdings: List[HoldingResponse]


class FriendResponse(BaseModel):
    id: UUID
    friend_id: UUID
    friend_username: str
    friend_nav: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AddFriendRequest(BaseModel):
    user_id: UUID
    friend_username: str


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: UUID
    username: str
    cash_balance: Decimal
    holdings_value: Decimal
    total_nav: Decimal


class TransactionResponse(BaseModel):
    id: UUID
    user_id: UUID
    player_id: UUID
    player_name: str
    player_position: str
    side: str
    shares: Decimal
    price_per_share: Decimal
    total_amount: Decimal
    timestamp: datetime
    external_id: Optional[str] = None
    headshot_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
