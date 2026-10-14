import uuid
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app import models, schemas
from app.db import get_db
from app.services import amm
from app.utils import get_headshot_url

router = APIRouter(prefix="/api/v1/trade", tags=["Trading"])


@router.post("/preview", response_model=schemas.TradePreviewResponse)
def preview_trade(trade: schemas.TradeRequest, db: Session = Depends(get_db)):
    """Generates real-time price impact, total cost/payout, and execution estimates."""
    all_players = db.query(models.Player).all()
    player_exists = any(str(p.id) == str(trade.player_id) for p in all_players)
    if not player_exists:
        raise HTTPException(status_code=404, detail="Player not found")

    try:
        calc = amm.calculate_trade_preview(
            player_id=str(trade.player_id),
            players=all_players,
            side=trade.side,
            shares=Decimal(str(trade.shares)),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return schemas.TradePreviewResponse(
        player_id=trade.player_id,
        side=trade.side,
        shares=Decimal(str(trade.shares)),
        current_price=calc["current_price"],
        total_amount=calc["total_amount"],
        execution_price=calc["execution_price"],
        new_price=calc["new_price"],
        price_impact_percent=calc["price_impact_percent"],
    )


@router.post("/execute", response_model=schemas.TradeResponse)
def execute_trade(trade: schemas.TradeRequest, db: Session = Depends(get_db)):
    """Executes a BUY or SELL. Locks user + traded player; reads rest of book lock-free."""
    user = db.query(models.User).filter(models.User.id == trade.user_id).with_for_update().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    player = db.query(models.Player).filter(models.Player.id == trade.player_id).with_for_update().first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Lightweight snapshot of the book for the AMM denominator (read-only).
    all_players = db.query(models.Player.id, models.Player.base_price, models.Player.total_shares_outstanding).all()
    pid = str(player.id)
    trade_shares = Decimal(str(trade.shares))
    side = str(trade.side or "").upper()

    try:
        if side == "BUY":
            cost = amm.calculate_buy_cost(pid, all_players, trade_shares)
            if Decimal(str(user.cash_balance)) < cost:
                raise HTTPException(status_code=400, detail="Insufficient cash balance")

            user.cash_balance = Decimal(str(user.cash_balance)) - cost
            player.total_shares_outstanding = Decimal(str(player.total_shares_outstanding)) + trade_shares

            holding = db.query(models.Holding).filter(
                models.Holding.user_id == user.id,
                models.Holding.player_id == player.id,
            ).first()
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

        elif side == "SELL":
            holding = db.query(models.Holding).filter(
                models.Holding.user_id == user.id,
                models.Holding.player_id == player.id,
            ).first()
            if not holding or Decimal(str(holding.shares_owned)) < trade_shares:
                raise HTTPException(status_code=400, detail="Insufficient shares owned")

            proceeds = amm.calculate_sell_return(pid, all_players, trade_shares)

            user.cash_balance = Decimal(str(user.cash_balance)) + proceeds
            player.total_shares_outstanding = Decimal(str(player.total_shares_outstanding)) - trade_shares

            holding.shares_owned = Decimal(str(holding.shares_owned)) - trade_shares
            if holding.shares_owned == Decimal("0"):
                db.delete(holding)

            execution_amount = proceeds
        else:
            raise HTTPException(status_code=400, detail="Side must be BUY or SELL")

        # Persist ONLY the traded player's new spot (computed on POST-trade supply).
        post_players = db.query(models.Player.id, models.Player.base_price, models.Player.total_shares_outstanding).all()
        player.current_price = amm.calculate_single_spot_price(pid, post_players)

        now = datetime.now(timezone.utc)
        price_per_share = execution_amount / trade_shares

        transaction = models.Transaction(
            user_id=user.id,
            player_id=player.id,
            side=side,
            shares=trade_shares,
            price_per_share=price_per_share,
            total_amount=execution_amount,
            timestamp=now,
        )
        db.add(transaction)

        db.commit()
        db.refresh(transaction)
        db.refresh(player)

        return schemas.TradeResponse(
            transaction_id=transaction.id,
            user_id=user.id,
            player_id=player.id,
            side=side,
            shares=trade_shares,
            execution_price=price_per_share,
            total_amount=execution_amount,
            new_cash_balance=user.cash_balance,
            timestamp=transaction.timestamp,
        )
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history/{user_id}", response_model=List[schemas.TransactionResponse])
def get_trade_history(user_id: UUID, db: Session = Depends(get_db)):
    transactions = (
        db.query(models.Transaction)
        .filter(models.Transaction.user_id == user_id)
        .order_by(models.Transaction.timestamp.desc())
        .all()
    )

    res = []
    for tx in transactions:
        res.append(
            schemas.TransactionResponse(
                id=tx.id,
                user_id=tx.user_id,
                player_id=tx.player_id,
                player_name=tx.player.name,
                player_position=tx.player.position,
                side=tx.side,
                shares=tx.shares,
                price_per_share=tx.price_per_share,
                total_amount=tx.total_amount,
                timestamp=tx.timestamp,
                external_id=tx.player.external_id,
                headshot_url=get_headshot_url(tx.player.external_id),
            )
        )

    return res