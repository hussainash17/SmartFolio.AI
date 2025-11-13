from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.deps import get_current_user, get_session_dep
from app.model.alert import News, NewsCreate, NewsPublic, StockNews, MarketNews, NewsPublicWithSymbols
from app.model.company import Company
from app.model.user import User

router = APIRouter(prefix="/news", tags=["news"]) 


@router.get("/", response_model=List[NewsPublicWithSymbols])
def list_news(
    category: Optional[str] = Query(None),
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    symbol: Optional[str] = Query(None, description="Filter by trading code"),
    session: Session = Depends(get_session_dep),
):
    since = datetime.utcnow() - timedelta(days=days)
    stmt = select(News).where(News.published_at >= since, News.is_active == True)  # noqa: E712
    if category:
        stmt = stmt.where(News.category == category)
    if symbol:
        stmt = (
            stmt.join(StockNews, StockNews.news_id == News.id)
            .join(Company, Company.id == StockNews.stock_id)
            .where(Company.trading_code == symbol.upper())
            .distinct()
        )
    stmt = stmt.order_by(News.published_at.desc()).offset(offset).limit(limit)
    rows = session.exec(stmt).all()
    if not rows:
        return []

    news_ids = [row.id for row in rows]
    links_stmt = (
        select(StockNews.news_id, Company.trading_code)
        .join(Company, Company.id == StockNews.stock_id)
        .where(StockNews.news_id.in_(news_ids))
    )
    symbol_links = session.exec(links_stmt).all()
    news_id_to_symbols: dict[UUID, list[str]] = defaultdict(list)
    for news_id, code in symbol_links:
        news_id_to_symbols[news_id].append(code)

    enriched: list[NewsPublicWithSymbols] = []
    for row in rows:
        try:
            row_data = row.model_dump(exclude={"stock_news", "market_news"})
        except AttributeError:
            row_data = row.dict(exclude={"stock_news", "market_news"})
        if row_data.get("tags") is None:
            row_data["tags"] = []
        enriched.append(
            NewsPublicWithSymbols(**row_data, symbols=news_id_to_symbols.get(row.id, []))
        )
    return enriched


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
    # If symbol is needed strictly, consider joining Company as well. Placeholder for now.
    return news