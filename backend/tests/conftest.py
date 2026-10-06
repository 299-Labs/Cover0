# tests/conftest.py
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import User, Player

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Creates a fresh database schema and seeds base state for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    test_user = User(
        username="demo_trader",
        email="demo@cover0.app",
        cash_balance=Decimal("100000000.00")
    )
    test_player = Player(
        external_id="sleeper_1",
        name="Patrick Mahomes",
        position="QB",
        team="KC",
        current_price=Decimal("10000000.00"),
        total_shares_outstanding=Decimal("0.00")
    )

    session.add(test_user)
    session.add(test_player)
    session.commit()
    session.refresh(test_user)
    session.refresh(test_player)

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency."""
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()