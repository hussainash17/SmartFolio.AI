import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlmodel import Session, select, func, and_, or_

from app.services.base import ServiceException
from app.model.trading_idea import (
    IdeaComment, IdeaLike, UserFollow, SymbolFollow, TradingIdea
)
from app.model.user import User

logger = logging.getLogger(__name__)

class SocialService:
    """Service for social interactions: likes, comments, and follows."""
    
    def __init__(self, session: Session):
        self.session = session
    
    def toggle_like(self, idea_id: UUID, user_id: UUID) -> bool:
        """Toggle like on a trading idea. Returns True if liked, False if unliked."""
        try:
            existing_like = self.session.exec(
                select(IdeaLike).where(
                    and_(IdeaLike.idea_id == idea_id, IdeaLike.user_id == user_id)
                )
            ).first()
            
            if existing_like:
                self.session.delete(existing_like)
                self.session.commit()
                return False
            else:
                new_like = IdeaLike(idea_id=idea_id, user_id=user_id)
                self.session.add(new_like)
                self.session.commit()
                return True
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error toggling like: {e}")
            raise ServiceException(f"Failed to toggle like: {str(e)}")

    def add_comment(self, idea_id: UUID, user_id: UUID, content: str) -> IdeaComment:
        """Add a comment to a trading idea."""
        try:
            comment = IdeaComment(
                idea_id=idea_id,
                user_id=user_id,
                content=content
            )
            self.session.add(comment)
            self.session.commit()
            self.session.refresh(comment)
            return comment
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error adding comment: {e}")
            raise ServiceException(f"Failed to add comment: {str(e)}")

    def get_comments(self, idea_id: UUID, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get comments for an idea with user info."""
        try:
            comments = self.session.exec(
                select(IdeaComment)
                .where(IdeaComment.idea_id == idea_id)
                .order_by(IdeaComment.created_at.desc())
                .offset(offset)
                .limit(limit)
            ).all()
            
            return [{"comment": c, "user": c.user} for c in comments]
        except Exception as e:
            logger.error(f"Error getting comments: {e}")
            raise ServiceException(f"Failed to get comments: {str(e)}")

    def follow_user(self, follower_id: UUID, followed_id: UUID) -> bool:
        """Follow another user."""
        if follower_id == followed_id:
            raise ServiceException("You cannot follow yourself", status_code=400)
            
        try:
            existing = self.session.exec(
                select(UserFollow).where(
                    and_(UserFollow.follower_id == follower_id, UserFollow.followed_id == followed_id)
                )
            ).first()
            
            if existing:
                return True
                
            follow = UserFollow(follower_id=follower_id, followed_id=followed_id)
            self.session.add(follow)
            self.session.commit()
            return True
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error following user: {e}")
            raise ServiceException(f"Failed to follow user: {str(e)}")

    def unfollow_user(self, follower_id: UUID, followed_id: UUID) -> bool:
        """Unfollow another user."""
        try:
            follow = self.session.exec(
                select(UserFollow).where(
                    and_(UserFollow.follower_id == follower_id, UserFollow.followed_id == followed_id)
                )
            ).first()
            
            if follow:
                self.session.delete(follow)
                self.session.commit()
            return True
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error unfollowing user: {e}")
            raise ServiceException(f"Failed to unfollow user: {str(e)}")

    def follow_symbol(self, user_id: UUID, symbol: str) -> bool:
        """Follow a market symbol."""
        try:
            symbol = symbol.upper()
            existing = self.session.exec(
                select(SymbolFollow).where(
                    and_(SymbolFollow.user_id == user_id, SymbolFollow.symbol == symbol)
                )
            ).first()
            
            if existing:
                return True
                
            follow = SymbolFollow(user_id=user_id, symbol=symbol)
            self.session.add(follow)
            self.session.commit()
            return True
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error following symbol: {e}")
            raise ServiceException(f"Failed to follow symbol: {str(e)}")

    def unfollow_symbol(self, user_id: UUID, symbol: str) -> bool:
        """Unfollow a market symbol."""
        try:
            symbol = symbol.upper()
            follow = self.session.exec(
                select(SymbolFollow).where(
                    and_(SymbolFollow.user_id == user_id, SymbolFollow.symbol == symbol)
                )
            ).first()
            
            if follow:
                self.session.delete(follow)
                self.session.commit()
            return True
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error unfollowing symbol: {e}")
            raise ServiceException(f"Failed to unfollow symbol: {str(e)}")

    def get_user_social_stats(self, user_id: UUID, current_user_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Get social stats for a user profile."""
        try:
            followers_count = self.session.exec(
                select(func.count(UserFollow.id)).where(UserFollow.followed_id == user_id)
            ).one()
            
            following_count = self.session.exec(
                select(func.count(UserFollow.id)).where(UserFollow.follower_id == user_id)
            ).one()
            
            total_ideas = self.session.exec(
                select(func.count(TradingIdea.id)).where(TradingIdea.user_id == user_id)
            ).one()
            
            # Count total likes on user's ideas
            total_likes = self.session.exec(
                select(func.count(IdeaLike.id))
                .join(TradingIdea, IdeaLike.idea_id == TradingIdea.id)
                .where(TradingIdea.user_id == user_id)
            ).one()
            
            # Check if current user is following this user
            is_following = False
            if current_user_id:
                is_following = self.session.exec(
                    select(UserFollow).where(
                        and_(
                            UserFollow.follower_id == current_user_id,
                            UserFollow.followed_id == user_id
                        )
                    )
                ).first() is not None
            
            return {
                "followers_count": followers_count,
                "following_count": following_count,
                "total_ideas": total_ideas,
                "total_likes": total_likes,
                "is_following": is_following
            }
        except Exception as e:
            logger.error(f"Error getting user social stats: {e}")
            raise ServiceException(f"Failed to get social stats: {str(e)}")
