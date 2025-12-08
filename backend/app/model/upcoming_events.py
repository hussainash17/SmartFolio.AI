import uuid
from datetime import datetime
from typing import Optional, List

from sqlmodel import Field, SQLModel


class UpcomingEvent(SQLModel, table=True):
    """Upcoming events table for storing corporate events like AGM, Board Meetings, Record Dates"""
    __tablename__ = "upcoming_events"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    code: str = Field(max_length=50, index=True)  # Stock symbol/trading code
    post_date: datetime = Field(index=True)  # When the event was posted/announced
    timestamp: int = Field(index=True)  # Unix timestamp of the event
    date: str = Field(max_length=50)  # Formatted date string (e.g., "Dec 09, 2025")
    time: str = Field(max_length=20)  # Formatted time string (e.g., "11:59 PM")
    type: str = Field(max_length=50, index=True)  # Event type: "AGM", "Board Meeting", "Record Date", etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Pydantic models for API
class UpcomingEventBase(SQLModel):
    code: str
    post_date: datetime
    timestamp: int
    date: str
    time: str
    type: str


class UpcomingEventCreate(UpcomingEventBase):
    pass


class UpcomingEventUpdate(SQLModel):
    code: Optional[str] = None
    post_date: Optional[datetime] = None
    timestamp: Optional[int] = None
    date: Optional[str] = None
    time: Optional[str] = None
    type: Optional[str] = None


class UpcomingEventPublic(UpcomingEventBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class UpcomingEventsPublic(SQLModel):
    """Pagination response model for upcoming events"""
    data: List[UpcomingEventPublic]
    count: int
    page: int
    limit: int
    total_pages: int
