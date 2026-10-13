import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import admin, friends, leaderboard, market, portfolio, trade, users
from app.db import Base, engine
import app.models
from app.services.scheduler import start_scheduler, stop_scheduler


# 1. Define the Lifespan event to manage the scheduler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the background cron jobs
    start_scheduler()
    yield
    # Shutdown: Cleanly stop the background jobs
    stop_scheduler()


# 2. Attach lifespan to the FastAPI instance
app = FastAPI(
    title="Cover0 API",
    description="Real-Time Fantasy Sports Market Engine API",
    version="0.1.0",
    lifespan=lifespan,
)

# Parse origins from environment or default to localhost
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

# CORS configuration allowing local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in allowed_origins else allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(market.router)
app.include_router(trade.router)
app.include_router(users.router)
app.include_router(portfolio.router)
app.include_router(friends.router)
app.include_router(leaderboard.router)
app.include_router(admin.router)

# Create any missing database tables in PostgreSQL on server startup
Base.metadata.create_all(bind=engine)

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for container monitoring."""
    return {"status": "ok", "app": "Cover0 Backend"}