# tests/test_trade.py
from decimal import Decimal
from app.models import User, Player, Holding
from app.services import amm


def _expected_buy(user, player, db_session, shares: str):
    players = db_session.query(Player).all()
    return amm.calculate_buy_cost(str(player.id), players, Decimal(shares))


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
    players = db_session.query(Player).all()
    expected = amm.calculate_trade_preview(str(player.id), players, "BUY", Decimal("2"))
    assert Decimal(data["total_amount"]) == Decimal(str(expected["total_amount"]))
    assert Decimal(data["execution_price"]) == Decimal(str(expected["execution_price"]))


def test_trade_execute_buy_and_sell(client, db_session):
    user = db_session.query(User).first()
    player = db_session.query(Player).first()

    # 1. BUY 1 Share
    expected_cost = _expected_buy(user, player, db_session, "1")
    buy_res = client.post("/api/v1/trade/execute", json={
        "user_id": str(user.id),
        "player_id": str(player.id),
        "side": "BUY",
        "shares": "1"
    })
    assert buy_res.status_code == 200
    buy_data = buy_res.json()
    assert Decimal(buy_data["total_amount"]) == Decimal(str(expected_cost))
    assert Decimal(buy_data["new_cash_balance"]) == Decimal("100000000.00") - Decimal(str(expected_cost))

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
    assert Decimal(sell_data["total_amount"]) == Decimal(str(expected_cost))
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
        "shares": "100000"  # Far beyond the $100M balance at ~$1.5M/share
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


def test_trade_history_endpoint(client, db_session):
    user = db_session.query(User).first()
    player = db_session.query(Player).first()

    # Expected cost computed BEFORE execution (state changes after the trade)
    expected_cost = _expected_buy(user, player, db_session, "1")

    # Execute trade
    client.post("/api/v1/trade/execute", json={
        "user_id": str(user.id),
        "player_id": str(player.id),
        "side": "BUY",
        "shares": "1"
    })

    # Fetch trade history
    response = client.get(f"/api/v1/trade/history/{user.id}")
    assert response.status_code == 200
    history = response.json()
    assert len(history) == 1
    assert history[0]["side"] == "BUY"
    assert history[0]["player_name"] == "Patrick Mahomes"
    assert Decimal(history[0]["total_amount"]) == Decimal(str(expected_cost))
