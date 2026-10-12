def get_headshot_url(external_id: str) -> str:
    """Generates Sleeper CDN avatar URL from player external ID."""
    if not external_id or external_id.startswith("sleeper_"):
        return "https://sleepercdn.com/images/v2/icons/player_default.webp"
    return f"https://sleepercdn.com/content/nfl/players/thumb/{external_id}.jpg"
