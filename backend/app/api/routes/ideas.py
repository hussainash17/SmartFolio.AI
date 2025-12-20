from typing import Any, List, Optional, Dict
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import CurrentUser, CurrentUserOptional, SessionDep
from app.model.trading_idea import (
    TradingIdeaCreate, TradingIdeaUpdate, TradingIdeaPublic,
    IdeaCommentCreate, IdeaCommentPublic, IdeaBias, IdeaTimeframe
)
from app.model.user import User
from app.services.idea_service import IdeaService
from app.services.social_service import SocialService

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
def list_ideas(
    session: SessionDep,
    current_user: CurrentUserOptional,
    symbol: Optional[str] = None,
    bias: Optional[IdeaBias] = None,
    timeframe: Optional[IdeaTimeframe] = None,
    user_id: Optional[UUID] = None,
    following_only: bool = False,
    limit: int = Query(default=20, le=100),
    offset: int = 0
) -> Any:
    """List trading ideas with filters."""
    idea_service = IdeaService(session)
    return idea_service.list_ideas(
        symbol=symbol,
        bias=bias,
        timeframe=timeframe,
        user_id=user_id,
        following_only=following_only,
        current_user_id=current_user.id if current_user else None,
        limit=limit,
        offset=offset
    )

@router.post("/", response_model=TradingIdeaPublic)
def create_idea(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    idea_in: TradingIdeaCreate
) -> Any:
    """Create a new trading idea."""
    idea_service = IdeaService(session)
    return idea_service.create_idea(idea_in, current_user.id)

@router.get("/{id}", response_model=Dict[str, Any])
def get_idea(
    *,
    session: SessionDep,
    current_user: CurrentUserOptional,
    id: UUID
) -> Any:
    """Get a specific trading idea by ID."""
    idea_service = IdeaService(session)
    return idea_service.get_idea_detail(id, current_user.id if current_user else None)

@router.patch("/{id}", response_model=TradingIdeaPublic)
def update_idea(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: UUID,
    idea_in: TradingIdeaUpdate
) -> Any:
    """Update a trading idea."""
    idea_service = IdeaService(session)
    return idea_service.update_idea(id, current_user.id, idea_in)

@router.delete("/{id}")
def delete_idea(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: UUID
) -> Any:
    """Delete a trading idea."""
    idea_service = IdeaService(session)
    idea_service.delete_idea(id, current_user.id)
    return {"message": "Trading idea deleted successfully"}

# Social Endpoints
@router.post("/{id}/like")
def toggle_like(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: UUID
) -> Any:
    """Toggle like on a trading idea."""
    social_service = SocialService(session)
    liked = social_service.toggle_like(id, current_user.id)
    return {"liked": liked}

@router.post("/{id}/comment", response_model=IdeaCommentPublic)
def add_comment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: UUID,
    comment_in: IdeaCommentCreate
) -> Any:
    """Add a comment to a trading idea."""
    social_service = SocialService(session)
    return social_service.add_comment(id, current_user.id, comment_in.content)

@router.get("/{id}/comments", response_model=List[Dict[str, Any]])
def get_comments(
    *,
    session: SessionDep,
    id: UUID,
    limit: int = Query(default=50, le=100),
    offset: int = 0
) -> Any:
    """Get comments for a trading idea."""
    social_service = SocialService(session)
    return social_service.get_comments(id, limit, offset)

@router.post("/follow/user/{user_id}")
def follow_user(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    user_id: UUID
) -> Any:
    """Follow a user."""
    social_service = SocialService(session)
    social_service.follow_user(current_user.id, user_id)
    return {"message": "User followed successfully"}

@router.delete("/follow/user/{user_id}")
def unfollow_user(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    user_id: UUID
) -> Any:
    """Unfollow a user."""
    social_service = SocialService(session)
    social_service.unfollow_user(current_user.id, user_id)
    return {"message": "User unfollowed successfully"}

@router.post("/follow/symbol/{symbol}")
def follow_symbol(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    symbol: str
) -> Any:
    """Follow a symbol."""
    social_service = SocialService(session)
    social_service.follow_symbol(current_user.id, symbol)
    return {"message": f"Symbol {symbol} followed successfully"}

@router.delete("/follow/symbol/{symbol}")
def unfollow_symbol(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    symbol: str
) -> Any:
    """Unfollow a symbol."""
    social_service = SocialService(session)
    social_service.unfollow_symbol(current_user.id, symbol)
    return {"message": f"Symbol {symbol} unfollowed successfully"}

@router.get("/profile/{user_id}", response_model=Dict[str, Any])
def get_user_profile(
    *,
    session: SessionDep,
    user_id: UUID,
    current_user: CurrentUserOptional = None
) -> Any:
    """Get user profile social stats."""
    social_service = SocialService(session)
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_user_id = current_user.id if current_user else None
    stats = social_service.get_user_social_stats(user_id, current_user_id)
    return {
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email
        },
        "stats": stats
    }
