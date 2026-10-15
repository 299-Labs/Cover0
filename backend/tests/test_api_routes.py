# tests/test_api_routes.py
from decimal import Decimal
from app.main import app
from app.auth import get_current_user
from app.models import User, Player


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_check_username_availability(client):
    response = client.get("/api/v1/users/check-username", params={"username": "fresh_handle"})
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is True

    taken = client.get("/api/v1/users/check-username", params={"username": "demo_trader"})
    assert taken.status_code == 200
    assert taken.json()["available"] is False

    invalid = client.get("/api/v1/users/check-username", params={"username": "ab"})
    assert invalid.status_code == 200
    assert invalid.json()["available"] is False


def test_get_market_players(client, db_session):
    player = db_session.query(Player).first()
    response = client.get("/api/v1/market/players")
    assert response.status_code == 200
    players = response.json()
    assert len(players) == 1
    assert players[0]["id"] == str(player.id)


def test_get_user_portfolio(client, db_session):
    user = db_session.query(User).first()
    response = client.get(f"/api/v1/portfolio/{user.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(user.id)
    assert Decimal(str(data["cash_balance"])) == Decimal("100000000.00")
    assert len(data["holdings"]) == 0


def test_delete_my_account_removes_user(client, db_session):
    user = db_session.query(User).first()
    user_id = user.id

    app.dependency_overrides[get_current_user] = lambda: user
    try:
        response = client.delete("/api/v1/users/me")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert db_session.query(User).filter(User.id == user_id).first() is None