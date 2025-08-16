from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, Session
from app.api.deps import get_current_user, get_session_dep
from app.model.portfolio import (
    Watchlist, WatchlistCreate, WatchlistUpdate, WatchlistPublic,
    WatchlistItem, WatchlistItemCreate, WatchlistItemPublic
)
from app.model.user import User
from app.model.stock import StockCompany
from pydantic import BaseModel

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


# Watchlist Management APIs
@router.post("/", response_model=WatchlistPublic)
def create_watchlist(
    watchlist: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Create a new watchlist for the current user"""
    # Check if this is the first watchlist (make it default)
    existing_watchlists = session.exec(
        select(Watchlist).where(Watchlist.user_id == current_user.id)
    ).all()
    
    if not existing_watchlists:
        watchlist.is_default = True
    
    # If this watchlist is set as default, unset others
    if watchlist.is_default:
        for existing in existing_watchlists:
            existing.is_default = False
            session.add(existing)
    
    db_watchlist = Watchlist(
        user_id=current_user.id,
        **watchlist.dict()
    )
    session.add(db_watchlist)
    session.commit()
    session.refresh(db_watchlist)
    return db_watchlist


@router.get("/", response_model=List[WatchlistPublic])
def get_user_watchlists(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get all watchlists for the current user"""
    watchlists = session.exec(
        select(Watchlist).where(Watchlist.user_id == current_user.id)
    ).all()
    return watchlists


@router.get("/{watchlist_id}", response_model=WatchlistPublic)
def get_watchlist(
    watchlist_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get a specific watchlist by ID"""
    watchlist = session.exec(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    ).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found"
        )
    
    return watchlist


@router.put("/{watchlist_id}", response_model=WatchlistPublic)
def update_watchlist(
    watchlist_id: UUID,
    watchlist_update: WatchlistUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Update a watchlist"""
    watchlist = session.exec(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    ).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found"
        )
    
    # If setting as default, unset other watchlists
    if watchlist_update.is_default:
        other_watchlists = session.exec(
            select(Watchlist).where(
                Watchlist.user_id == current_user.id,
                Watchlist.id != watchlist_id
            )
        ).all()
        for other in other_watchlists:
            other.is_default = False
            session.add(other)
    
    update_data = watchlist_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(watchlist, field, value)
    
    session.add(watchlist)
    session.commit()
    session.refresh(watchlist)
    return watchlist


@router.delete("/{watchlist_id}")
def delete_watchlist(
    watchlist_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Delete a watchlist"""
    watchlist = session.exec(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    ).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found"
        )
    
    # Don't allow deletion of default watchlist if it's the only one
    if watchlist.is_default:
        other_watchlists = session.exec(
            select(Watchlist).where(
                Watchlist.user_id == current_user.id,
                Watchlist.id != watchlist_id
            )
        ).all()
        if not other_watchlists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the only watchlist"
            )
    
    session.delete(watchlist)
    session.commit()
    return {"message": "Watchlist deleted successfully"}


# Watchlist Item Management APIs
@router.post("/{watchlist_id}/items", response_model=WatchlistItemPublic)
def add_watchlist_item(
    watchlist_id: UUID,
    item: WatchlistItemCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Add a new stock to a watchlist"""
    # Verify watchlist belongs to user
    watchlist = session.exec(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    ).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found"
        )
    
    # Verify stock exists
    stock = session.exec(
        select(StockCompany).where(StockCompany.id == item.stock_id)
    ).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock not found"
        )
    
    # Check if item already exists in this watchlist
    existing_item = session.exec(
        select(WatchlistItem).where(
            WatchlistItem.watchlist_id == watchlist_id,
            WatchlistItem.stock_id == item.stock_id
        )
    ).first()
    
    if existing_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock already exists in this watchlist"
        )
    
    watchlist_item = WatchlistItem(
        watchlist_id=watchlist_id,
        stock_id=item.stock_id,
        notes=item.notes
    )
    
    session.add(watchlist_item)
    session.commit()
    session.refresh(watchlist_item)
    return watchlist_item


@router.get("/{watchlist_id}/items", response_model=List[WatchlistItemPublic])
def get_watchlist_items(
    watchlist_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get all items in a watchlist"""
    # Verify watchlist belongs to user
    watchlist = session.exec(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    ).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found"
        )
    
    items = session.exec(
        select(WatchlistItem).where(
            WatchlistItem.watchlist_id == watchlist_id
        )
    ).all()
    
    return items


@router.put("/{watchlist_id}/items/{item_id}", response_model=WatchlistItemPublic)
def update_watchlist_item(
    watchlist_id: UUID,
    item_id: UUID,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Update a watchlist item (currently only notes can be updated)"""
    # Verify watchlist belongs to user
    watchlist = session.exec(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    ).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found"
        )
    
    item = session.exec(
        select(WatchlistItem).where(
            WatchlistItem.id == item_id,
            WatchlistItem.watchlist_id == watchlist_id
        )
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist item not found"
        )
    
    if notes is not None:
        item.notes = notes
    
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/{watchlist_id}/items/{item_id}")
def remove_watchlist_item(
    watchlist_id: UUID,
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Remove a stock from watchlist"""
    # Verify watchlist belongs to user
    watchlist = session.exec(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    ).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found"
        )
    
    item = session.exec(
        select(WatchlistItem).where(
            WatchlistItem.id == item_id,
            WatchlistItem.watchlist_id == watchlist_id
        )
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist item not found"
        )
    
    session.delete(item)
    session.commit()
    return {"message": "Stock removed from watchlist successfully"}


# Bulk Operations for Watchlist Items
@router.post("/{watchlist_id}/items/bulk")
def add_multiple_stocks(
    watchlist_id: UUID,
    stock_ids: List[UUID],
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Add multiple stocks to a watchlist at once"""
    # Verify watchlist belongs to user
    watchlist = session.exec(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    ).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found"
        )
    
    added_count = 0
    skipped_count = 0
    
    for stock_id in stock_ids:
        # Verify stock exists
        stock = session.exec(
            select(StockCompany).where(StockCompany.id == stock_id)
        ).first()
        
        if not stock:
            continue
        
        # Check if already exists
        existing_item = session.exec(
            select(WatchlistItem).where(
                WatchlistItem.watchlist_id == watchlist_id,
                WatchlistItem.stock_id == stock_id
            )
        ).first()
        
        if existing_item:
            skipped_count += 1
            continue
        
        watchlist_item = WatchlistItem(
            watchlist_id=watchlist_id,
            stock_id=stock_id
        )
        session.add(watchlist_item)
        added_count += 1
    
    session.commit()
    
    return {
        "message": f"Added {added_count} stocks to watchlist",
        "added_count": added_count,
        "skipped_count": skipped_count
    }


class BulkRemoveRequest(BaseModel):
    item_ids: List[UUID] | None = None
    stock_ids: List[UUID] | None = None


@router.post("/{watchlist_id}/items/bulk-remove")
def remove_multiple_stocks(
    watchlist_id: UUID,
    payload: BulkRemoveRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Remove multiple stocks from a watchlist at once.
    Accepts either explicit watchlist item IDs or stock IDs within the watchlist.
    """
    # Verify watchlist belongs to user
    watchlist = session.exec(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    ).first()

    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found"
        )

    removed_count = 0

    # Remove by item_ids
    if payload.item_ids:
        items = session.exec(
            select(WatchlistItem).where(
                WatchlistItem.watchlist_id == watchlist_id,
                WatchlistItem.id.in_(payload.item_ids)
            )
        ).all()
        for item in items:
            session.delete(item)
            removed_count += 1

    # Remove by stock_ids
    if payload.stock_ids:
        items = session.exec(
            select(WatchlistItem).where(
                WatchlistItem.watchlist_id == watchlist_id,
                WatchlistItem.stock_id.in_(payload.stock_ids)
            )
        ).all()
        for item in items:
            session.delete(item)
            removed_count += 1

    session.commit()
    return {"message": f"Removed {removed_count} items from watchlist", "removed_count": removed_count}


class BulkSymbolsRequest(BaseModel):
    symbols: List[str]


@router.post("/{watchlist_id}/items/bulk-by-symbols")
def add_multiple_by_symbols(
    watchlist_id: UUID,
    payload: BulkSymbolsRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Add multiple symbols (tickers) to a watchlist by their symbol string.
    Symbols that do not match any known stock will be skipped.
    """
    # Verify watchlist belongs to user
    watchlist = session.exec(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    ).first()

    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found"
        )

    added = 0
    skipped: List[str] = []

    for sym in payload.symbols:
        symbol = (sym or "").strip()
        if not symbol:
            continue
        stock = session.exec(
            select(StockCompany).where(StockCompany.symbol == symbol)
        ).first()
        if not stock:
            skipped.append(symbol)
            continue
        existing_item = session.exec(
            select(WatchlistItem).where(
                WatchlistItem.watchlist_id == watchlist_id,
                WatchlistItem.stock_id == stock.id
            )
        ).first()
        if existing_item:
            continue
        session.add(WatchlistItem(watchlist_id=watchlist_id, stock_id=stock.id))
        added += 1

    session.commit()
    return {"message": f"Added {added} symbols", "added_count": added, "skipped": skipped}


# Search stocks to add to watchlist
@router.get("/search/stocks")
def search_stocks(
    query: str,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Search for stocks to add to watchlist"""
    if len(query) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query must be at least 2 characters"
        )
    
    # Search by symbol or company name
    stocks = session.exec(
        select(StockCompany).where(
            (StockCompany.symbol.ilike(f"%{query}%")) |
            (StockCompany.company_name.ilike(f"%{query}%"))
        ).limit(limit)
    ).all()
    
    return [
        {
            "id": stock.id,
            "symbol": stock.symbol,
            "company_name": stock.company_name,
            "sector": stock.sector,
            "industry": stock.industry
        }
        for stock in stocks
    ]


# Get watchlist with stock details
@router.get("/{watchlist_id}/items/with-details")
def get_watchlist_items_with_details(
    watchlist_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get watchlist items with stock details"""
    # Verify watchlist belongs to user
    watchlist = session.exec(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id
        )
    ).first()
    
    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found"
        )
    
    # Get items with stock details using join
    items = session.exec(
        select(WatchlistItem, StockCompany).join(
            StockCompany, WatchlistItem.stock_id == StockCompany.id
        ).where(WatchlistItem.watchlist_id == watchlist_id)
    ).all()
    
    return [
        {
            "id": item.id,
            "added_at": item.added_at,
            "notes": item.notes,
            "stock": {
                "id": stock.id,
                "symbol": stock.symbol,
                "company_name": stock.company_name,
                "sector": stock.sector,
                "industry": stock.industry
            }
        }
        for item, stock in items
    ] 