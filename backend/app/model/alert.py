import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import Column

if TYPE_CHECKING:
    from .user import User
    from .stock import StockCompany


# Alert Model
class Alert(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    stock_id: Optional[uuid.UUID] = Field(default=None, foreign_key="stockcompany.id")
    alert_type: str = Field(max_length=50)  # price_target, volume_spike, technical_indicator
    condition: str = Field(max_length=20)  # above, below, equals
    target_value: Decimal = Field(max_digits=10, decimal_places=2)
    current_value: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    status: str = Field(max_length=20)  # active, triggered, cancelled, expired
    notification_method: str = Field(max_length=50)  # email, sms, push, in_app
    is_recurring: bool = Field(default=False)
    frequency: Optional[str] = Field(default=None, max_length=20)  # daily, weekly, monthly
    last_triggered: Optional[datetime] = Field(default=None)
    trigger_count: int = Field(default=0)
    notes: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: "User" = Relationship(back_populates="alerts")
    stock: Optional["StockCompany"] = Relationship(back_populates="alerts")
    notifications: list["AlertNotification"] = Relationship(back_populates="alert")


# Alert Notification History
class AlertNotification(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    alert_id: uuid.UUID = Field(foreign_key="alert.id")
    notification_type: str = Field(max_length=20)  # email, sms, push, in_app
    status: str = Field(max_length=20)  # sent, failed, pending
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    response_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))  # JSON field for response
    error_message: Optional[str] = Field(default=None, max_length=500)
    
    # Relationships
    alert: Alert = Relationship(back_populates="notifications")


# News Model
class News(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(max_length=500)
    content: str = Field(max_length=10000)
    summary: Optional[str] = Field(default=None, max_length=1000)
    source: str = Field(max_length=100)
    source_url: Optional[str] = Field(default=None, max_length=500)
    author: Optional[str] = Field(default=None, max_length=100)
    category: str = Field(max_length=50)  # market, company, economy, etc.
    tags: list[str] = Field(default=[], sa_column=Column(JSON))  # JSON field for tags
    sentiment: Optional[str] = Field(default=None, max_length=20)  # positive, negative, neutral
    sentiment_score: Optional[Decimal] = Field(default=None, max_digits=3, decimal_places=2)
    published_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    stock_news: list["StockNews"] = Relationship(back_populates="news")
    market_news: list["MarketNews"] = Relationship(back_populates="news")


# Stock-News Relationship
class StockNews(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    news_id: uuid.UUID = Field(foreign_key="news.id")
    stock_id: uuid.UUID = Field(foreign_key="stockcompany.id")
    relevance_score: Optional[Decimal] = Field(default=None, max_digits=3, decimal_places=2)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    news: News = Relationship(back_populates="stock_news")
    stock: "StockCompany" = Relationship(back_populates="news_relations")


# Market News
class MarketNews(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    news_id: uuid.UUID = Field(foreign_key="news.id")
    market_type: str = Field(max_length=20)  # dse, cse, general
    impact_level: str = Field(max_length=20)  # high, medium, low
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    news: News = Relationship(back_populates="market_news")


# User News Preferences
class UserNewsPreference(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    categories: list[str] = Field(default=[], sa_column=Column(JSON))  # JSON field for preferred categories
    sources: list[str] = Field(default=[], sa_column=Column(JSON))  # JSON field for preferred sources
    notification_enabled: bool = Field(default=True)
    email_digest: bool = Field(default=False)
    digest_frequency: str = Field(default="daily", max_length=20)  # daily, weekly
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: "User" = Relationship(back_populates="news_preferences")


# Pydantic models for API
class AlertBase(SQLModel):
    alert_type: str
    condition: str
    target_value: Decimal
    notification_method: str
    is_recurring: bool = False
    frequency: Optional[str] = None
    notes: Optional[str] = None


class AlertCreate(AlertBase):
    stock_id: Optional[uuid.UUID] = None


class AlertUpdate(SQLModel):
    alert_type: Optional[str] = None
    condition: Optional[str] = None
    target_value: Optional[Decimal] = None
    notification_method: Optional[str] = None
    is_recurring: Optional[bool] = None
    frequency: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AlertPublic(AlertBase):
    id: uuid.UUID
    user_id: uuid.UUID
    stock_id: Optional[uuid.UUID]
    current_value: Optional[Decimal]
    status: str
    last_triggered: Optional[datetime]
    trigger_count: int
    created_at: datetime
    updated_at: datetime


class AlertNotificationBase(SQLModel):
    notification_type: str
    status: str
    sent_at: datetime


class AlertNotificationPublic(AlertNotificationBase):
    id: uuid.UUID
    alert_id: uuid.UUID
    response_data: Optional[dict]
    error_message: Optional[str]


class NewsBase(SQLModel):
    title: str
    content: str
    summary: Optional[str] = None
    source: str
    source_url: Optional[str] = None
    author: Optional[str] = None
    category: str
    tags: list[str] = []
    sentiment: Optional[str] = None
    sentiment_score: Optional[Decimal] = None
    published_at: datetime
    is_active: bool = True


class NewsCreate(NewsBase):
    pass


class NewsUpdate(SQLModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    source: Optional[str] = None
    source_url: Optional[str] = None
    author: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    sentiment: Optional[str] = None
    sentiment_score: Optional[Decimal] = None
    published_at: Optional[datetime] = None
    is_active: Optional[bool] = None


class NewsPublic(NewsBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class StockNewsBase(SQLModel):
    relevance_score: Optional[Decimal] = None


class StockNewsPublic(StockNewsBase):
    id: uuid.UUID
    news_id: uuid.UUID
    stock_id: uuid.UUID
    created_at: datetime


class MarketNewsBase(SQLModel):
    market_type: str
    impact_level: str


class MarketNewsPublic(MarketNewsBase):
    id: uuid.UUID
    news_id: uuid.UUID
    created_at: datetime


class UserNewsPreferenceBase(SQLModel):
    categories: list[str] = []
    sources: list[str] = []
    notification_enabled: bool = True
    email_digest: bool = False
    digest_frequency: str = "daily"


class UserNewsPreferenceCreate(UserNewsPreferenceBase):
    pass


class UserNewsPreferenceUpdate(SQLModel):
    categories: Optional[list[str]] = None
    sources: Optional[list[str]] = None
    notification_enabled: Optional[bool] = None
    email_digest: Optional[bool] = None
    digest_frequency: Optional[str] = None


class UserNewsPreferencePublic(UserNewsPreferenceBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# Alert Types
class AlertType(SQLModel):
    name: str
    description: str
    parameters: dict = {}


# News Summary
class NewsSummary(SQLModel):
    total_news: int
    market_news: int
    company_news: int
    latest_news: list[NewsPublic]
    trending_topics: list[str] 