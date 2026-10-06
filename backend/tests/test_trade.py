# tests/test_trade.py
from decimal import Decimal
from app.models import User, Player, Holding


def test_trade_preview_endpoint(client, db_session):
    player = db_session.query(Player).first()
    user = db_session.query(User).first()

    response = client.post("/api/v1/trade/preview", json={
        "user_id": str(user.id),
        "player_id": str(player.id),
        "side": "BUY",
        "shares": "2"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["player_id"] == str(player.id)
    assert data["side"] == "BUY"
    assert Decimal(data["total_amount"]) == Decimal("20010000.00")
    assert Decimal(data["execution_price"]) == Decimal("10005000.00")


def test_trade_execute_buy_and_sell(client, db_session):
    user = db_session.query(User).first()
    player = db_session.query(Player).first()

    # 1. BUY 1 Share
    buy_res = client.post("/api/v1/trade/execute", json={
        "user_id": str(user.id),
        "player_id": str(player.id),
        "side": "BUY",
        "shares": "1"
    })
    assert buy_res.status_code == 200
    buy_data = buy_res.json()
    assert Decimal(buy_data["total_amount"]) == Decimal("10002500.00")
    assert Decimal(buy_data["new_cash_balance"]) == Decimal("89997500.00")

    holding = db_session.query(Holding).filter_by(user_id=user.id, player_id=player.id).first()
    assert holding is not None
    assert Decimal(str(holding.shares_owned)) == Decimal("1")

    # 2. SELL 1 Share back
    sell_res = client.post("/api/v1/trade/execute", json={
        "user_id": str(user.id),
        "player_id": str(player.id),
        "side": "SELL",
        "shares": "1"
    })
    assert sell_res.status_code == 200
    sell_data = sell_res.json()
    assert Decimal(sell_data["total_amount"]) == Decimal("10002500.00")
    assert Decimal(sell_data["new_cash_balance"]) == Decimal("100000000.00")

    holding_after = db_session.query(Holding).filter_by(user_id=user.id, player_id=player.id).first()
    assert holding_after is None


def test_trade_execute_insufficient_cash(client, db_session):
    user = db_session.query(User).first()
    player = db_session.query(Player).first()

    res = client.post("/api/v1/trade/execute", json={
        "user_id": str(user.id),
        "player_id": str(player.id),
        "side": "BUY",
        "shares": "10"  # Requires $100.25M > $100M balance
    })
    assert res.status_code == 400
    assert "Insufficient cash balance" in res.json()["detail"]


def test_trade_execute_insufficient_holdings(client, db_session):
    user = db_session.query(User).first()
    player = db_session.query(Player).first()

    res = client.post("/api/v1/trade/execute", json={
        "user_id": str(user.id),
        "player_id": str(player.id),
        "side": "SELL",
        "shares": "1"
    })
    assert res.status_code == 400
    assert "Insufficient shares owned" in res.json()["detail"]