from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app import models, schemas
from app.db import get_db

router = APIRouter(prefix="/api/v1/friends", tags=["Friends"])


def _calculate_user_nav(db: Session, user_id: UUID) -> Decimal:
    """Helper to calculate total NAV (Cash + Holdings Value) for a user."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return Decimal("0.00")

    holdings = db.query(models.Holding).filter(models.Holding.user_id == user_id).all()
    holdings_value = Decimal("0.00")
    for h in holdings:
        player = db.query(models.Player).filter(models.Player.id == h.player_id).first()
        if player:
            holdings_value += Decimal(str(h.shares_owned)) * Decimal(str(player.current_price))

    return Decimal(str(user.cash_balance)) + holdings_value


@router.get("/{user_id}", response_model=list[schemas.FriendResponse])
def get_friends(user_id: UUID, db: Session = Depends(get_db)):
    """Fetch all friends for a given user along with their live NAV."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    friendships = db.query(models.Friendship).filter(models.Friendship.user_id == user_id).all()

    result = []
    for f in friendships:
        friend = db.query(models.User).filter(models.User.id == f.friend_id).first()
        if friend:
            friend_nav = _calculate_user_nav(db, friend.id)
            result.append(
                schemas.FriendResponse(
                    id=f.id,
                    friend_id=friend.id,
                    friend_username=friend.username,
                    friend_nav=friend_nav,
                    created_at=f.created_at,
                )
            )

    return result


@router.post("", response_model=schemas.FriendResponse, status_code=status.HTTP_201_CREATED)
def add_friend(req: schemas.AddFriendRequest, db: Session = Depends(get_db)):
    """Add a friend by username."""
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    friend = db.query(models.User).filter(models.User.username == req.friend_username).first()
    if not friend:
        raise HTTPException(status_code=404, detail=f"User '{req.friend_username}' not found")

    if user.id == friend.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a friend")

    existing = (
        db.query(models.Friendship)
        .filter(
            models.Friendship.user_id == user.id,
            models.Friendship.friend_id == friend.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already friends with this user")

    friendship = models.Friendship(user_id=user.id, friend_id=friend.id)
    db.add(friendship)
    db.commit()
    db.refresh(friendship)

    friend_nav = _calculate_user_nav(db, friend.id)

    return schemas.FriendResponse(
        id=friendship.id,
        friend_id=friend.id,
        friend_username=friend.username,
        friend_nav=friend_nav,
        created_at=friendship.created_at,
    )