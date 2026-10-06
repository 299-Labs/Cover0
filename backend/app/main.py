import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import market, trade, users, portfolio

app = FastAPI(
    title="Cover0 API",
    description="Real-Time Fantasy Sports Market Engine API",
    version="0.1.0"
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

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for container monitoring."""
    return {"status": "ok", "app": "Cover0 Backend"}