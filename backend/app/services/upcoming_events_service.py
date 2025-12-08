"""
Service for managing upcoming events (AGM, Board Meetings, Record Dates, etc.)
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from math import ceil

from sqlmodel import Session, select, func, and_
from fastapi import HTTPException, status

from app.model.upcoming_events import UpcomingEvent, UpcomingEventCreate, UpcomingEventUpdate
from app.services.base import BaseService
import logging

logger = logging.getLogger(__name__)


class UpcomingEventsService(BaseService[UpcomingEvent, UpcomingEventCreate, UpcomingEventUpdate]):
    """
    Service for managing upcoming events following the repository pattern.
    """
    
    def __init__(self, session: Optional[Session] = None):
        super().__init__(UpcomingEvent, session)
    
    def get_paginated(
        self,
        page: int = 1,
        limit: int = 50,
        code: Optional[str] = None,
        event_type: Optional[str] = None,
        min_timestamp: Optional[int] = None,
        max_timestamp: Optional[int] = None,
        order_by: str = "timestamp"
    ) -> Dict[str, Any]:
        """
        Get paginated upcoming events with optional filtering.
        
        Args:
            page: Page number (1-indexed)
            limit: Number of items per page
            code: Filter by stock code/symbol
            event_type: Filter by event type (AGM, Board Meeting, Record Date, etc.)
            min_timestamp: Filter events with timestamp >= min_timestamp
            max_timestamp: Filter events with timestamp <= max_timestamp
            order_by: Field to order by (default: "timestamp")
            
        Returns:
            Dictionary containing:
            - data: List of events
            - count: Total number of matching events
            - page: Current page number
            - limit: Items per page
            - total_pages: Total number of pages
        """
        try:
            # Build query
            query = select(UpcomingEvent)
            count_query = select(func.count(UpcomingEvent.id))
            
            # Apply filters
            conditions = []
            
            if code:
                conditions.append(UpcomingEvent.code.ilike(f"%{code.upper()}%"))
            
            if event_type:
                conditions.append(UpcomingEvent.type == event_type)
            
            if min_timestamp is not None:
                conditions.append(UpcomingEvent.timestamp >= min_timestamp)
            
            if max_timestamp is not None:
                conditions.append(UpcomingEvent.timestamp <= max_timestamp)
            
            if conditions:
                where_clause = and_(*conditions) if len(conditions) > 1 else conditions[0]
                query = query.where(where_clause)
                count_query = count_query.where(where_clause)
            
            # Get total count
            total_count = self.session.exec(count_query).one()
            
            # Apply ordering
            if order_by == "timestamp":
                query = query.order_by(UpcomingEvent.timestamp.asc())
            elif order_by == "-timestamp":
                query = query.order_by(UpcomingEvent.timestamp.desc())
            elif order_by == "post_date":
                query = query.order_by(UpcomingEvent.post_date.asc())
            elif order_by == "-post_date":
                query = query.order_by(UpcomingEvent.post_date.desc())
            elif order_by == "code":
                query = query.order_by(UpcomingEvent.code.asc())
            elif order_by == "-code":
                query = query.order_by(UpcomingEvent.code.desc())
            else:
                # Default to timestamp ascending
                query = query.order_by(UpcomingEvent.timestamp.asc())
            
            # Apply pagination
            skip = (page - 1) * limit
            query = query.offset(skip).limit(limit)
            
            # Execute query
            events = self.session.exec(query).all()
            
            # Calculate total pages
            total_pages = ceil(total_count / limit) if limit > 0 else 0
            
            return {
                "data": events,
                "count": total_count,
                "page": page,
                "limit": limit,
                "total_pages": total_pages
            }
            
        except Exception as e:
            logger.error(f"Error retrieving paginated upcoming events: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred while fetching events"
            )
    
    def get_by_code(
        self,
        code: str,
        limit: Optional[int] = None
    ) -> List[UpcomingEvent]:
        """
        Get all upcoming events for a specific stock code.
        
        Args:
            code: Stock trading code/symbol
            limit: Optional limit on number of results
            
        Returns:
            List of upcoming events for the stock
        """
        try:
            query = select(UpcomingEvent).where(
                UpcomingEvent.code == code.upper()
            ).order_by(UpcomingEvent.timestamp.asc())
            
            if limit:
                query = query.limit(limit)
            
            return self.session.exec(query).all()
            
        except Exception as e:
            logger.error(f"Error retrieving events for code {code}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred"
            )
    
    def get_upcoming_by_type(
        self,
        event_type: str,
        limit: int = 50
    ) -> List[UpcomingEvent]:
        """
        Get upcoming events filtered by type.
        
        Args:
            event_type: Type of event (AGM, Board Meeting, Record Date, etc.)
            limit: Maximum number of results
            
        Returns:
            List of upcoming events of the specified type
        """
        try:
            current_timestamp = int(datetime.utcnow().timestamp())
            
            query = select(UpcomingEvent).where(
                and_(
                    UpcomingEvent.type == event_type,
                    UpcomingEvent.timestamp >= current_timestamp
                )
            ).order_by(UpcomingEvent.timestamp.asc()).limit(limit)
            
            return self.session.exec(query).all()
            
        except Exception as e:
            logger.error(f"Error retrieving events by type {event_type}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred"
            )
    
    def bulk_create(self, events: List[UpcomingEventCreate]) -> List[UpcomingEvent]:
        """
        Create multiple events in a single transaction.
        
        Args:
            events: List of event creation schemas
            
        Returns:
            List of created event instances
        """
        try:
            db_events = []
            for event_in in events:
                event_data = event_in.model_dump() if hasattr(event_in, 'model_dump') else event_in.dict()
                db_event = UpcomingEvent(**event_data)
                db_events.append(db_event)
                self.session.add(db_event)
            
            self.session.commit()
            
            # Refresh all events
            for db_event in db_events:
                self.session.refresh(db_event)
            
            logger.info(f"Created {len(db_events)} upcoming events")
            return db_events
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error bulk creating events: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred while creating events"
            )
