from decimal import Decimal
import pytest
from app.services.amm import (
    calculate_spot_price,
    calculate_buy_cost,
    calculate_sell_return,
    calculate_trade_preview,
    BASE_PRICE,
    K_SENSITIVITY,
)

def test_spot_price_base():
    """Verify spot price at 0 net shares equals base price ($10M)."""
    price = calculate_spot_price(net_shares=Decimal("0"))
    assert price == BASE_PRICE

def test_spot_price_with_demand():
    """Verify spot price increases by $5,000 per net share."""
    price = calculate_spot_price(net_shares=Decimal("100"))
    # $10,000,000 + (100 * $5,000) = $10,500,000
    assert price == Decimal("10500000.00")

def test_buy_cost_single_share():
    """Verify purchasing 1 share calculates average spot price during trade."""
    cost = calculate_buy_cost(current_shares=Decimal("0"), buy_shares=Decimal("1"))
    # p(0) = $10,000,000, p(1) = $10,005,000
    # Average cost = $10,002,500
    assert cost == Decimal("10002500.00")

def test_buy_cost_multiple_shares():
    """Verify purchasing 10 shares calculates area under linear curve."""
    cost = calculate_buy_cost(current_shares=Decimal("0"), buy_shares=Decimal("10"))
    # p(0) = $10,000,000, p(10) = $10,050,000
    # Cost = 10 * ($10,000,000 + $10,050,000) / 2 = $100,250,000
    assert cost == Decimal("100250000.00")

def test_buy_and_sell_symmetry():
    """Buying N shares and selling them back immediately should yield identical proceeds (zero slippage spread)."""
    initial_shares = Decimal("50")
    trade_shares = Decimal("10")
    
    buy_cost = calculate_buy_cost(initial_shares, trade_shares)
    sell_return = calculate_sell_return(initial_shares + trade_shares, trade_shares)
    
    assert buy_cost == sell_return

def test_invalid_trade_inputs():
    """Verify validation errors are thrown on zero or negative shares."""
    with pytest.raises(ValueError, match="must be strictly greater than zero"):
        calculate_buy_cost(current_shares=Decimal("0"), buy_shares=Decimal("-5"))

    with pytest.raises(ValueError, match="Cannot sell more shares"):
        calculate_sell_return(current_shares=Decimal("10"), sell_shares=Decimal("15"))

def test_trade_preview_buy_metrics():
    """Verify preview calculation returns correct execution price and price impact for a BUY order."""
    metrics = calculate_trade_preview(
        current_shares=Decimal("0"),
        side="BUY",
        shares=Decimal("2")
    )
    assert metrics["current_price"] == Decimal("10000000.00")
    assert metrics["total_amount"] == Decimal("20010000.00")
    assert metrics["execution_price"] == Decimal("10005000.00")
    assert metrics["new_price"] == Decimal("10010000.00")
    assert metrics["price_impact_percent"] == Decimal("0.1")