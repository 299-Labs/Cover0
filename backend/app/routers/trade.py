import uuid
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app import models, schemas
from app.services import amm

router = APIRouter(prefix="/api/v1/trade", tags=["Trading"])


@router.post("/preview", response_model=schemas.TradePreviewResponse)
def preview_trade(trade: schemas.TradeRequest, db: Session = Depends(get_db)):
    """Generates real-time price impact, total cost/payout, and execution estimates."""
    player = db.query(models.Player).filter(models.Player.id == trade.player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    current_shares = Decimal(str(player.total_shares_outstanding))
    trade_shares = Decimal(str(trade.shares))

    if trade.side == "SELL" and trade_shares > current_shares:
        raise HTTPException(
            status_code=400, detail="Cannot sell more shares than total circulating supply"
        )

    calc = amm.calculate_trade_preview(current_shares, trade.side, trade_shares)

    return schemas.TradePreviewResponse(
        player_id=player.id,
        side=trade.side,
        shares=trade_shares,
        current_price=calc["current_price"],
        total_amount=calc["total_amount"],
        execution_price=calc["execution_price"],
        new_price=calc["new_price"],
        price_impact_percent=calc["price_impact_percent"],
    )


@router.post("/execute", response_model=schemas.TradeResponse)
def execute_trade(trade: schemas.TradeRequest, db: Session = Depends(get_db)):
    """Executes a BUY or SELL market order against the AMM bonding curve atomically."""
    user = db.query(models.User).filter(models.User.id == trade.user_id).with_for_update().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    player = db.query(models.Player).filter(models.Player.id == trade.player_id).with_for_update().first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    holding = db.query(models.Holding).filter(
        models.Holding.user_id == user.id,
        models.Holding.player_id == player.id
    ).first()

    current_shares = Decimal(str(player.total_shares_outstanding))
    trade_shares = Decimal(str(trade.shares))

    if trade.side == "BUY":
        cost = amm.calculate_buy_cost(current_shares, trade_shares)
        if Decimal(str(user.cash_balance)) < cost:
            raise HTTPException(status_code=400, detail="Insufficient cash balance")

        user.cash_balance = Decimal(str(user.cash_balance)) - cost
        player.total_shares_outstanding = current_shares + trade_shares

        if not holding:
            holding = models.Holding(
                user_id=user.id,
                player_id=player.id,
                shares_owned=trade_shares,
                avg_buy_price=cost / trade_shares,
            )
            db.add(holding)
        else:
            old_shares = Decimal(str(holding.shares_owned))
            old_cost = old_shares * Decimal(str(holding.avg_buy_price))
            new_total_shares = old_shares + trade_shares
            holding.shares_owned = new_total_shares
            holding.avg_buy_price = (old_cost + cost) / new_total_shares

        execution_amount = cost

    else:  # SELL
        if not holding or Decimal(str(holding.shares_owned)) < trade_shares:
            raise HTTPException(status_code=400, detail="Insufficient shares owned")

        proceeds = amm.calculate_sell_return(current_shares, trade_shares)

        user.cash_balance = Decimal(str(user.cash_balance)) + proceeds
        player.total_shares_outstanding = current_shares - trade_shares

        holding.shares_owned = Decimal(str(holding.shares_owned)) - trade_shares
        if holding.shares_owned == Decimal("0"):
            db.delete(holding)

        execution_amount = proceeds

    # Update spot price based on new supply
    player.current_price = amm.calculate_spot_price(Decimal(str(player.total_shares_outstanding)))

    db.commit()

    return schemas.TradeResponse(
        transaction_id=uuid.uuid4(),
        user_id=user.id,
        player_id=player.id,
        side=trade.side,
        shares=trade_shares,
        execution_price=execution_amount / trade_shares,
        total_amount=execution_amount,
        new_cash_balance=user.cash_balance,
        timestamp=datetime.now(timezone.utc),
    )