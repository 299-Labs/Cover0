from decimal import Decimal

# Sensitivity constant (Adjust this to change the curve steepness)
# At K=2,000,000: The first 10 shares increase the price by ~$4.7M. 
# Going from 100 to 110 shares only increases the price by ~$180k.
K_SENSITIVITY = Decimal("2000000.00")
MIN_PRICE_FLOOR = Decimal("500000.00") #$0.5M

def _integral(base_price: Decimal, s: Decimal) -> Decimal:
    """
    Returns the Total Value Locked (area under the curve) from 0 to s shares.
    Integral of (P0 + K * ln(x + 1)) dx
    = P0*s + K * [ (s + 1) * ln(s + 1) - s ]
    """
    if s <= Decimal("0"):
        return Decimal("0")
    
    s_plus_1 = s + Decimal("1")
    # Decimal().ln() calculates the natural logarithm with high precision
    log_area = (s_plus_1 * s_plus_1.ln()) - s
    
    return (base_price * s) + (K_SENSITIVITY * log_area)

def calculate_spot_price(base_price: Decimal, current_shares: Decimal) -> Decimal:
    """Calculates the instantaneous spot price at the current supply."""
    s_plus_1 = current_shares + Decimal("1")
    raw_spot = base_price + (K_SENSITIVITY * s_plus_1.ln())
    return max(raw_spot, MIN_PRICE_FLOOR)

def calculate_buy_cost(base_price: Decimal, current_shares: Decimal, buy_shares: Decimal) -> Decimal:
    """Exact cost is the integral from S1 to S2."""
    if buy_shares <= Decimal("0"):
        raise ValueError("Must buy a positive number of shares")
    
    s1 = current_shares
    s2 = current_shares + buy_shares
    
    cost = _integral(base_price, s2) - _integral(base_price, s1)
    return cost


def calculate_sell_return(base_price: Decimal, current_shares: Decimal, sell_shares: Decimal) -> Decimal:
    """Exact return is the integral from S1 to S2 (going backwards)."""
    if sell_shares <= Decimal("0") or sell_shares > current_shares:
        raise ValueError("Invalid sell amount")
        
    s1 = current_shares - sell_shares
    s2 = current_shares
    
    proceeds = _integral(base_price, s2) - _integral(base_price, s1)
    return proceeds

def calculate_trade_preview(base_price: Decimal, current_shares: Decimal, side: str, shares: Decimal) -> dict:
    """Generates preview data for the frontend."""
    current_spot = calculate_spot_price(base_price, current_shares)
    
    if side == "BUY":
        total_amount = calculate_buy_cost(base_price, current_shares, shares)
        new_shares = current_shares + shares
    else:  # SELL
        total_amount = calculate_sell_return(base_price, current_shares, shares)
        new_shares = current_shares - shares
        
    execution_price = total_amount / shares
    new_spot = calculate_spot_price(base_price, new_shares)
    
    # Impact % relative to current spot
    price_impact_percent = ((execution_price - current_spot) / current_spot) * Decimal("100")
    
    return {
        "current_price": current_spot,
        "total_amount": total_amount,
        "execution_price": execution_price,
        "new_price": new_spot,
        "price_impact_percent": price_impact_percent,
    }