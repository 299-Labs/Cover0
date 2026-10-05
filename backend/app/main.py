from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import market, trade, users

app = FastAPI(
    title="Cover0 API",
    description="Real-Time Fantasy Sports Market Engine API",
    version="0.1.0"
)

# CORS configuration allowing local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(market.router)
app.include_router(trade.router)
app.include_router(users.router)

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for container monitoring."""
    return {"status": "ok", "app": "Cover0 Backend"}