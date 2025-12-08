"""
Upcoming Events API Routes

This module provides endpoints for managing and retrieving upcoming corporate events
like AGM, Board Meetings, and Record Dates.
"""

from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import SessionDep, CurrentUser
from app.model.upcoming_events import (
    UpcomingEvent,
    UpcomingEventCreate,
    UpcomingEventPublic,
    UpcomingEventUpdate,
    UpcomingEventsPublic
)
from app.services.upcoming_events_service import UpcomingEventsService

router = APIRouter(prefix="/upcoming-events", tags=["upcoming-events"])


def get_upcoming_events_service(session: SessionDep) -> UpcomingEventsService:
    """Dependency to get upcoming events service"""
    return UpcomingEventsService(session=session)


@router.get(
    "/",
    response_model=UpcomingEventsPublic,
    summary="Get Paginated Upcoming Events",
    description="Retrieve upcoming corporate events with pagination and filtering options"
)
def list_upcoming_events(
    session: SessionDep,
    current_user: CurrentUser,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=200, description="Number of items per page"),
    code: Optional[str] = Query(None, description="Filter by stock code/symbol (case-insensitive partial match)"),
    event_type: Optional[str] = Query(
        None,
        description="Filter by event type (e.g., 'AGM', 'Board Meeting', 'Record Date')"
    ),
    min_timestamp: Optional[int] = Query(
        None,
        ge=0,
        description="Filter events with timestamp >= min_timestamp (Unix timestamp)"
    ),
    max_timestamp: Optional[int] = Query(
        None,
        ge=0,
        description="Filter events with timestamp <= max_timestamp (Unix timestamp)"
    ),
    order_by: str = Query(
        "timestamp",
        description="Field to order by. Prefix with '-' for descending. Options: timestamp, post_date, code"
    ),
    service: UpcomingEventsService = Depends(get_upcoming_events_service)
) -> UpcomingEventsPublic:
    """
    Get paginated list of upcoming events with optional filtering.
    
    **Query Parameters:**
    - `page`: Page number (default: 1)
    - `limit`: Items per page (default: 50, max: 200)
    - `code`: Filter by stock code (partial match, case-insensitive)
    - `event_type`: Filter by event type
    - `min_timestamp`: Filter events from this timestamp onwards
    - `max_timestamp`: Filter events up to this timestamp
    - `order_by`: Sort field (default: "timestamp")
    
    **Example:**
    ```
    GET /api/v1/upcoming-events/?page=1&limit=20&code=BATBC&event_type=AGM
    ```
    """
    try:
        result = service.get_paginated(
            page=page,
            limit=limit,
            code=code,
            event_type=event_type,
            min_timestamp=min_timestamp,
            max_timestamp=max_timestamp,
            order_by=order_by
        )
        
        return UpcomingEventsPublic(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving upcoming events: {str(e)}"
        )


@router.get(
    "/code/{code}",
    response_model=list[UpcomingEventPublic],
    summary="Get Events by Stock Code",
    description="Retrieve all upcoming events for a specific stock"
)
def get_events_by_code(
    code: str,
    current_user: CurrentUser,
    limit: Optional[int] = Query(None, ge=1, le=500, description="Maximum number of results"),
    service: UpcomingEventsService = Depends(get_upcoming_events_service)
) -> list[UpcomingEventPublic]:
    """
    Get all upcoming events for a specific stock code.
    
    **Path Parameters:**
    - `code`: Stock trading code/symbol
    
    **Query Parameters:**
    - `limit`: Optional limit on number of results (max: 500)
    
    **Example:**
    ```
    GET /api/v1/upcoming-events/code/BATBC?limit=10
    ```
    """
    try:
        events = service.get_by_code(code=code, limit=limit)
        return events
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving events for code {code}: {str(e)}"
        )


@router.get(
    "/type/{event_type}",
    response_model=list[UpcomingEventPublic],
    summary="Get Events by Type",
    description="Retrieve upcoming events filtered by event type"
)
def get_events_by_type(
    event_type: str,
    current_user: CurrentUser,
    limit: int = Query(50, ge=1, le=500, description="Maximum number of results"),
    service: UpcomingEventsService = Depends(get_upcoming_events_service)
) -> list[UpcomingEventPublic]:
    """
    Get upcoming events filtered by type (only future events).
    
    **Path Parameters:**
    - `event_type`: Type of event (e.g., "AGM", "Board Meeting", "Record Date")
    
    **Query Parameters:**
    - `limit`: Maximum number of results (default: 50, max: 500)
    
    **Example:**
    ```
    GET /api/v1/upcoming-events/type/AGM?limit=20
    ```
    """
    try:
        events = service.get_upcoming_by_type(event_type=event_type, limit=limit)
        return events
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving events by type {event_type}: {str(e)}"
        )


@router.get(
    "/{event_id}",
    response_model=UpcomingEventPublic,
    summary="Get Event by ID",
    description="Retrieve a specific upcoming event by its ID"
)
def get_event_by_id(
    event_id: str,
    current_user: CurrentUser,
    service: UpcomingEventsService = Depends(get_upcoming_events_service)
) -> UpcomingEventPublic:
    """
    Get a specific upcoming event by its UUID.
    
    **Path Parameters:**
    - `event_id`: UUID of the event
    
    **Example:**
    ```
    GET /api/v1/upcoming-events/123e4567-e89b-12d3-a456-426614174000
    ```
    """
    try:
        import uuid
        event_uuid = uuid.UUID(event_id)
        event = service.get_by_id(event_uuid)
        
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with ID {event_id} not found"
            )
        
        return event
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid event ID format: {event_id}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving event: {str(e)}"
        )


@router.post(
    "/",
    response_model=UpcomingEventPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create Upcoming Event",
    description="Create a new upcoming event (admin only)"
)
def create_event(
    event_in: UpcomingEventCreate,
    current_user: CurrentUser,
    service: UpcomingEventsService = Depends(get_upcoming_events_service)
) -> UpcomingEventPublic:
    """
    Create a new upcoming event.
    
    **Note:** In production, restrict this endpoint to admin users.
    
    **Example:**
    ```json
    POST /api/v1/upcoming-events/
    {
        "code": "BATBC",
        "post_date": "2025-12-05T10:00:00Z",
        "timestamp": 1765216800,
        "date": "Dec 09, 2025",
        "time": "11:59 PM",
        "type": "Record Date"
    }
    ```
    """
    try:
        event = service.create(event_in)
        return event
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating event: {str(e)}"
        )


@router.post(
    "/bulk",
    response_model=list[UpcomingEventPublic],
    status_code=status.HTTP_201_CREATED,
    summary="Bulk Create Events",
    description="Create multiple upcoming events in a single transaction (admin only)"
)
def bulk_create_events(
    events: list[UpcomingEventCreate],
    current_user: CurrentUser,
    service: UpcomingEventsService = Depends(get_upcoming_events_service)
) -> list[UpcomingEventPublic]:
    """
    Create multiple upcoming events in a single transaction.
    
    **Note:** In production, restrict this endpoint to admin users.
    
    **Example:**
    ```json
    POST /api/v1/upcoming-events/bulk
    [
        {
            "code": "BATBC",
            "post_date": "2025-12-05T10:00:00Z",
            "timestamp": 1765216800,
            "date": "Dec 09, 2025",
            "time": "11:59 PM",
            "type": "Record Date"
        },
        {
            "code": "SQURPHARMA",
            "post_date": "2025-12-05T10:00:00Z",
            "timestamp": 1765256400,
            "date": "Dec 10, 2025",
            "time": "11:00 AM",
            "type": "AGM"
        }
    ]
    ```
    """
    try:
        if not events:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Events list cannot be empty"
            )
        
        if len(events) > 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create more than 1000 events at once"
            )
        
        created_events = service.bulk_create(events)
        return created_events
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error bulk creating events: {str(e)}"
        )


@router.put(
    "/{event_id}",
    response_model=UpcomingEventPublic,
    summary="Update Event",
    description="Update an existing upcoming event (admin only)"
)
def update_event(
    event_id: str,
    event_update: UpcomingEventUpdate,
    current_user: CurrentUser,
    service: UpcomingEventsService = Depends(get_upcoming_events_service)
) -> UpcomingEventPublic:
    """
    Update an existing upcoming event.
    
    **Note:** In production, restrict this endpoint to admin users.
    
    **Path Parameters:**
    - `event_id`: UUID of the event to update
    
    **Example:**
    ```json
    PUT /api/v1/upcoming-events/123e4567-e89b-12d3-a456-426614174000
    {
        "type": "AGM",
        "time": "2:00 PM"
    }
    ```
    """
    try:
        import uuid
        event_uuid = uuid.UUID(event_id)
        event = service.update(event_uuid, event_update)
        
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with ID {event_id} not found"
            )
        
        return event
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid event ID format: {event_id}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating event: {str(e)}"
        )


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Event",
    description="Delete an upcoming event (admin only)"
)
def delete_event(
    event_id: str,
    current_user: CurrentUser,
    service: UpcomingEventsService = Depends(get_upcoming_events_service)
):
    """
    Delete an upcoming event.
    
    **Note:** In production, restrict this endpoint to admin users.
    
    **Path Parameters:**
    - `event_id`: UUID of the event to delete
    
    **Example:**
    ```
    DELETE /api/v1/upcoming-events/123e4567-e89b-12d3-a456-426614174000
    ```
    """
    try:
        import uuid
        event_uuid = uuid.UUID(event_id)
        deleted = service.delete(event_uuid)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with ID {event_id} not found"
            )
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid event ID format: {event_id}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting event: {str(e)}"
        )
