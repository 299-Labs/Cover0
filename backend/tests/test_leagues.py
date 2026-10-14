# tests/test_leagues.py
from decimal import Decimal

from app.models import League, LeagueMember, User, UserWeeklyScore


def _create_league(client, user_id, name="Sunday Degens"):
    resp = client.post("/api/v1/leagues", json={"name": name, "user_id": str(user_id)})
    assert resp.status_code == 201
    return resp.json()


def test_create_league_adds_creator_as_member(client, db_session):
    user = db_session.query(User).first()
    data = _create_league(client, user.id)
    assert data["name"] == "Sunday Degens"
    assert len(data["invite_code"]) == 6
    assert data["member_count"] == 1
    assert data["created_by"] == str(user.id)

    membership = (
        db_session.query(LeagueMember)
        .filter(LeagueMember.user_id == user.id)
        .first()
    )
    assert membership is not None


def test_create_league_unknown_user_404(client):
    resp = client.post(
        "/api/v1/leagues",
        json={"name": "Ghost League", "user_id": "00000000-0000-0000-0000-000000000000"},
    )
    assert resp.status_code == 404


def test_join_league_and_duplicate_and_bad_code(client, db_session):
    creator = db_session.query(User).first()
    league = _create_league(client, creator.id)

    joiner = User(
        username="rival_trader",
        email="rival@cover0.app",
        cash_balance=Decimal("100000000.00"),
    )
    db_session.add(joiner)
    db_session.commit()
    db_session.refresh(joiner)

    resp = client.post(
        "/api/v1/leagues/join",
        json={"invite_code": league["invite_code"], "user_id": str(joiner.id)},
    )
    assert resp.status_code == 200
    assert resp.json()["member_count"] == 2

    dup = client.post(
        "/api/v1/leagues/join",
        json={"invite_code": league["invite_code"], "user_id": str(joiner.id)},
    )
    assert dup.status_code == 400

    bad = client.post(
        "/api/v1/leagues/join",
        json={"invite_code": "XXXXXX", "user_id": str(joiner.id)},
    )
    assert bad.status_code == 404


def test_user_leagues_listing(client, db_session):
    user = db_session.query(User).first()
    created = _create_league(client, user.id)
    resp = client.get(f"/api/v1/leagues/user/{user.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["invite_code"] == created["invite_code"]
    assert data[0]["member_count"] == 1


def test_league_leaderboard_scoped_to_members(client, db_session, monkeypatch):
    monkeypatch.setattr(
        "app.services.sleeper.get_nfl_state", lambda: {"season": "2026", "week": 1}
    )

    creator = db_session.query(User).first()
    league_json = _create_league(client, creator.id)
    league = (
        db_session.query(League)
        .filter(League.invite_code == league_json["invite_code"])
        .first()
    )

    member = User(
        username="league_member",
        email="member@cover0.app",
        cash_balance=Decimal("50000000.00"),
    )
    db_session.add(member)
    db_session.commit()
    db_session.refresh(member)
    db_session.add(LeagueMember(league_id=league.id, user_id=member.id))
    db_session.add(
        UserWeeklyScore(
            user_id=member.id, season="2026", week=1, fpts=Decimal("123.45")
        )
    )
    db_session.commit()

    # Non-member with huge NAV + score must NOT appear on the scoped board
    outsider = User(
        username="outsider",
        email="outsider@cover0.app",
        cash_balance=Decimal("900000000.00"),
    )
    db_session.add(outsider)
    db_session.commit()
    db_session.add(
        UserWeeklyScore(
            user_id=outsider.id, season="2026", week=1, fpts=Decimal("200.00")
        )
    )
    db_session.commit()

    rows = client.get(f"/api/v1/leagues/{league.id}/leaderboard?sort_by=weekly").json()
    usernames = [r["username"] for r in rows]
    assert "outsider" not in usernames
    assert set(usernames) == {"demo_trader", "league_member"}
    # Weekly sort: league_member (123.45) ranks above demo_trader (0.00)
    assert rows[0]["username"] == "league_member"
    assert rows[0]["rank"] == 1
    assert Decimal(str(rows[0]["weekly_fpts"])) == Decimal("123.45")
    assert rows[1]["rank"] == 2

    nav_rows = client.get(f"/api/v1/leagues/{league.id}/leaderboard?sort_by=nav").json()
    assert nav_rows[0]["username"] == "demo_trader"  # $100M > $50M

    missing = client.get(
        "/api/v1/leagues/00000000-0000-0000-0000-000000000000/leaderboard"
    )
    assert missing.status_code == 404


def test_friends_endpoints_removed(client):
    assert client.get("/api/v1/friends/anything").status_code == 404
    assert client.post("/api/v1/friends", json={}).status_code == 404
