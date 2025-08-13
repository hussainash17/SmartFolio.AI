from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, func, desc

from app.api.deps import get_session_dep
from app.model.stock import (
    DailyOHLC,
    IntradayTick,
    MarketSummary,
    StockCompany,
    StockCompanyPublic,
    StockData,
    StockDataPublic,
)

router = APIRouter(prefix="/market", tags=["market"]) 


@router.get("/summary")
def get_market_summary(session: Session = Depends(get_session_dep)) -> Dict[str, Any]:
    latest = session.exec(
        select(MarketSummary).order_by(MarketSummary.timestamp.desc()).limit(1)
    ).first()
    if not latest:
        return {}
    return {
        "id": str(latest.id),
        "date": latest.date,
        "total_trades": latest.total_trades,
        "total_volume": latest.total_volume,
        "total_turnover": str(latest.total_turnover),
        "dse_index": str(latest.dse_index) if latest.dse_index is not None else None,
        "dse_index_change": str(latest.dse_index_change) if latest.dse_index_change is not None else None,
        "dse_index_change_percent": str(latest.dse_index_change_percent) if latest.dse_index_change_percent is not None else None,
        "cse_index": str(latest.cse_index) if latest.cse_index is not None else None,
        "cse_index_change": str(latest.cse_index_change) if latest.cse_index_change is not None else None,
        "cse_index_change_percent": str(latest.cse_index_change_percent) if latest.cse_index_change_percent is not None else None,
        "advancers": latest.advancers,
        "decliners": latest.decliners,
        "unchanged": latest.unchanged,
        "timestamp": latest.timestamp,
    }


@router.get("/stocks")
def list_stocks(
    q: Optional[str] = Query(None, description="Search by symbol or company name"),
    sector: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session_dep),
) -> List[Dict[str, Any]]:
    stmt = select(StockCompany)
    if q:
        like = f"%{q.upper()}%"
        stmt = stmt.where((StockCompany.symbol.ilike(like)) | (StockCompany.company_name.ilike(like)))
    if sector:
        stmt = stmt.where(StockCompany.sector == sector)
    stmt = stmt.offset(offset).limit(limit)

    companies = session.exec(stmt).all()

    # Fetch latest StockData for these companies
    result: List[Dict[str, Any]] = []
    for company in companies:
        latest_data = session.exec(
            select(StockData)
            .where(StockData.company_id == company.id)
            .order_by(StockData.timestamp.desc())
            .limit(1)
        ).first()
        result.append(
            {
                "id": str(company.id),
                "symbol": company.symbol,
                "company_name": company.company_name,
                "sector": company.sector,
                "industry": company.industry,
                "last": str(latest_data.last_trade_price) if latest_data else None,
                "change": str(latest_data.change) if latest_data else None,
                "change_percent": str(latest_data.change_percent) if latest_data else None,
                "volume": latest_data.volume if latest_data else None,
                "turnover": str(latest_data.turnover) if latest_data else None,
                "timestamp": latest_data.timestamp if latest_data else None,
            }
        )
    return result


@router.get("/stocks/{symbol}")
def get_stock(symbol: str, session: Session = Depends(get_session_dep)) -> Dict[str, Any]:
    company = session.exec(select(StockCompany).where(StockCompany.symbol == symbol.upper())).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")

    latest_data = session.exec(
        select(StockData)
        .where(StockData.company_id == company.id)
        .order_by(StockData.timestamp.desc())
        .limit(1)
    ).first()

    return {
        "id": str(company.id),
        "symbol": company.symbol,
        "company_name": company.company_name,
        "sector": company.sector,
        "industry": company.industry,
        "data": {
            "last_trade_price": str(latest_data.last_trade_price) if latest_data else None,
            "change": str(latest_data.change) if latest_data else None,
            "change_percent": str(latest_data.change_percent) if latest_data else None,
            "high": str(latest_data.high) if latest_data else None,
            "low": str(latest_data.low) if latest_data else None,
            "open_price": str(latest_data.open_price) if latest_data else None,
            "previous_close": str(latest_data.previous_close) if latest_data else None,
            "volume": latest_data.volume if latest_data else None,
            "turnover": str(latest_data.turnover) if latest_data else None,
            "trades_count": latest_data.trades_count if latest_data else None,
            "timestamp": latest_data.timestamp if latest_data else None,
        }
        if latest_data
        else None,
    }


@router.get("/stocks/{symbol}/chart")
def get_chart_data(
    symbol: str,
    timeframe: str = Query(
        "1D", description="1D (intraday ticks), 1W, 1M, 3M, 6M, 1Y, 2Y, 5Y, ALL for daily OHLC"
    ),
    session: Session = Depends(get_session_dep),
) -> Dict[str, Any]:
    company = session.exec(select(StockCompany).where(StockCompany.symbol == symbol.upper())).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")

    if timeframe.upper() == "1D":
        # Intraday ticks of current day
        start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        ticks = session.exec(
            select(IntradayTick)
            .where(IntradayTick.company_id == company.id, IntradayTick.timestamp >= start)
            .order_by(IntradayTick.timestamp)
        ).all()
        return {
            "symbol": company.symbol,
            "type": "intraday",
            "points": [
                {
                    "t": tick.timestamp,
                    "p": float(tick.price),
                    "v": tick.volume,
                }
                for tick in ticks
            ],
        }

    period_map = {
        "1W": 7,
        "1M": 30,
        "3M": 90,
        "6M": 180,
        "1Y": 365,
        "2Y": 730,
        "5Y": 1825,
        "ALL": 3650,
    }
    days = period_map.get(timeframe.upper(), 365)
    start_date = datetime.utcnow() - timedelta(days=days)

    candles = session.exec(
        select(DailyOHLC)
        .where(DailyOHLC.company_id == company.id, DailyOHLC.date >= start_date)
        .order_by(DailyOHLC.date)
    ).all()

    return {
        "symbol": company.symbol,
        "type": "daily",
        "candles": [
            {
                "t": candle.date,
                "o": float(candle.open_price),
                "h": float(candle.high),
                "l": float(candle.low),
                "c": float(candle.close_price),
                "v": candle.volume,
            }
            for candle in candles
        ],
    }


@router.get("/top-movers")
def get_top_movers(
    limit: int = Query(10, ge=1, le=50),
    session: Session = Depends(get_session_dep),
) -> Dict[str, List[Dict[str, Any]]]:
    # Determine latest timestamp across StockData
    latest_ts = session.exec(select(func.max(StockData.timestamp))).one()
    if not latest_ts or not latest_ts[0]:
        return {"gainers": [], "losers": []}

    latest_time = latest_ts[0]

    # Top gainers
    gainers = session.exec(
        select(StockData, StockCompany)
        .join(StockCompany, StockCompany.id == StockData.company_id)
        .where(StockData.timestamp == latest_time)
        .order_by(desc(StockData.change_percent))
        .limit(limit)
    ).all()

    # Top losers
    losers = session.exec(
        select(StockData, StockCompany)
        .join(StockCompany, StockCompany.id == StockData.company_id)
        .where(StockData.timestamp == latest_time)
        .order_by(StockData.change_percent.asc())
        .limit(limit)
    ).all()

    def serialize(rows: List[tuple[StockData, StockCompany]]) -> List[Dict[str, Any]]:
        data: List[Dict[str, Any]] = []
        for sd, sc in rows:
            data.append(
                {
                    "symbol": sc.symbol,
                    "company_name": sc.company_name,
                    "last": float(sd.last_trade_price),
                    "change": float(sd.change),
                    "change_percent": float(sd.change_percent),
                    "volume": sd.volume,
                }
            )
        return data

    return {"gainers": serialize(gainers), "losers": serialize(losers)}