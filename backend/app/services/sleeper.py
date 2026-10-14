import json
import time
import urllib.request
from typing import Dict, Any, Optional, List

SLEEPER_BASE_URL = "https://api.sleeper.app/v1"

# Simple in-memory cache to reduce Sleeper API calls
_cache: Dict[str, Any] = {}
_cache_ttl: Dict[str, float] = {}
CACHE_DURATION_SECONDS = 1800  # 30 minutes


def _fetch_json(url: str) -> Any:
    """Helper to fetch JSON with cache handling."""
    now = time.time()
    if url in _cache and (now - _cache_ttl.get(url, 0)) < CACHE_DURATION_SECONDS:
        return _cache[url]

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Cover0-App/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            _cache[url] = data
            _cache_ttl[url] = now
            return data
    except Exception as e:
        print(f"Error fetching {url} from Sleeper: {e}")
        return _cache.get(url, {})


def get_nfl_state() -> Dict[str, Any]:
    """Returns current active NFL season and week."""
    res = _fetch_json(f"{SLEEPER_BASE_URL}/state/nfl")
    if not res:
        return {"season": "2026", "week": 6, "season_type": "regular"}
    return res


def get_player_bio(external_id: str) -> Dict[str, Any]:
    """Fetches full player catalog and extracts bio attributes."""
    catalog = _fetch_json(f"{SLEEPER_BASE_URL}/players/nfl")
    player_data = catalog.get(external_id, {}) if isinstance(catalog, dict) else {}
    return {
        "age": player_data.get("age"),
        "height": player_data.get("height"),
        "weight": player_data.get("weight"),
        "college": player_data.get("college"),
        "years_exp": player_data.get("years_exp"),
        "number": player_data.get("number"),
        "status": player_data.get("status", "Active"),
        "injury_status": player_data.get("injury_status"),
        "injury_notes": player_data.get("injury_notes"),
        "team": player_data.get("team"),
    }


def _extract_breakdown(stat_dict: dict, is_proj: bool = False) -> dict:
    """Normalizes a Sleeper stat payload into our StatBreakdown shape.

    Projections come back as floats from Sleeper, so keep them as floats
    (1 decimal place in the UI); actuals are always whole numbers.
    """
    if is_proj:
        f = lambda v: float(v or 0.0)
        return {
            "pts_ppr": f(stat_dict.get("pts_ppr", 0.0)),
            "pass_att": f(stat_dict.get("pass_att", 0)),
            "pass_cmp": f(stat_dict.get("pass_cmp", 0)),
            "pass_yd": f(stat_dict.get("pass_yd", 0)),
            "pass_td": f(stat_dict.get("pass_td", 0)),
            "pass_int": f(stat_dict.get("pass_int", 0)),
            "rush_att": f(stat_dict.get("rush_att", 0)),
            "rush_yd": f(stat_dict.get("rush_yd", 0)),
            "rush_td": f(stat_dict.get("rush_td", 0)),
            "rec_target": f(stat_dict.get("rec_tgt", stat_dict.get("rec_target", 0))),
            "rec": f(stat_dict.get("rec", 0)),
            "rec_yd": f(stat_dict.get("rec_yd", 0)),
            "rec_td": f(stat_dict.get("rec_td", 0)),
            "fum_lost": f(stat_dict.get("fum_lost", 0)),
        }
    return {
        "pts_ppr": float(stat_dict.get("pts_ppr", 0.0) or 0.0),
        "pass_att": int(stat_dict.get("pass_att", 0) or 0),
        "pass_cmp": int(stat_dict.get("pass_cmp", 0) or 0),
        "pass_yd": int(stat_dict.get("pass_yd", 0) or 0),
        "pass_td": int(stat_dict.get("pass_td", 0) or 0),
        "pass_int": int(stat_dict.get("pass_int", 0) or 0),
        "rush_att": int(stat_dict.get("rush_att", 0) or 0),
        "rush_yd": int(stat_dict.get("rush_yd", 0) or 0),
        "rush_td": int(stat_dict.get("rush_td", 0) or 0),
        "rec_target": int(stat_dict.get("rec_tgt", stat_dict.get("rec_target", 0)) or 0),
        "rec": int(stat_dict.get("rec", 0) or 0),
        "rec_yd": int(stat_dict.get("rec_yd", 0) or 0),
        "rec_td": int(stat_dict.get("rec_td", 0) or 0),
        "fum_lost": int(stat_dict.get("fum_lost", 0) or 0),
    }


def get_player_stats_and_projections(external_id: str) -> Dict[str, Any]:
    """Returns season actual stats, upcoming week projections, and season projections."""
    state = get_nfl_state()
    season = state.get("season", "2026")
    week = state.get("week", 6)

    season_stats = _fetch_json(f"{SLEEPER_BASE_URL}/stats/nfl/regular/{season}")
    week_proj = _fetch_json(f"{SLEEPER_BASE_URL}/projections/nfl/regular/{season}/{week}")
    season_proj = _fetch_json(f"{SLEEPER_BASE_URL}/projections/nfl/regular/{season}")

    return {
        "current_week": week,
        "current_season": season,
        "season_actual": _extract_breakdown(season_stats.get(external_id, {}) if isinstance(season_stats, dict) else {}),
        "weekly_projected": _extract_breakdown(week_proj.get(external_id, {}) if isinstance(week_proj, dict) else {}, is_proj=True),
        "season_projected": _extract_breakdown(season_proj.get(external_id, {}) if isinstance(season_proj, dict) else {}, is_proj=True),
    }


def get_season_schedule_map(season: str) -> Dict[tuple, str]:
    """Fetches full season schedule and maps (week, team) -> opponent label."""
    # NOTE: Sleeper's schedule endpoint is NOT versioned under /v1
    games = _fetch_json(f"https://api.sleeper.app/schedule/nfl/regular/{season}")
    schedule_map: Dict[tuple, str] = {}
    if isinstance(games, list):
        for g in games:
            week = g.get("week")
            home = g.get("home")
            away = g.get("away")
            if week and home and away:
                schedule_map[(week, home)] = f"vs {away}"
                schedule_map[(week, away)] = f"@ {home}"
    return schedule_map


def get_player_historical_data(external_id: str, years_exp: int) -> Dict[str, Any]:
    """Single unified function for all historical game logs and past season summaries."""
    state = get_nfl_state()
    current_season = int(state.get("season", "2026"))
    current_week = state.get("week", 6)

    # Player catalog doubles as the team fallback for older seasons
    catalog = _fetch_json(f"{SLEEPER_BASE_URL}/players/nfl")
    fallback_team = (catalog.get(external_id, {}) if isinstance(catalog, dict) else {}).get("team") or "FA"

    logs: List[Dict[str, Any]] = []
    past_seasons: List[Dict[str, Any]] = []

    # Bound history to 5 seasons to keep the request fan-out sane
    years_to_fetch = min(int(years_exp) if years_exp else 1, 5)

    for y in range(current_season, current_season - years_to_fetch - 1, -1):
        year_str = str(y)
        sched_map = get_season_schedule_map(year_str)

        # 1. Season Summary (current season lives in the stats tab, not the career table)
        if y != current_season:
            s_stats = _fetch_json(f"{SLEEPER_BASE_URL}/stats/nfl/regular/{year_str}")
            if isinstance(s_stats, dict) and external_id in s_stats:
                p_s = s_stats[external_id]
                if p_s.get("gp", 0) > 0:
                    past_seasons.append({
                        "season": year_str,
                        "team": p_s.get("team") or fallback_team,
                        "games_played": p_s.get("gp", 0),
                        **_extract_breakdown(p_s),
                    })

        # 2. Game Logs
        max_week = current_week if y == current_season else 18
        for w in range(1, max_week + 1):
            w_stats = _fetch_json(f"{SLEEPER_BASE_URL}/stats/nfl/regular/{year_str}/{w}")
            if isinstance(w_stats, dict) and external_id in w_stats:
                p_w = w_stats[external_id]
                if (
                    p_w.get("pts_ppr", 0) > 0
                    or p_w.get("pass_att", 0) > 0
                    or p_w.get("rush_att", 0) > 0
                    or p_w.get("rec_tgt", 0) > 0
                ):
                    player_team = p_w.get("team") or fallback_team
                    opponent = sched_map.get((w, player_team)) or p_w.get("opp") or p_w.get("opponent") or "-"

                    logs.append({
                        "season": year_str,
                        "week": w,
                        "opponent": opponent,
                        "pts_ppr": float(p_w.get("pts_ppr", 0.0) or 0.0),
                        "pass_cmp": int(p_w.get("pass_cmp", 0) or 0),
                        "pass_att": int(p_w.get("pass_att", 0) or 0),
                        "pass_yd": int(p_w.get("pass_yd", 0) or 0),
                        "pass_td": int(p_w.get("pass_td", 0) or 0),
                        "rush_att": int(p_w.get("rush_att", 0) or 0),
                        "rush_yd": int(p_w.get("rush_yd", 0) or 0),
                        "rush_td": int(p_w.get("rush_td", 0) or 0),
                        "rec_target": int(p_w.get("rec_tgt", 0) or 0),
                        "rec": int(p_w.get("rec", 0) or 0),
                        "rec_yd": int(p_w.get("rec_yd", 0) or 0),
                        "rec_td": int(p_w.get("rec_td", 0) or 0),
                    })

    logs.sort(key=lambda x: (x["season"], x["week"]), reverse=True)
    past_seasons.sort(key=lambda x: x["season"], reverse=True)

    return {"game_logs": logs, "past_seasons": past_seasons}
