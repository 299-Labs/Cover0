import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app import models, schemas
from app.services import amm

router = APIRouter(prefix="/api/v1/trade", tags=["Trading"])

@router.post("/execute", response_model=schemas.TradeResponse)
def execute_trade(trade: schemas.TradeRequest, db: Session = Depends(get_db)):
    """Executes a BUY or SELL market order against the AMM bonding curve."""
    # 1. Fetch user and player with row locking to avoid race conditions
    user = db.query(models.User).filter(models.User.id == trade.user_id).with_for_update().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    player = db.query(models.Player).filter(models.Player.id == trade.player_id).with_for_update().first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # 2. Fetch or initialize holding
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

        # Deduct cash & increase outstanding supply
        user.cash_balance = Decimal(str(user.cash_balance)) - cost
        player.total_shares_outstanding = current_shares + trade_shares
        
        # Update holding
        if not holding:
            holding = models.Holding(
                user_id=user.id,
                player_id=player.id,
                shares_owned=trade_shares,
                avg_buy_price=cost / trade_shares
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

        # Add cash & decrease outstanding supply
        user.cash_balance = Decimal(str(user.cash_balance)) + proceeds
        player.total_shares_outstanding = current_shares - trade_shares

        # Update holding
        holding.shares_owned = Decimal(str(holding.shares_owned)) - trade_shares
        if holding.shares_owned == Decimal("0"):
            db.delete(holding)

        execution_amount = proceeds

    # 3. Update player spot price based on new circulating supply
    player.current_price = amm.calculate_spot_price(Decimal(str(player.total_shares_outstanding)))

    db.commit()

    return schemas.TradeResponse(
        transaction_id=uuid.uuid4(),
        user_id=user.id,
        player_id=player.id,
        side=trade.side,
        shares=trade_shares,
        execution_price=player.current_price,
        total_amount=execution_amount,
        new_cash_balance=user.cash_balance,
        timestamp=player.created_at
    )