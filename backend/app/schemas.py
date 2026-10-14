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

class PlayerBio(BaseModel):
    age: Optional[int] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    college: Optional[str] = None
    years_exp: Optional[int] = None
    number: Optional[int] = None
    status: Optional[str] = "Active"
    injury_status: Optional[str] = None
    injury_notes: Optional[str] = None


class OwnershipMetrics(BaseModel):
    total_shares_outstanding: Decimal
    platform_user_holders: int
    platform_ownership_pct: float


class MarketRankings(BaseModel):
    fpts_rank: int
    ownership_rank: int
    value_rank: int  # Current FPTS / Spot Price ratio
    proj_value_rank: int  # Projected FPTS / Spot Price ratio


class StatBreakdown(BaseModel):
    pts_ppr: float = 0.0
    pass_att: float = 0
    pass_cmp: float = 0
    pass_yd: float = 0
    pass_td: float = 0
    pass_int: float = 0
    rush_att: float = 0
    rush_yd: float = 0
    rush_td: float = 0
    rec_target: float = 0
    rec: float = 0
    rec_yd: float = 0
    rec_td: float = 0
    fum_lost: float = 0


class GameLogEntry(BaseModel):
    season: str = "2026"
    week: int
    opponent: str
    pts_ppr: float
    pass_cmp: int
    pass_att: int
    pass_yd: int
    pass_td: int
    rush_att: int
    rush_yd: int
    rush_td: int
    rec_target: int = 0
    rec: int
    rec_yd: int
    rec_td: int


class PastSeasonSummary(BaseModel):
    season: str
    team: str
    games_played: int
    pts_ppr: float
    pass_cmp: int = 0
    pass_att: int = 0
    pass_yd: int = 0
    pass_td: int = 0
    pass_int: int = 0
    rush_att: int = 0
    rush_yd: int = 0
    rush_td: int = 0
    rec_target: int = 0
    rec: int = 0
    rec_yd: int = 0
    rec_td: int = 0


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
    current_week: int = 1
    bio: Optional[PlayerBio] = None
    ownership: Optional[OwnershipMetrics] = None
    rankings: Optional[MarketRankings] = None
    price_history: List[PricePoint] = []
    stats: Optional[PlayerStatSummary] = None
    season_actual_stats: Optional[StatBreakdown] = None
    weekly_projected_stats: Optional[StatBreakdown] = None
    season_projected_stats: Optional[StatBreakdown] = None
    game_logs: List[GameLogEntry] = []
    past_seasons: List[PastSeasonSummary] = []

# --- USER SCHEMAS ---
class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    cash_balance: Decimal

    model_config = ConfigDict(from_attributes=True)

class UserProfileResponse(BaseModel):
    id: UUID
    username: str
    email: str
    avatar_url: Optional[str] = None
    cash_balance: Decimal
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    
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


# --- LEAGUE SCHEMAS ---
class LeagueCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    user_id: UUID

class LeagueJoinRequest(BaseModel):
    invite_code: str = Field(..., min_length=3, max_length=10)
    user_id: UUID

class LeagueResponse(BaseModel):
    id: UUID
    name: str
    invite_code: str
    created_by: UUID
    member_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: UUID
    username: str
    cash_balance: Decimal
    holdings_value: Decimal
    total_nav: Decimal
    weekly_fpts: Decimal
    season_fpts: Decimal

    model_config = ConfigDict(from_attributes=True)


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
