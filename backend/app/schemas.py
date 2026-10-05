from decimal import Decimal
from datetime import datetime
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel, Field

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

# --- PLAYER SCHEMAS ---
class PlayerResponse(BaseModel):
    id: UUID
    external_id: str
    name: str
    position: str
    team: str
    current_price: Decimal
    total_shares_outstanding: Decimal

    class Config:
        from_attributes = True

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

class PortfolioResponse(BaseModel):
    user_id: UUID
    username: str
    cash_balance: Decimal
    total_holdings_value: Decimal
    total_nav: Decimal
    holdings: List[HoldingResponse]