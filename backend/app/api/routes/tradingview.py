"""
TradingView UDF-compatible API endpoints
Provides historical OHLC data and symbol information for TradingView charts
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from app.api.deps import get_session_dep
from app.model.company import Company
from app.model.stock import DailyOHLC, StockData
from app.model.portfolio import Portfolio, PortfolioPosition

router = APIRouter(prefix="/tradingview", tags=["tradingview"])


@router.get("/config")
def get_config() -> Dict[str, Any]:
    """
    Returns the configuration of the data feed.
    https://www.tradingview.com/charting-library-docs/latest/connecting_data/UDF#response-1
    """
    return {
        "supported_resolutions": ["1D", "1W", "1M"],
        "supports_group_request": False,  # Use individual symbol resolution
        "supports_marks": False,
        "supports_search": True,
        "supports_timescale_marks": False,
    }


@router.get("/symbols")
def search_symbols(
    symbol: Optional[str] = Query(None, description="Symbol name for individual symbol resolution"),
    query: Optional[str] = Query(None, description="Search query for symbol or company name"),
    type: Optional[str] = Query(None, description="Type filter (stock, index, etc)"),
    exchange: Optional[str] = Query(None, description="Exchange filter"),
    limit: int = Query(30, ge=1, le=100, description="Maximum number of results"),
    session: Session = Depends(get_session_dep),
) -> Dict[str, Any] | List[Dict[str, Any]]:
    """
    Search for symbols or resolve individual symbol.
    If 'symbol' parameter is provided, returns single symbol info (for resolution).
    If 'query' parameter is provided, returns list of matching symbols (for search).
    https://www.tradingview.com/charting-library-docs/latest/connecting_data/UDF#search
    """
    # Handle individual symbol resolution (when 'symbol' parameter is provided)
    if symbol:
        symbol_upper = symbol.strip().upper()
        if not symbol_upper:
            return {
                "s": "error",
                "errmsg": "Symbol cannot be empty"
            }
        
        company = session.exec(
            select(Company).where(Company.trading_code == symbol_upper)
        ).first()
        
        if not company:
            return {
                "s": "error",
                "errmsg": f"Symbol {symbol_upper} not found"
            }
        
        # Return single symbol info in UDF format (all required fields)
        return {
            "name": company.trading_code,
            "ticker": company.trading_code,
            "full_name": f"DSE:{company.trading_code}",
            "description": company.company_name or company.name or company.trading_code,
            "exchange": "DSE",
            "listed_exchange": "DSE",
            "exchange-listed": "DSE",
            "exchange-traded": "DSE",
            "type": "stock",
            "session": "0930-1430",
            "session-regular": "0930-1430",
            "timezone": "Asia/Dhaka",
            "minmovement": 1,
            "minmov": 1,
            "minmove2": 0,
            "pricescale": 100,
            "has-intraday": False,
            "has_intraday": False,
            "has_daily": True,
            "has-daily": True,
            "has_weekly_and_monthly": True,
            "has-weekly-and-monthly": True,
            "supported-resolutions": ["1D", "1W", "1M"],
            "supported_resolutions": ["1D", "1W", "1M"],
            "currency-code": "BDT",
            "currency_code": "BDT",
            "format": "price",
        }
    
    # Handle symbol search (when 'query' parameter is provided or for search functionality)
    stmt = select(Company).where(Company.is_active == True)
    
    if query and query.strip():
        search_term = f"%{query.upper()}%"
        stmt = stmt.where(
            (Company.trading_code.ilike(search_term)) | 
            (Company.company_name.ilike(search_term))
        )
    
    stmt = stmt.limit(limit)
    companies = session.exec(stmt).all()
    
    results = []
    for company in companies:
        results.append({
            "symbol": company.trading_code,
            "full_name": f"DSE:{company.trading_code}",
            "description": company.company_name or company.name,
            "exchange": "DSE",
            "type": "stock",
        })
    
    return results


@router.get("/search")
def search_symbols_search(
    query: Optional[str] = Query(None, description="Search query for symbol or company name"),
    type: Optional[str] = Query(None, description="Type filter (stock, index, etc)"),
    exchange: Optional[str] = Query(None, description="Exchange filter"),
    limit: int = Query(30, ge=1, le=100, description="Maximum number of results"),
    session: Session = Depends(get_session_dep),
) -> List[Dict[str, Any]]:
    """
    Search for symbols (TradingView search endpoint).
    https://www.tradingview.com/charting-library-docs/latest/connecting_data/UDF#search
    """
    stmt = select(Company).where(Company.is_active == True)
    
    if query and query.strip():
        search_term = f"%{query.upper()}%"
        stmt = stmt.where(
            (Company.trading_code.ilike(search_term)) | 
            (Company.company_name.ilike(search_term))
        )
    
    stmt = stmt.limit(limit)
    companies = session.exec(stmt).all()
    
    results = []
    for company in companies:
        results.append({
            "symbol": company.trading_code,
            "full_name": f"DSE:{company.trading_code}",
            "description": company.company_name or company.name,
            "exchange": "DSE",
            "type": "stock",
        })
    
    return results


@router.get("/symbol_info")
def get_symbol_info(
    group: Optional[str] = Query(None, description="Exchange group"),
    session: Session = Depends(get_session_dep),
) -> Dict[str, Any]:
    """
    Returns symbol info for a group of symbols.
    https://www.tradingview.com/charting-library-docs/latest/connecting_data/UDF#symbol-info
    """
    # Get all active companies
    stmt = select(Company).where(Company.is_active == True).limit(200)
    companies = session.exec(stmt).all()
    
    if not companies:
        return {
            "symbol": [],
            "description": [],
            "exchange-listed": [],
            "exchange-traded": [],
            "minmovement": [],
            "minmovement2": [],
            "pricescale": [],
            "has-intraday": [],
            "has-daily": [],
            "has-weekly-and-monthly": [],
            "session-regular": [],
            "timezone": [],
            "supported-resolutions": [],
            "type": [],
        }
    
    # Build response arrays
    symbols = []
    descriptions = []
    exchange_listed = []
    exchange_traded = []
    minmovement = []
    pricescale = []
    has_intraday = []
    has_daily = []
    has_weekly_monthly = []
    session_regular = []
    timezone = []
    supported_resolutions = []
    symbol_type = []
    
    for company in companies:
        symbols.append(company.trading_code)
        descriptions.append(company.company_name or company.name)
        exchange_listed.append("DSE")
        exchange_traded.append("DSE")
        minmovement.append(1)
        pricescale.append(100)  # 2 decimal places
        has_intraday.append(False)
        has_daily.append(True)
        has_weekly_monthly.append(True)
        session_regular.append("0930-1430")  # DSE trading hours
        timezone.append("Asia/Dhaka")
        supported_resolutions.append(["1D", "1W", "1M"])
        symbol_type.append("stock")
    
    return {
        "symbol": symbols,
        "description": descriptions,
        "exchange-listed": exchange_listed,
        "exchange-traded": exchange_traded,
        "minmovement": minmovement,
        "pricescale": pricescale,
        "has-intraday": has_intraday,
        "has-daily": has_daily,
        "has-weekly-and-monthly": has_weekly_monthly,
        "session-regular": session_regular,
        "timezone": timezone,
        "supported-resolutions": supported_resolutions,
        "type": symbol_type,
    }


@router.get("/history")
def get_history(
    symbol: str = Query(..., description="Symbol name"),
    resolution: str = Query(..., description="Resolution (1D, 1W, 1M, etc)"),
    from_ts: int = Query(..., alias="from", description="Unix timestamp (seconds) of the leftmost bar"),
    to_ts: int = Query(..., alias="to", description="Unix timestamp (seconds) of the rightmost bar"),
    countback: Optional[int] = Query(None, description="Number of bars to return"),
    session: Session = Depends(get_session_dep),
) -> Dict[str, Any]:
    """
    Returns historical bars for a symbol.
    https://www.tradingview.com/charting-library-docs/latest/connecting_data/UDF#history
    """
    # Look up company by trading code
    company = session.exec(
        select(Company).where(Company.trading_code == symbol.upper())
    ).first()
    
    if not company:
        return {
            "s": "error",
            "errmsg": f"Symbol {symbol} not found"
        }
    
    # Convert timestamps to datetime (handle both date and datetime)
    from_date = datetime.fromtimestamp(from_ts)
    to_date = datetime.fromtimestamp(to_ts)
    
    # Convert to date for comparison (since DailyOHLC.date is a date field)
    from_date_only = from_date.date()
    to_date_only = to_date.date()
    
    # When countback is provided, get the last N bars before 'to'
    # This is the standard UDF behavior - countback takes precedence over 'from'
    if countback:
        # Get the last countback bars before 'to' date, ordered by date descending
        # Then reverse to get chronological order (oldest first)
        stmt = (
            select(DailyOHLC)
            .where(DailyOHLC.company_id == company.id)
            .where(DailyOHLC.date <= to_date_only)  # Only filter by 'to', ignore 'from' when countback is provided
            .order_by(DailyOHLC.date.desc())
            .limit(countback)
        )
        bars = session.exec(stmt).all()
        
        # If we got fewer bars than requested, that's fine - we've returned all available data
        # Reverse to get oldest first (chronological order for UDF)
        bars = list(reversed(bars))
    else:
        # Get all bars in the date range, ordered oldest first
        stmt = (
            select(DailyOHLC)
            .where(DailyOHLC.company_id == company.id)
            .where(DailyOHLC.date >= from_date_only)
            .where(DailyOHLC.date <= to_date_only)
            .order_by(DailyOHLC.date.asc())
        )
        bars = session.exec(stmt).all()
    
    if not bars:
        return {
            "s": "no_data",
            "nextTime": int(to_date.timestamp())
        }
    
    # Convert to UDF format
    times = []
    opens = []
    highs = []
    lows = []
    closes = []
    volumes = []
    
    for bar in bars:
        # Convert date to Unix timestamp (seconds) - combine date with midnight time
        bar_datetime = datetime.combine(bar.date, datetime.min.time())
        times.append(int(bar_datetime.timestamp()))
        opens.append(float(bar.open_price))
        highs.append(float(bar.high))
        lows.append(float(bar.low))
        closes.append(float(bar.close_price))
        volumes.append(int(bar.volume) if bar.volume else 0)
    
    return {
        "s": "ok",
        "t": times,
        "o": opens,
        "h": highs,
        "l": lows,
        "c": closes,
        "v": volumes,
    }


@router.get("/quotes")
def get_quotes(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    session: Session = Depends(get_session_dep),
) -> Dict[str, Any]:
    """
    Returns real-time quotes for symbols.
    https://www.tradingview.com/charting-library-docs/latest/connecting_data/UDF#quotes
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    
    # Look up companies
    companies = session.exec(
        select(Company).where(Company.trading_code.in_(symbol_list))
    ).all()
    
    company_map = {c.trading_code: c for c in companies}
    
    quotes = []
    for symbol in symbol_list:
        company = company_map.get(symbol)
        if not company:
            continue
        
        # Get latest stock data
        latest_data = session.exec(
            select(StockData)
            .where(StockData.company_id == company.id)
            .order_by(StockData.timestamp.desc())
            .limit(1)
        ).first()
        
        if latest_data:
            quotes.append({
                "s": "ok",
                "n": symbol,
                "v": {
                    "ch": float(latest_data.change),
                    "chp": float(latest_data.change_percent),
                    "short_name": symbol,
                    "exchange": "DSE",
                    "description": company.company_name or company.name,
                    "lp": float(latest_data.last_trade_price),
                    "ask": float(latest_data.last_trade_price),
                    "bid": float(latest_data.last_trade_price),
                    "open_price": float(latest_data.open_price),
                    "high_price": float(latest_data.high),
                    "low_price": float(latest_data.low),
                    "prev_close_price": float(latest_data.previous_close),
                    "volume": int(latest_data.volume) if latest_data.volume else 0,
                }
            })
    
    return {
        "s": "ok",
        "d": quotes
    }


@router.get("/positions/{symbol}")
def get_positions_for_tradingview(
    symbol: str,
    session: Session = Depends(get_session_dep),
):
    """
    Get positions for a symbol formatted for TradingView marks.
    This endpoint is public (no auth) since TradingView widget needs to access it.
    Returns position marks with timestamp, price, quantity, and portfolio info.
    """
    # Find the stock by symbol
    stock = session.exec(
        select(Company).where(Company.trading_code == symbol.upper())
    ).first()
    
    if not stock:
        return []
    
    # Get all positions for this stock across all portfolios
    # Note: This returns all positions, not filtered by user
    # If you need user-specific positions, you'll need authentication
    positions = session.exec(
        select(PortfolioPosition, Portfolio, Company)
        .join(Portfolio, PortfolioPosition.portfolio_id == Portfolio.id)
        .join(Company, PortfolioPosition.stock_id == Company.id)
        .where(PortfolioPosition.stock_id == stock.id)
    ).all()
    
    result = []
    for position, portfolio, company in positions:
        # Format for TradingView position marks
        result.append({
            "id": str(position.id),
            "portfolio_id": str(portfolio.id),
            "portfolio_name": portfolio.name,
            "symbol": company.trading_code,
            "quantity": position.quantity,
            "price": float(position.average_price),
            "side": "buy",  # Positions are entries, so they're all "buy" marks
            "timestamp": int(position.last_updated.timestamp()) if position.last_updated else None,
            "unrealized_pnl": float(position.unrealized_pnl) if position.unrealized_pnl else 0,
            "current_value": float(position.current_value) if position.current_value else 0,
        })
    
    return result

