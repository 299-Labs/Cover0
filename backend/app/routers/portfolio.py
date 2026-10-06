from decimal import Decimal
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/portfolio", tags=["Portfolio"])

@router.get("/{user_id}", response_model=schemas.PortfolioResponse)
def get_portfolio(user_id: UUID, db: Session = Depends(get_db)):
    """Calculates user cash, current holdings valuation, NAV, and position P&L."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    holdings = db.query(models.Holding).filter(models.Holding.user_id == user.id).all()

    total_holdings_value = Decimal("0.00")
    holding_responses = []

    for h in holdings:
        player = db.query(models.Player).filter(models.Player.id == h.player_id).first()
        if not player:
            continue

        shares = Decimal(str(h.shares_owned))
        avg_buy = Decimal(str(h.avg_buy_price))
        current_price = Decimal(str(player.current_price))

        market_value = shares * current_price
        unrealized_pnl = (current_price - avg_buy) * shares
        total_holdings_value += market_value

        holding_responses.append(
            schemas.HoldingResponse(
                player_id=player.id,
                player_name=player.name,
                position=player.position,
                shares_owned=shares,
                avg_buy_price=avg_buy,
                current_price=current_price,
                market_value=market_value,
                unrealized_pnl=unrealized_pnl
            )
        )

    cash = Decimal(str(user.cash_balance))
    total_nav = cash + total_holdings_value

    return schemas.PortfolioResponse(
        user_id=user.id,
        username=user.username,
        cash_balance=cash,
        total_holdings_value=total_holdings_value,
        total_nav=total_nav,
        holdings=holding_responses
    )