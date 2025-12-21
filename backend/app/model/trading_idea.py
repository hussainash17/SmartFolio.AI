import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional, List
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column, JSON, Text

if TYPE_CHECKING:
    from .user import User

class IdeaBias(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"
    NEUTRAL = "NEUTRAL"

class IdeaTimeframe(str, Enum):
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1D"
    W1 = "1W"
    MN1 = "1M"

class TradingIdea(SQLModel, table=True):
    __tablename__ = "trading_idea"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    
    title: str = Field(max_length=255)
    content: str = Field(sa_column=Column(Text))
    
    # Symbols associated with this idea (e.g., ["GP", "BATBC"])
    symbols: List[str] = Field(default=[], sa_column=Column(JSON))
    
    timeframe: Optional[IdeaTimeframe] = Field(default=None)
    bias: Optional[IdeaBias] = Field(default=IdeaBias.NEUTRAL)
    
    # Chart state (TradingView widget state)
    chart_state: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    # Metadata
    view_count: int = Field(default=0)
    is_published: bool = Field(default=True, index=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: "User" = Relationship(back_populates="trading_ideas")
    comments: List["IdeaComment"] = Relationship(back_populates="idea", sa_relationship_kwargs={"cascade": "all, delete"})
    likes: List["IdeaLike"] = Relationship(back_populates="idea", sa_relationship_kwargs={"cascade": "all, delete"})

class IdeaComment(SQLModel, table=True):
    __tablename__ = "idea_comment"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    idea_id: uuid.UUID = Field(foreign_key="trading_idea.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    
    content: str = Field(sa_column=Column(Text))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    idea: "TradingIdea" = Relationship(back_populates="comments")
    user: "User" = Relationship(back_populates="idea_comments")

class IdeaLike(SQLModel, table=True):
    __tablename__ = "idea_like"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    idea_id: uuid.UUID = Field(foreign_key="trading_idea.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    idea: "TradingIdea" = Relationship(back_populates="likes")
    user: "User" = Relationship(back_populates="idea_likes")

class UserFollow(SQLModel, table=True):
    __tablename__ = "user_follow"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    follower_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    followed_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    follower: "User" = Relationship(
        sa_relationship_kwargs={"primaryjoin": "UserFollow.follower_id == User.id", "back_populates": "following"}
    )
    followed: "User" = Relationship(
        sa_relationship_kwargs={"primaryjoin": "UserFollow.followed_id == User.id", "back_populates": "followers"}
    )

class SymbolFollow(SQLModel, table=True):
    __tablename__ = "symbol_follow"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    symbol: str = Field(index=True, max_length=20)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: "User" = Relationship(back_populates="symbol_follows")

# Pydantic models for API
class TradingIdeaBase(SQLModel):
    title: str
    content: str
    symbols: List[str] = []
    timeframe: Optional[IdeaTimeframe] = None
    bias: Optional[IdeaBias] = IdeaBias.NEUTRAL
    chart_state: Optional[dict] = None

class TradingIdeaCreate(TradingIdeaBase):
    pass

class TradingIdeaUpdate(SQLModel):
    title: Optional[str] = None
    content: Optional[str] = None
    symbols: Optional[List[str]] = None
    timeframe: Optional[IdeaTimeframe] = None
    bias: Optional[IdeaBias] = None
    chart_state: Optional[dict] = None
    is_published: Optional[bool] = None

class TradingIdeaPublic(TradingIdeaBase):
    id: uuid.UUID
    user_id: uuid.UUID
    view_count: int
    is_published: bool
    created_at: datetime
    updated_at: datetime
    
    # Counts for social engagement
    like_count: int = 0
    comment_count: int = 0

class IdeaCommentBase(SQLModel):
    content: str

class IdeaCommentCreate(IdeaCommentBase):
    pass

class IdeaCommentUpdate(SQLModel):
    content: str

class IdeaCommentPublic(IdeaCommentBase):
    id: uuid.UUID
    idea_id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
