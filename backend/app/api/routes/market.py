from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.api.deps import SessionDep
from app.model.company import Company
from app.model.performance import BenchmarkData
from app.model.stock import (
    DailyOHLC,
    IntradayTick,
    MarketSummary,
    StockData,
)
from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select, func, desc

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/benchmark/{benchmark_id}/last-5-days")
def get_benchmark_last_5_days(benchmark_id: str, session: SessionDep) -> Dict[str, Any]:
    """Get the last 5 trading days of benchmark data.
    
    Returns the last 5 trading days of benchmark data with date and value in crore.
    Values are converted from million (stored in DB) to crore.
    
    Args:
        benchmark_id: The benchmark identifier (e.g., 'DSEX')
        session: Database session
    
    Returns:
        Dict containing benchmark_id, data array with date and value_in_crore
    """
    from sqlalchemy import text
    
    # Fetch last 5 trading days in a single query
    query = text("""
        SELECT date, total_value
        FROM benchmark_data
        WHERE benchmark_id = :benchmark_id
        ORDER BY date DESC
        LIMIT 5
    """)
    
    result = session.execute(query, {"benchmark_id": benchmark_id}).fetchall()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No data found for benchmark '{benchmark_id}'"
        )

    # Reverse to get chronological order (oldest to newest)
    result = list(reversed(result))

    # Format response with values converted from million to crore
    data = []
    for row in result:
        total_value = float(row.total_value) if row.total_value else 0.0
        
        # Convert from million to crore (1 crore = 10 million)
        value_in_crore = total_value / 10.0
        data.append({
            "date": row.date,
            "value_in_crore": round(value_in_crore, 2)
        })

    return {
        "benchmark_id": benchmark_id,
        "data": data
    }


@router.get("/benchmark/{benchmark_id}")
def get_benchmark_data(benchmark_id: str, session: SessionDep) -> Dict[str, Any]:
    """Get benchmark index data by benchmark_id.
    
    Returns today's data if available, otherwise returns the most recent data.
    Includes index value, change, trades, volume, and turnover.
    
    Args:
        benchmark_id: The benchmark identifier (e.g., 'DSEX', 'CSE')
        session: Database session
    
    Returns:
        Dict containing benchmark data including close_value, daily_return, 
        trades, volume, total_value (turnover), and date
    """
    from datetime import date as date_type

    # Try to get today's data first
    today = date_type.today()
    benchmark = session.exec(
        select(BenchmarkData)
        .where(BenchmarkData.benchmark_id == benchmark_id)
        .where(BenchmarkData.date == today)
    ).first()

    # If no data for today, get the most recent data
    if not benchmark:
        benchmark = session.exec(
            select(BenchmarkData)
            .where(BenchmarkData.benchmark_id == benchmark_id)
            .order_by(BenchmarkData.date.desc())
            .limit(1)
        ).first()

    if not benchmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No data found for benchmark '{benchmark_id}'"
        )

    # Query raw row to get all columns including those not in the model
    from sqlalchemy import text
    raw_query = text("""
        SELECT close_value, open_value, high_value, low_value,
               daily_return, return_1d, trades, volume, total_value, date
        FROM benchmark_data
        WHERE id = :id
    """)
    result = session.execute(raw_query, {"id": benchmark.id}).fetchone()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No data found for benchmark '{benchmark_id}'"
        )

    # Use daily_return if available, otherwise fall back to return_1d
    daily_return_pct = float(result.daily_return) if result.daily_return is not None else (
        float(result.return_1d) if result.return_1d is not None else 0.0)
    close_val = float(result.close_value)
    # Calculate absolute change from percentage
    absolute_change = close_val * (daily_return_pct / 100) if daily_return_pct != 0 else 0.0

    return {
        "benchmark_id": benchmark.benchmark_id,
        "date": result.date,
        "close_value": close_val,
        "open_value": float(result.open_value) if result.open_value is not None else None,
        "high_value": float(result.high_value) if result.high_value is not None else None,
        "low_value": float(result.low_value) if result.low_value is not None else None,
        "daily_return": daily_return_pct,
        "change": absolute_change,
        "trades": int(result.trades) if result.trades is not None else None,
        "volume": int(result.volume) if result.volume is not None else None,
        "total_value": float(result.total_value) if result.total_value is not None else None,
    }


@router.get("/benchmark/{benchmark_id}/performance")
def get_benchmark_performance(benchmark_id: str, session: SessionDep) -> Dict[str, Any]:
    """Get benchmark performance over multiple time periods.
    
    Returns benchmark index performance changes over 1 day, 1 week, 1 month, and YTD.
    Useful for comparing portfolio performance against market benchmarks.
    
    Args:
        benchmark_id: The benchmark identifier (e.g., 'DSEX', 'DSES', 'DS30')
        session: Database session
    
    Returns:
        Dict containing benchmark info and performance metrics for each period
    """
    from datetime import date as date_type
    from app.model.performance import Benchmark

    # Verify benchmark exists
    benchmark = session.get(Benchmark, benchmark_id)
    if not benchmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Benchmark '{benchmark_id}' not found"
        )

    # Get the most recent data point (current value)
    latest_data = session.exec(
        select(BenchmarkData)
        .where(BenchmarkData.benchmark_id == benchmark_id)
        .order_by(BenchmarkData.date.desc())
        .limit(1)
    ).first()

    if not latest_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No data found for benchmark '{benchmark_id}'"
        )

    current_value = float(latest_data.close_value)
    current_date = latest_data.date

    # Helper function to get data point closest to target date
    def get_data_point(target_date: date_type) -> Optional[BenchmarkData]:
        # Try exact date first
        data = session.exec(
            select(BenchmarkData)
            .where(BenchmarkData.benchmark_id == benchmark_id)
            .where(BenchmarkData.date == target_date)
        ).first()

        if data:
            return data

        # If exact date not found, get the most recent date before target
        data = session.exec(
            select(BenchmarkData)
            .where(BenchmarkData.benchmark_id == benchmark_id)
            .where(BenchmarkData.date <= target_date)
            .order_by(BenchmarkData.date.desc())
            .limit(1)
        ).first()

        return data

    # Helper function to calculate performance metrics
    def calculate_performance(start_data: Optional[BenchmarkData]) -> Optional[Dict[str, Any]]:
        if not start_data:
            return None

        start_value = float(start_data.close_value)
        change = current_value - start_value
        change_percent = (change / start_value * 100) if start_value > 0 else 0.0

        return {
            "change": round(change, 2),
            "change_percent": round(change_percent, 2),
            "start_value": round(start_value, 2),
            "end_value": round(current_value, 2),
            "start_date": start_data.date,
            "end_date": current_date
        }

    # Calculate target dates
    today = current_date
    one_day_ago = today - timedelta(days=1)
    one_week_ago = today - timedelta(days=7)
    one_month_ago = today - timedelta(days=30)

    # Calculate YTD start (January 1st of current year)
    ytd_start = date_type(today.year, 1, 1)

    # Get data points for each period
    data_1d = get_data_point(one_day_ago)
    data_1w = get_data_point(one_week_ago)
    data_1m = get_data_point(one_month_ago)
    data_ytd = get_data_point(ytd_start)

    # Build response
    performance = {
        "1d": calculate_performance(data_1d),
        "1w": calculate_performance(data_1w),
        "1m": calculate_performance(data_1m),
        "ytd": calculate_performance(data_ytd)
    }

    return {
        "benchmark_id": benchmark_id,
        "benchmark_name": benchmark.name,
        "current_value": round(current_value, 2),
        "as_of_date": current_date,
        "performance": performance
    }


@router.get("/summary")
def get_market_summary(session: SessionDep) -> Dict[str, Any]:
    """Get the latest market summary data.
    
    Returns the most recent market summary including:
    - DSE and CSE index values and changes
    - Market breadth (advancers, decliners, unchanged)
    - Trading statistics (total trades, volume, turnover)
    - Calculated breadth metrics (ad_ratio, net_breadth, total_active, sentiment)
    - Volume breadth (volume_breadth_up, volume_breadth_down)
    
    No request parameters required - returns latest available data.
    """
    from sqlalchemy import text
    
    latest = session.exec(
        select(MarketSummary).order_by(MarketSummary.timestamp.desc()).limit(1)
    ).first()
    if not latest:
        return {}
    
    # Calculate volume breadth from StockData
    # Get the latest timestamp from StockData
    latest_stock_timestamp = session.exec(
        select(func.max(StockData.timestamp))
    ).first()
    
    volume_breadth_up = 0
    volume_breadth_down = 0
    
    if latest_stock_timestamp:
        # Query to get volume sums for gainers and losers
        volume_query = text("""
            SELECT 
                COALESCE(SUM(CASE WHEN change_percent > 0 THEN volume ELSE 0 END), 0) as volume_up,
                COALESCE(SUM(CASE WHEN change_percent < 0 THEN volume ELSE 0 END), 0) as volume_down
            FROM stockdata
            WHERE timestamp = :latest_timestamp
        """)
        
        volume_result = session.execute(volume_query, {"latest_timestamp": latest_stock_timestamp}).fetchone()
        
        if volume_result:
            volume_breadth_up = int(volume_result.volume_up) if volume_result.volume_up else 0
            volume_breadth_down = int(volume_result.volume_down) if volume_result.volume_down else 0
    
    # Calculate derived metrics
    advancers = latest.advancers
    decliners = latest.decliners
    unchanged = latest.unchanged
    
    # Advance/Decline Ratio
    ad_ratio = round(advancers / decliners, 2) if decliners > 0 else 0.0
    
    # Net Breadth = Advancers - Decliners
    net_breadth = advancers - decliners
    
    # Total Active = Advancers + Decliners
    total_active = advancers + decliners
    
    # Sentiment
    if advancers > decliners:
        sentiment = "Bullish"
    elif decliners > advancers:
        sentiment = "Bearish"
    else:
        sentiment = "Neutral"
    
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
        "advancers": advancers,
        "decliners": decliners,
        "unchanged": unchanged,
        "timestamp": latest.timestamp,
        # Calculated breadth metrics
        "ad_ratio": ad_ratio,
        "net_breadth": net_breadth,
        "total_active": total_active,
        "sentiment": sentiment,
        # Volume breadth
        "volume_breadth_up": volume_breadth_up,
        "volume_breadth_down": volume_breadth_down,
    }


@router.get("/stocks")
def list_stocks(
        session: SessionDep,
        q: Optional[str] = Query(None, description="Search by symbol or company name"),
        sector: Optional[str] = None,
        limit: int = Query(50, ge=1, le=500),
        offset: int = Query(0, ge=0),
) -> List[Dict[str, Any]]:
    """
    Get basic market data for stocks.
    Fast, lightweight endpoint for basic stock information.
    Use /market/fundamentals for detailed fundamental metrics.
    """
    # Build query for companies matching basic criteria
    stmt = select(Company)
    if q:
        like = f"%{q.upper()}%"
        stmt = stmt.where((Company.trading_code.ilike(like)) | (Company.company_name.ilike(like)))
    if sector:
        stmt = stmt.where(Company.sector == sector)
    
    # Apply pagination
    stmt = stmt.offset(offset).limit(limit)
    companies = session.exec(stmt).all()

    # Fetch basic market data for companies
    result: List[Dict[str, Any]] = []
    for company in companies:
        latest_data = session.exec(
            select(StockData)
            .where(StockData.company_id == company.id)
            .order_by(StockData.timestamp.desc())
            .limit(1)
        ).first()

        result.append({
            "id": str(company.id),
            "symbol": company.trading_code,
            "company_name": company.company_name,
            "sector": company.sector,
            "industry": company.industry,
            "ltp": str(latest_data.last_trade_price) if latest_data else None,
            "change": str(latest_data.change) if latest_data else None,
            "ycp": str(latest_data.previous_close) if latest_data else None,
            "change_percent": str(latest_data.change_percent) if latest_data else None,
            "volume": latest_data.volume if latest_data else None,
            "turnover": str(latest_data.turnover) if latest_data else None,
            "timestamp": latest_data.timestamp if latest_data else None,
        })

    return result


@router.get("/fundamentals")
def list_fundamentals(
        session: SessionDep,
        q: Optional[str] = Query(None, description="Search by symbol or company name"),
        sector: Optional[str] = None,
        min_pe: Optional[float] = Query(None, description="Minimum P/E ratio"),
        max_pe: Optional[float] = Query(None, description="Maximum P/E ratio"),
        min_dividend_yield: Optional[float] = Query(None, description="Minimum dividend yield %"),
        max_dividend_yield: Optional[float] = Query(None, description="Maximum dividend yield %"),
        min_score: Optional[float] = Query(None, description="Minimum fundamental score"),
        min_market_cap: Optional[float] = Query(None, description="Minimum market cap (in millions)"),
        max_market_cap: Optional[float] = Query(None, description="Maximum market cap (in millions)"),
        min_roe: Optional[float] = Query(None, description="Minimum ROE %"),
        max_roe: Optional[float] = Query(None, description="Maximum ROE %"),
        min_debt_equity: Optional[float] = Query(None, description="Minimum debt to equity ratio"),
        max_debt_equity: Optional[float] = Query(None, description="Maximum debt to equity ratio"),
        sort_by: Optional[str] = Query("score", description="Sort field: pe, dividend_yield, market_cap, score, roe, debt_equity, symbol"),
        sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
        limit: int = Query(20, ge=1, le=500),
        offset: int = Query(0, ge=0),
) -> List[Dict[str, Any]]:
    """
    Get fundamental metrics for stocks with filtering and sorting.
    Use this endpoint for the Fundamentals page.
    """
    from app.model.technical_indicators import DonchianChannelCache
    from sqlalchemy import func, desc, asc

    # Subquery to get the latest calculation date
    latest_date_subquery = select(func.max(DonchianChannelCache.calculation_date))
    latest_date = session.exec(latest_date_subquery).first()

    if not latest_date:
        return []

    # Build query
    stmt = (
        select(DonchianChannelCache, Company)
        .join(Company, DonchianChannelCache.company_id == Company.id)
        .where(DonchianChannelCache.calculation_date == latest_date)
    )

    # Apply search filter
    if q:
        like = f"%{q.upper()}%"
        stmt = stmt.where((Company.trading_code.ilike(like)) | (Company.company_name.ilike(like)))
    
    # Apply sector filter
    if sector:
        stmt = stmt.where(DonchianChannelCache.sector == sector)

    # Apply numeric filters
    if min_pe is not None:
        stmt = stmt.where(DonchianChannelCache.pe_ratio >= min_pe)
    if max_pe is not None:
        stmt = stmt.where(DonchianChannelCache.pe_ratio <= max_pe)
        
    if min_dividend_yield is not None:
        stmt = stmt.where(DonchianChannelCache.dividend_yield >= min_dividend_yield)
    if max_dividend_yield is not None:
        stmt = stmt.where(DonchianChannelCache.dividend_yield <= max_dividend_yield)
        
    if min_score is not None:
        stmt = stmt.where(DonchianChannelCache.fundamental_score >= min_score)
        
    if min_market_cap is not None:
        stmt = stmt.where(DonchianChannelCache.market_cap >= min_market_cap)
    if max_market_cap is not None:
        stmt = stmt.where(DonchianChannelCache.market_cap <= max_market_cap)
        
    if min_roe is not None:
        stmt = stmt.where(DonchianChannelCache.roe >= min_roe)
    if max_roe is not None:
        stmt = stmt.where(DonchianChannelCache.roe <= max_roe)
        
    if min_debt_equity is not None:
        stmt = stmt.where(DonchianChannelCache.debt_to_equity >= min_debt_equity)
    if max_debt_equity is not None:
        stmt = stmt.where(DonchianChannelCache.debt_to_equity <= max_debt_equity)

    # Apply sorting
    sort_column = None
    if sort_by == "pe":
        sort_column = DonchianChannelCache.pe_ratio
    elif sort_by == "dividend_yield":
        sort_column = DonchianChannelCache.dividend_yield
    elif sort_by == "market_cap":
        sort_column = DonchianChannelCache.market_cap
    elif sort_by == "roe":
        sort_column = DonchianChannelCache.roe
    elif sort_by == "debt_equity":
        sort_column = DonchianChannelCache.debt_to_equity
    elif sort_by == "symbol":
        sort_column = Company.trading_code
    elif sort_by == "company_name":
        sort_column = Company.company_name
    else:
        sort_column = DonchianChannelCache.fundamental_score

    if sort_order == "asc":
        stmt = stmt.order_by(asc(sort_column).nulls_last())
    else:
        stmt = stmt.order_by(desc(sort_column).nulls_last())

    # Apply pagination
    stmt = stmt.offset(offset).limit(limit)

    results = session.exec(stmt).all()

    # Format response
    stocks_with_metrics: List[Dict[str, Any]] = []
    for cache, company in results:
        stock_data = {
            "id": str(company.id),
            "symbol": company.trading_code,
            "company_name": company.company_name,
            "sector": company.sector,
            "total_outstanding_securities": company.total_outstanding_securities,
            "market_cap": float(cache.market_cap) if cache.market_cap is not None else None,
            "pe": float(cache.pe_ratio) if cache.pe_ratio is not None else None,
            "dividend_yield": float(cache.dividend_yield) if cache.dividend_yield is not None else None,
            "roe": float(cache.roe) if cache.roe is not None else None,
            "debt_to_equity": float(cache.debt_to_equity) if cache.debt_to_equity is not None else None,
            "debt_equity": float(cache.debt_to_equity) if cache.debt_to_equity is not None else None,
            "eps": float(cache.eps) if cache.eps is not None else None,
            "nav": float(cache.nav) if cache.nav is not None else None,
            "score": float(cache.fundamental_score) if cache.fundamental_score is not None else 0,
        }
        
        # Add score breakdown if available
        if cache.base_score is not None or cache.pe_score_contribution is not None:
            stock_data["score_breakdown"] = {
                "base_score": float(cache.base_score) if cache.base_score is not None else None,
                "pe_contribution": float(cache.pe_score_contribution) if cache.pe_score_contribution is not None else None,
                "dividend_yield_contribution": float(cache.dividend_yield_score_contribution) if cache.dividend_yield_score_contribution is not None else None,
                "debt_to_equity_contribution": float(cache.debt_to_equity_score_contribution) if cache.debt_to_equity_score_contribution is not None else None,
                "roe_contribution": float(cache.roe_score_contribution) if cache.roe_score_contribution is not None else None,
            }
        
        stocks_with_metrics.append(stock_data)

    return stocks_with_metrics


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
    latest_time_value = session.exec(
        select(func.max(StockData.timestamp))
    ).first()
    if not latest_time_value:
        return {"gainers": [], "losers": []}
    latest_time = latest_time_value

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
    latest_time_value = session.exec(
        select(func.max(StockData.timestamp))
    ).first()
    if not latest_time_value:
        return []
    latest_time = latest_time_value

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
    Supports DSEX from MarketSummary, and DS30/DSES from benchmark_data table.
    """
    from datetime import date as date_type
    
    since = datetime.utcnow() - timedelta(days=days)
    since_date = since.date()
    
    # Get MarketSummary data for DSEX and CSE
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

    # Get DS30 and DSES from benchmark_data table
    def get_benchmark_data(benchmark_id: str) -> Dict[str, Any]:
        """Get latest benchmark data and series for sparklines."""
        # Get latest data point
        latest_data = session.exec(
            select(BenchmarkData)
            .where(BenchmarkData.benchmark_id == benchmark_id)
            .where(BenchmarkData.date >= since_date)
            .order_by(BenchmarkData.date.desc())
            .limit(1)
        ).first()
        
        if not latest_data:
            return {
                "level": None,
                "change": None,
                "change_percent": None,
                "series": [],
            }
        
        # Get series data for sparklines
        series_data = session.exec(
            select(BenchmarkData)
            .where(BenchmarkData.benchmark_id == benchmark_id)
            .where(BenchmarkData.date >= since_date)
            .order_by(BenchmarkData.date.asc())
        ).all()
        
        series = []
        for data in series_data:
            if data.close_value is not None:
                # Use date as timestamp (convert to datetime for consistency)
                timestamp = datetime.combine(data.date, datetime.min.time())
                series.append({"t": timestamp, "v": float(data.close_value)})
        
        # Calculate change and change_percent
        # Try to get previous day's close value
        prev_data = session.exec(
            select(BenchmarkData)
            .where(BenchmarkData.benchmark_id == benchmark_id)
            .where(BenchmarkData.date < latest_data.date)
            .order_by(BenchmarkData.date.desc())
            .limit(1)
        ).first()
        
        change = None
        change_percent = None
        
        if latest_data.close_value is not None:
            if prev_data and prev_data.close_value is not None:
                # Calculate change from previous day
                change = float(latest_data.close_value) - float(prev_data.close_value)
                if float(prev_data.close_value) != 0:
                    change_percent = (change / float(prev_data.close_value)) * 100
            elif latest_data.daily_return is not None:
                # Use daily_return if available
                change_percent = float(latest_data.daily_return)
                if latest_data.close_value is not None:
                    change = float(latest_data.close_value) * (change_percent / 100)
        
        return {
            "level": float(latest_data.close_value) if latest_data.close_value is not None else None,
            "change": change,
            "change_percent": change_percent,
            "series": series,
        }
    
    dsex_data = {
        "level": float(latest.dse_index) if latest and latest.dse_index is not None else None,
        "change": float(latest.dse_index_change) if latest and latest.dse_index_change is not None else None,
        "change_percent": float(
            latest.dse_index_change_percent) if latest and latest.dse_index_change_percent is not None else None,
        "series": dsex_series,
    }
    
    ds30_data = get_benchmark_data("DS30")
    dses_data = get_benchmark_data("DSES")
    
    return {
        "DSEX": dsex_data,
        "DS30": ds30_data,
        "DSES": dses_data,
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


@router.get("/sector-analysis")
def get_sector_analysis(session: SessionDep) -> Dict[str, Any]:
    """Get sector analysis data for Advances/Declines and Turnover charts.
    
    Returns:
        - advances_declines: List of sectors with up, down, unchanged counts
        - turnover: List of sectors with total turnover values
    """
    from sqlalchemy import text, case
    from decimal import Decimal
    
    # Use a single optimized SQL query to get sector aggregates
    # This query groups by sector and calculates:
    # - Count of advances (change_percent > 0)
    # - Count of declines (change_percent < 0)
    # - Count of unchanged (change_percent = 0)
    # - Total turnover
    query = text("""
        SELECT 
            c.sector,
            COUNT(CASE WHEN sd.change_percent > 0 THEN 1 END) as up,
            COUNT(CASE WHEN sd.change_percent < 0 THEN 1 END) as down,
            COUNT(CASE WHEN sd.change_percent = 0 THEN 1 END) as unchanged,
            COALESCE(SUM(sd.turnover), 0) as total_turnover
        FROM stockdata sd
        INNER JOIN company c ON sd.company_id = c.id
        WHERE c.sector IS NOT NULL
            AND c.is_active = true
        GROUP BY c.sector
        HAVING COUNT(*) > 0
        ORDER BY total_turnover DESC
        LIMIT 20
    """)
    
    result = session.execute(query).fetchall()
    
    # Format the results
    advances_declines = []
    turnover = []
    
    for row in result:
        sector = row.sector
        up = int(row.up) if row.up else 0
        down = int(row.down) if row.down else 0
        unchanged = int(row.unchanged) if row.unchanged else 0
        total_turnover = float(row.total_turnover) if row.total_turnover else 0.0
        
        # Convert turnover from base unit to crores (divide by 10,000,000)
        turnover_cr = total_turnover / 10 if total_turnover > 0 else 0.0
        
        advances_declines.append({
            "name": sector,
            "up": up,
            "down": down,
            "unchanged": unchanged
        })
        
        turnover.append({
            "name": sector,
            "value": round(turnover_cr, 2)
        })
    
    return {
        "advances_declines": advances_declines,
        "turnover": turnover
    }
