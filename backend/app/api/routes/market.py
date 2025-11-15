from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select, func, desc

from app.api.deps import SessionDep
from app.model.company import Company
from app.model.stock import (
    DailyOHLC,
    IntradayTick,
    MarketSummary,
    StockData,
)

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/summary")
def get_market_summary(MarketSummary, session: SessionDep) -> Dict[str, Any]:
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
        "dse_index_change_percent": str(
            latest.dse_index_change_percent) if latest.dse_index_change_percent is not None else None,
        "cse_index": str(latest.cse_index) if latest.cse_index is not None else None,
        "cse_index_change": str(latest.cse_index_change) if latest.cse_index_change is not None else None,
        "cse_index_change_percent": str(
            latest.cse_index_change_percent) if latest.cse_index_change_percent is not None else None,
        "advancers": latest.advancers,
        "decliners": latest.decliners,
        "unchanged": latest.unchanged,
        "timestamp": latest.timestamp,
    }


@router.get("/stocks")
def list_stocks(
        session: SessionDep,
        q: Optional[str] = Query(None, description="Search by symbol or company name"),
        sector: Optional[str] = None,
        limit: int = Query(50, ge=1, le=500),
        offset: int = Query(0, ge=0),
) -> List[Dict[str, Any]]:
    stmt = select(Company)
    if q:
        like = f"%{q.upper()}%"
        stmt = stmt.where((Company.trading_code.ilike(like)) | (Company.company_name.ilike(like)))
    if sector:
        stmt = stmt.where(Company.sector == sector)
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
        # Calculate market cap: last_trade_price × total_outstanding_securities (in crores)
        market_cap = None
        if latest_data and company.total_outstanding_securities:
            try:
                # Market cap in crores (1 crore = 10,000,000)
                market_cap = (float(latest_data.last_trade_price) * company.total_outstanding_securities) / 10_000_000
            except (ValueError, TypeError):
                market_cap = None

        result.append(
            {
                "id": str(company.id),
                "symbol": company.trading_code,
                "company_name": company.company_name,
                "sector": company.sector,
                "industry": company.industry,
                "last": str(latest_data.last_trade_price) if latest_data else None,
                "change": str(latest_data.change) if latest_data else None,
                "change_percent": str(latest_data.change_percent) if latest_data else None,
                "volume": latest_data.volume if latest_data else None,
                "turnover": str(latest_data.turnover) if latest_data else None,
                "timestamp": latest_data.timestamp if latest_data else None,
                "total_outstanding_securities": company.total_outstanding_securities,
                "market_cap": str(market_cap) if market_cap is not None else None,
            }
        )
    return result


@router.get("/stocks/{symbol}")
def get_stock(symbol: str, session: SessionDep) -> Dict[str, Any]:
    company = session.exec(select(Company).where(Company.trading_code == symbol.upper())).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")

    latest_data = session.exec(
        select(StockData)
        .where(StockData.company_id == company.id)
        .order_by(StockData.timestamp.desc())
        .limit(1)
    ).first()

    # Calculate market cap: last_trade_price × total_outstanding_securities (in crores)
    market_cap = None
    if latest_data and company.total_outstanding_securities:
        try:
            # Market cap in crores (1 crore = 10,000,000)
            market_cap = (float(latest_data.last_trade_price) * company.total_outstanding_securities) / 10_000_000
        except (ValueError, TypeError):
            market_cap = None

    return {
        "id": str(company.id),
        "symbol": company.trading_code,
        "company_name": company.company_name,
        "sector": company.sector,
        "industry": company.industry,
        "total_outstanding_securities": company.total_outstanding_securities,
        "market_cap": str(market_cap) if market_cap is not None else None,
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
        session: SessionDep,
        symbol: str,
        timeframe: str = Query(
            "1D", description="1D (intraday ticks), 1W, 1M, 3M, 6M, 1Y, 2Y, 5Y, ALL for daily OHLC"
        ),
) -> Dict[str, Any]:
    company = session.exec(select(Company).where(Company.trading_code == symbol.upper())).first()
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
            "symbol": company.trading_code,
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
        "symbol": company.trading_code,
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
        session: SessionDep,
        limit: int = Query(10, ge=1, le=50),
) -> Dict[str, List[Dict[str, Any]]]:
    # Determine latest timestamp across StockData
    latest_time_row = session.exec(
        select(func.max(StockData.timestamp))
    ).first()
    if not latest_time_row or latest_time_row[0] is None:
        return {"gainers": [], "losers": []}
    latest_time = latest_time_row[0]

    # Top gainers
    gainers = session.exec(
        select(StockData, Company)
        .join(Company, Company.id == StockData.company_id)
        .where(StockData.timestamp == latest_time)
        .order_by(desc(StockData.change_percent))
        .limit(limit)
    ).all()

    # Top losers
    losers = session.exec(
        select(StockData, Company)
        .join(Company, Company.id == StockData.company_id)
        .where(StockData.timestamp == latest_time)
        .order_by(StockData.change_percent.asc())
        .limit(limit)
    ).all()

    def serialize(rows: List[tuple[StockData, Company]]) -> List[Dict[str, Any]]:
        data: List[Dict[str, Any]] = []
        for sd, sc in rows:
            data.append(
                {
                    "symbol": sc.trading_code,
                    "company_name": sc.company_name,
                    "last": float(sd.last_trade_price),
                    "change": float(sd.change),
                    "change_percent": float(sd.change_percent),
                    "volume": sd.volume,
                }
            )
        return data

    return {"gainers": serialize(gainers), "losers": serialize(losers)}


@router.get("/most-active")
def get_most_active(
        session: SessionDep,
        limit: int = Query(10, ge=1, le=50),
) -> List[Dict[str, Any]]:
    # Determine latest timestamp across StockData
    latest_time_row = session.exec(
        select(func.max(StockData.timestamp))
    ).first()
    if not latest_time_row or latest_time_row[0] is None:
        return []
    latest_time = latest_time_row[0]

    rows = session.exec(
        select(StockData, Company)
        .join(Company, Company.id == StockData.company_id)
        .where(StockData.timestamp == latest_time)
        .order_by(desc(StockData.volume))
        .limit(limit)
    ).all()

    data: List[Dict[str, Any]] = []
    for sd, sc in rows:
        data.append(
            {
                "symbol": sc.trading_code,
                "company_name": sc.company_name,
                "last": float(sd.last_trade_price),
                "change": float(sd.change),
                "change_percent": float(sd.change_percent),
                "volume": sd.volume,
                "turnover": float(sd.turnover),
            }
        )
    return data


@router.get("/indices")
def get_indices(
        session: SessionDep,
        days: int = Query(5, ge=1, le=90),
) -> Dict[str, Any]:
    """Return index levels and short history for sparklines.
    Currently supports DSEX from MarketSummary; DS30 and DSES are placeholders until scraped.
    """
    since = datetime.utcnow() - timedelta(days=days)
    summaries = session.exec(
        select(MarketSummary)
        .where(MarketSummary.date >= since)
        .order_by(MarketSummary.timestamp.asc())
    ).all() or []

    def build_series(field_name: str) -> List[Dict[str, Any]]:
        series: List[Dict[str, Any]] = []
        for s in summaries:
            val = getattr(s, field_name, None)
            if val is not None:
                series.append({"t": s.timestamp, "v": float(val)})
        return series

    dsex_series = build_series("dse_index")
    cse_series = build_series("cse_index")

    latest = summaries[-1] if summaries else None

    return {
        "DSEX": {
            "level": float(latest.dse_index) if latest and latest.dse_index is not None else None,
            "change": float(latest.dse_index_change) if latest and latest.dse_index_change is not None else None,
            "change_percent": float(
                latest.dse_index_change_percent) if latest and latest.dse_index_change_percent is not None else None,
            "series": dsex_series,
        },
        "DS30": {
            "level": None,
            "change": None,
            "change_percent": None,
            "series": [],
        },
        "DSES": {
            "level": None,
            "change": None,
            "change_percent": None,
            "series": [],
        },
        "CSE": {
            "level": float(latest.cse_index) if latest and latest.cse_index is not None else None,
            "change": float(latest.cse_index_change) if latest and latest.cse_index_change is not None else None,
            "change_percent": float(
                latest.cse_index_change_percent) if latest and latest.cse_index_change_percent is not None else None,
            "series": cse_series,
        },
    }


@router.get("/turnover/compare")
def get_turnover_compare(session: SessionDep) -> Dict[str, Any]:
    """Compare latest total_turnover with previous trading day's total_turnover."""
    latest = session.exec(
        select(MarketSummary).order_by(MarketSummary.timestamp.desc()).limit(1)
    ).first()
    if not latest:
        return {"current": 0.0, "previous": 0.0, "change_percent": 0.0}

    # Find previous day's last summary
    prev = session.exec(
        select(MarketSummary)
        .where(MarketSummary.date < latest.date)
        .order_by(MarketSummary.date.desc(), MarketSummary.timestamp.desc())
        .limit(1)
    ).first()

    current_val = float(latest.total_turnover or 0)
    prev_val = float(prev.total_turnover) if prev and prev.total_turnover is not None else 0.0
    change_pct = ((current_val - prev_val) / prev_val * 100.0) if prev_val > 0 else 0.0
    return {"current": current_val, "previous": prev_val, "change_percent": change_pct}


@router.get("/flows")
def get_market_flows(session: SessionDep) -> Dict[str, Any]:
    """Return placeholder market flow data: insider/institutional/foreign flows.
    Replace with real data sources when available.
    """
    # Placeholder data
    return {
        "bulk_trades": [
            {"symbol": "BULK1", "quantity": 500000, "price": 50.0, "side": "BUY", "date": datetime.utcnow()},
            {"symbol": "BULK2", "quantity": 350000, "price": 22.7, "side": "SELL", "date": datetime.utcnow()},
        ],
        "director_transactions": [
            {"symbol": "DIR1", "name": "Sponsor A", "side": "BUY", "quantity": 20000, "date": datetime.utcnow()},
            {"symbol": "DIR2", "name": "Director B", "side": "SELL", "quantity": 15000, "date": datetime.utcnow()},
        ],
        "foreign_net_flow": {
            "net_buy_value": 12_500_000.0,
            "trend": [-1.2, 0.5, 0.8, -0.3, 1.9, 2.1, 0.4],
        },
    }


@router.get("/macro")
def get_macro_snapshot() -> Dict[str, Any]:
    """Return snapshot of commodities and FX. Placeholder values; integrate real APIs later."""
    now = datetime.utcnow()
    return {
        "timestamp": now,
        "commodities": {
            "oil_brent_usd": 85.2,
            "lng_spot_usd_mmbtu": 10.8,
            "steel_rebar_usd_ton": 615.0,
        },
        "fx": {
            "usd_bdt": 117.5,
            "usd_bdt_trend": [116.9, 117.2, 117.1, 117.3, 117.6, 117.4, 117.5],
        },
    }


@router.get("/events/upcoming")
def get_upcoming_events(limit: int = Query(20, ge=1, le=100)) -> Dict[str, Any]:
    """Return upcoming market events (AGMs, EGMs, Record Dates, IPO listings). Placeholder content."""
    base_date = datetime.utcnow()
    events: List[Dict[str, Any]] = []
    for i in range(1, min(limit, 20) + 1):
        events.append({"type": "AGM", "company": f"COMP{i:03d}", "date": base_date + timedelta(days=i),
                       "note": "Annual General Meeting"})
        if i % 3 == 0:
            events.append({"type": "EGM", "company": f"COMP{i:03d}", "date": base_date + timedelta(days=i + 1),
                           "note": "Extraordinary General Meeting"})
        if i % 4 == 0:
            events.append({"type": "RECORD", "company": f"COMP{i:03d}", "date": base_date + timedelta(days=i + 2),
                           "note": "Record Date"})
        if i % 5 == 0:
            events.append({"type": "IPO", "company": f"IPO{i:03d}", "date": base_date + timedelta(days=i + 3),
                           "note": "IPO Listing"})
    return {"events": events}
