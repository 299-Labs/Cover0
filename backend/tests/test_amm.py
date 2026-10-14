from decimal import Decimal
import pytest
from app.services import amm


def _players(shares_a: str = "10", shares_b: str = "10") -> list:
    """Two-player book as lightweight dicts (the AMM reads id/shares/base_price)."""
    return [
        {"id": "A", "total_shares_outstanding": Decimal(shares_a), "base_price": Decimal("1000000.00")},
        {"id": "B", "total_shares_outstanding": Decimal(shares_b), "base_price": Decimal("750000.00")},
    ]


def test_zero_share_baseline_equals_base_price():
    players = [
        {"id": "A", "total_shares_outstanding": Decimal("0"), "base_price": Decimal("1500000.00")},
        {"id": "B", "total_shares_outstanding": Decimal("0"), "base_price": Decimal("750000.00")},
    ]
    spots = amm.batch_compute_spot_prices(players)
    assert spots["A"] == Decimal("1500000.00")
    assert spots["B"] == Decimal("750000.00")


def test_spot_above_floor():
    spots = amm.batch_compute_spot_prices(_players())
    assert spots["A"] >= amm.MIN_PRICE_FLOOR
    assert spots["B"] >= amm.MIN_PRICE_FLOOR


def test_leader_costs_more_than_laggard():
    players = _players(shares_a="100", shares_b="0")
    assert amm.calculate_single_spot_price("A", players) > amm.calculate_single_spot_price("B", players)


def test_buy_and_sell_symmetry():
    players = _players()
    qty = Decimal("5")
    cost = amm.calculate_buy_cost("A", players, qty)
    after_buy = _players(shares_a="15", shares_b="10")
    proceeds = amm.calculate_sell_return("A", after_buy, qty)
    assert abs(cost - proceeds) <= Decimal("0.01")


def test_invalid_trade_inputs():
    players = _players()
    with pytest.raises(ValueError, match="positive"):
        amm.calculate_buy_cost("A", players, Decimal("-5"))
    with pytest.raises(ValueError, match="Cannot sell more shares"):
        amm.calculate_sell_return("A", players, Decimal("1000"))
    with pytest.raises(ValueError, match="Player not found"):
        amm.calculate_buy_cost("ZZZ", players, Decimal("1"))


def test_trade_preview_buy_metrics_shape():
    metrics = amm.calculate_trade_preview("A", _players(), "BUY", Decimal("2"))
    assert metrics["total_amount"] > Decimal("0")
    assert metrics["execution_price"] > Decimal("0")
    assert metrics["new_price"] > metrics["current_price"]
    assert metrics["price_impact_percent"] > Decimal("0")


def test_trade_preview_sell_lowers_price():
    metrics = amm.calculate_trade_preview("A", _players(), "SELL", Decimal("2"))
    assert metrics["new_price"] < metrics["current_price"]
    assert metrics["price_impact_percent"] < Decimal("0")


def test_simpson_cost_matches_numerical_integral():
    """Simpson's 3-point execution pricing must match a 1,000-step integral."""
    players = _players()
    qty = Decimal("10")
    simpson_cost = amm.calculate_buy_cost("A", players, qty)

    # Trapezoidal rule over 1,000 steps along the buy path (spot read at each step).
    n = 1000
    h = float(qty) / n
    total = 0.0
    prev_spot = float(amm.calculate_single_spot_price("A", players))
    for i in range(1, n + 1):
        step_players = [
            {"id": "A", "total_shares_outstanding": 10.0 + i * h, "base_price": Decimal("1000000.00")},
            {"id": "B", "total_shares_outstanding": 10.0, "base_price": Decimal("750000.00")},
        ]
        cur_spot = float(amm.calculate_single_spot_price("A", step_players))
        total += (prev_spot + cur_spot) / 2.0 * h
        prev_spot = cur_spot

    numerical_cost = Decimal(str(round(total, 2)))
    assert abs(simpson_cost - numerical_cost) <= Decimal("0.05")