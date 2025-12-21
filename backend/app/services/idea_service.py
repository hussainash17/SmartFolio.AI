import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlmodel import Session, select, func, and_, or_, desc

from app.services.base import BaseService, ServiceException
from app.model.trading_idea import (
    TradingIdea, TradingIdeaCreate, TradingIdeaUpdate, TradingIdeaPublic,
    IdeaComment, IdeaLike, IdeaBias, IdeaTimeframe
)
from app.model.user import User

logger = logging.getLogger(__name__)

class IdeaService(BaseService[TradingIdea, TradingIdeaCreate, TradingIdeaUpdate]):
    """Service for managing trading ideas."""
    
    def __init__(self, session: Optional[Session] = None):
        super().__init__(TradingIdea, session)
    
    def create_idea(self, idea_data: TradingIdeaCreate, user_id: UUID) -> TradingIdea:
        """Create a new trading idea."""
        try:
            idea = TradingIdea(
                user_id=user_id,
                **idea_data.dict()
            )
            self.session.add(idea)
            self.session.commit()
            self.session.refresh(idea)
            
            logger.info(f"Created trading idea {idea.id} for user {user_id}")
            return idea
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error creating trading idea: {e}")
            raise ServiceException(f"Failed to create trading idea: {str(e)}")
    
    def get_idea_detail(self, idea_id: UUID, current_user_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Get idea details with counts and user info."""
        idea = self.session.get(TradingIdea, idea_id)
        if not idea:
            raise ServiceException("Trading idea not found", status_code=404)
        
        # Increment view count
        idea.view_count += 1
        self.session.add(idea)
        self.session.commit()
        self.session.refresh(idea)
        
        # Get counts
        like_count = self.session.exec(
            select(func.count(IdeaLike.id)).where(IdeaLike.idea_id == idea_id)
        ).one()
        
        comment_count = self.session.exec(
            select(func.count(IdeaComment.id)).where(IdeaComment.idea_id == idea_id)
        ).one()
        
        is_liked = False
        if current_user_id:
            is_liked = self.session.exec(
                select(IdeaLike).where(
                    and_(IdeaLike.idea_id == idea_id, IdeaLike.user_id == current_user_id)
                )
            ).first() is not None
        
        return {
            "idea": idea,
            "like_count": like_count,
            "comment_count": comment_count,
            "user": idea.user,
            "is_liked": is_liked
        }
    
    def list_ideas(
        self,
        symbol: Optional[str] = None,
        bias: Optional[IdeaBias] = None,
        timeframe: Optional[IdeaTimeframe] = None,
        user_id: Optional[UUID] = None,
        following_only: bool = False,
        current_user_id: Optional[UUID] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List trading ideas with filters and pagination."""
        try:
            query = select(TradingIdea).where(TradingIdea.is_published == True)
            
            if symbol:
                query = query.where(TradingIdea.symbols.contains([symbol]))
            
            if bias:
                query = query.where(TradingIdea.bias == bias)
            
            if timeframe:
                query = query.where(TradingIdea.timeframe == timeframe)
                
            if user_id:
                query = query.where(TradingIdea.user_id == user_id)
            
            # Filter to show only ideas from followed users
            if following_only and current_user_id:
                from app.model.trading_idea import UserFollow
                followed_users = self.session.exec(
                    select(UserFollow.followed_id).where(UserFollow.follower_id == current_user_id)
                ).all()
                if followed_users:
                    query = query.where(TradingIdea.user_id.in_(followed_users))
                else:
                    # No followed users, return empty result
                    return []
            
            query = query.order_by(desc(TradingIdea.created_at)).offset(offset).limit(limit)
            
            ideas = self.session.exec(query).all()
            
            result = []
            for idea in ideas:
                # Get counts for each idea
                like_count = self.session.exec(
                    select(func.count(IdeaLike.id)).where(IdeaLike.idea_id == idea.id)
                ).one()
                
                comment_count = self.session.exec(
                    select(func.count(IdeaComment.id)).where(IdeaComment.idea_id == idea.id)
                ).one()
                
                is_liked = False
                if current_user_id:
                    is_liked = self.session.exec(
                        select(IdeaLike).where(
                            and_(IdeaLike.idea_id == idea.id, IdeaLike.user_id == current_user_id)
                        )
                    ).first() is not None
                
                result.append({
                    "idea": idea,
                    "like_count": like_count,
                    "comment_count": comment_count,
                    "user": idea.user,
                    "is_liked": is_liked
                })
                
            return result
        except Exception as e:
            logger.error(f"Error listing trading ideas: {e}")
            raise ServiceException(f"Failed to list trading ideas: {str(e)}")

    def update_idea(self, idea_id: UUID, user_id: UUID, idea_data: TradingIdeaUpdate) -> TradingIdea:
        """Update a trading idea if owned by user."""
        idea = self.session.get(TradingIdea, idea_id)
        if not idea:
            raise ServiceException("Trading idea not found", status_code=404)
        
        if idea.user_id != user_id:
            raise ServiceException("Access denied", status_code=403)
        
        try:
            for key, value in idea_data.dict(exclude_unset=True).items():
                setattr(idea, key, value)
            
            idea.updated_at = datetime.utcnow()
            self.session.add(idea)
            self.session.commit()
            self.session.refresh(idea)
            return idea
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error updating trading idea: {e}")
            raise ServiceException(f"Failed to update trading idea: {str(e)}")

    def delete_idea(self, idea_id: UUID, user_id: UUID) -> bool:
        """Delete a trading idea if owned by user."""
        idea = self.session.get(TradingIdea, idea_id)
        if not idea:
            raise ServiceException("Trading idea not found", status_code=404)
        
        if idea.user_id != user_id:
            raise ServiceException("Access denied", status_code=403)
        
        try:
            self.session.delete(idea)
            self.session.commit()
            return True
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error deleting trading idea: {e}")
            raise ServiceException(f"Failed to delete trading idea: {str(e)}")
