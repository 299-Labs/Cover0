from decimal import Decimal

# Base asset parameters
BASE_PRICE = Decimal("10000000.00")  # $10M initial base price
K_SENSITIVITY = Decimal("5000.00")   # $5,000 price increase per net circulating share

def calculate_spot_price(net_shares: Decimal, perf_modifier: Decimal = Decimal("0")) -> Decimal:
    """
    Calculates the instantaneous spot price for a player asset.
    P(s) = P0 + (k * s) + performance_modifier
    """
    return BASE_PRICE + (K_SENSITIVITY * net_shares) + perf_modifier


def calculate_buy_cost(
    current_shares: Decimal, 
    buy_shares: Decimal, 
    perf_modifier: Decimal = Decimal("0")
) -> Decimal:
    """
    Calculates exact cost to purchase N shares using the integral under the bonding curve.
    Cost = integral from S to (S + DeltaS) of P(s) ds
    Area of trapezoid: DeltaS * (P(S1) + P(S2)) / 2
    """
    if buy_shares <= Decimal("0"):
        raise ValueError("buy_shares must be strictly greater than zero")
        
    s1 = current_shares
    s2 = current_shares + buy_shares
    
    p1 = calculate_spot_price(s1, perf_modifier)
    p2 = calculate_spot_price(s2, perf_modifier)
    
    total_cost = buy_shares * (p1 + p2) / Decimal("2")
    return total_cost


def calculate_sell_return(
    current_shares: Decimal, 
    sell_shares: Decimal, 
    perf_modifier: Decimal = Decimal("0")
) -> Decimal:
    """
    Calculates exact cash returned to user when selling N shares back to the AMM curve.
    Return = integral from (S - DeltaS) to S of P(s) ds
    """
    if sell_shares <= Decimal("0"):
        raise ValueError("sell_shares must be strictly greater than zero")
    if sell_shares > current_shares:
        raise ValueError("Cannot sell more shares than total circulating supply")
        
    s1 = current_shares - sell_shares
    s2 = current_shares
    
    p1 = calculate_spot_price(s1, perf_modifier)
    p2 = calculate_spot_price(s2, perf_modifier)
    
    total_return = sell_shares * (p1 + p2) / Decimal("2")
    return total_return