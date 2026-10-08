from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.db import get_db
from app import models, schemas
from app.routers.market import get_headshot_url
from decimal import Decimal

router = APIRouter(prefix="/api/v1/portfolio", tags=["Portfolio"])

@router.get("/{user_id}", response_model=schemas.PortfolioResponse)
def get_portfolio(user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    holdings_response = []
    total_holdings_value = Decimal("0.00")

    for holding in user.holdings:
        player = holding.player
        current_price = player.current_price
        market_value = holding.shares_owned * current_price
        unrealized_pnl = (current_price - holding.avg_buy_price) * holding.shares_owned

        total_holdings_value += market_value

        holdings_response.append(
            schemas.HoldingResponse(
                player_id=player.id,
                player_name=player.name,
                position=player.position,
                shares_owned=holding.shares_owned,
                avg_buy_price=holding.avg_buy_price,
                current_price=current_price,
                market_value=market_value,
                unrealized_pnl=unrealized_pnl,
                external_id=player.external_id,
                headshot_url=get_headshot_url(player.external_id),
            )
        )

    total_nav = user.cash_balance + total_holdings_value

    return schemas.PortfolioResponse(
        user_id=user.id,
        username=user.username,
        cash_balance=user.cash_balance,
        total_holdings_value=total_holdings_value,
        total_nav=total_nav,
        holdings=holdings_response,
    )