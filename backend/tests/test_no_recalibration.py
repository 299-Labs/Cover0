# tests/test_no_recalibration.py
# Baselines are seed-only: no manual route and no scheduled job may ever
# modify base_price after the initial seed.
import inspect

from app.services import scheduler as scheduler_module
from app.services import scoring as scoring_module
from app.services import sleeper as sleeper_module


def test_admin_recalibrate_route_removed(client):
    """POST /api/v1/admin/recalibrate-base-prices must no longer exist."""
    res = client.post("/api/v1/admin/recalibrate-base-prices")
    assert res.status_code == 404

    # The other admin triggers must remain untouched.
    assert client.post("/api/v1/admin/snapshot/trigger").status_code == 200


def test_tuesday_recalibration_cron_removed():
    """The Tuesday 4 AM ET base_price recalibration job must no longer exist."""
    assert not hasattr(scheduler_module, "trigger_weekly_recalibration")
    src = inspect.getsource(scheduler_module)
    assert "weekly_recalibration_cron" not in src
    assert "recalibrate" not in src.lower()


def test_scoring_recalibration_functions_removed():
    """The service-layer recalibration path must be fully gone."""
    assert not hasattr(scoring_module, "recalibrate_market_baselines")
    assert "recalibrate" not in inspect.getsource(scoring_module).lower()
    assert not hasattr(sleeper_module, "get_weekly_projections")
    assert "SLEEPER_WEEKLY_PROJECTIONS_URL" not in sleeper_module.__dict__
