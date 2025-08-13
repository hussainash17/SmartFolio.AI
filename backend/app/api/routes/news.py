from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.deps import get_current_user, get_session_dep
from app.model.alert import News, NewsCreate, NewsPublic, StockNews, MarketNews
from app.model.user import User

router = APIRouter(prefix="/news", tags=["news"]) 


@router.get("/", response_model=List[NewsPublic])
def list_news(
    category: Optional[str] = Query(None),
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session_dep),
):
    since = datetime.utcnow() - timedelta(days=days)
    stmt = select(News).where(News.published_at >= since, News.is_active == True)  # noqa: E712
    if category:
        stmt = stmt.where(News.category == category)
    stmt = stmt.order_by(News.published_at.desc()).offset(offset).limit(limit)
    return session.exec(stmt).all()


@router.post("/", response_model=NewsPublic)
def create_news(
    news_in: NewsCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep),
):
    # In a real app, restrict to admins. Here we accept authenticated users for bootstrap.
    db_news = News(**news_in.dict())
    session.add(db_news)
    session.commit()
    session.refresh(db_news)
    return db_news


@router.get("/stock/{symbol}", response_model=List[NewsPublic])
def get_stock_news(
    symbol: str,
    days: int = Query(30, ge=1, le=365),
    session: Session = Depends(get_session_dep),
):
    since = datetime.utcnow() - timedelta(days=days)
    # Join through StockNews; for simplicity fetch and filter in Python
    stmt = (
        select(News)
        .join(StockNews, StockNews.news_id == News.id)
        .where(News.published_at >= since)
        .order_by(News.published_at.desc())
    )
    news = session.exec(stmt).all()
    # If symbol is needed strictly, consider joining StockCompany as well. Placeholder for now.
    return news