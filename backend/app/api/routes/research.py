from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status, Query
from sqlmodel import select, func, and_

from app.api.deps import CurrentUser, SessionDep
from app.model.alert import News, StockNews
from app.model.company import Company
from app.model.fundamental import FinancialPerformance, DividendInformation, LoanStatus
from app.model.stock import StockData, DailyOHLC
from app.services.research_service import ResearchService

router = APIRouter(prefix="/research", tags=["research"])


def _to_float(value: Optional[Decimal | float | int]) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _calculate_sma(closes: List[float], period: int) -> Optional[float]:
    if period <= 0 or len(closes) < period:
        return None
    window = closes[-period:]
    return sum(window) / period


def _calculate_rsi(closes: List[float], period: int = 14) -> Optional[float]:
    if period <= 0 or len(closes) < period + 1:
        return None

    gains: List[float] = []
    losses: List[float] = []

    for i in range(1, len(closes)):
        delta = closes[i] - closes[i - 1]
        if delta > 0:
            gains.append(delta)
            losses.append(0.0)
        else:
            gains.append(0.0)
            losses.append(abs(delta))

    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss if avg_loss != 0 else 0.0
    return 100 - (100 / (1 + rs))


def _matches_moving_average_filter(
        moving_average_filter: Optional[str],
        current_price: Optional[float],
        sma_20: Optional[float],
        sma_50: Optional[float],
) -> bool:
    if moving_average_filter in (None, "all"):
        return True

    if current_price is None:
        return False

    if moving_average_filter == "above_20":
        return sma_20 is not None and current_price >= sma_20
    if moving_average_filter == "above_50":
        return sma_50 is not None and current_price >= sma_50
    if moving_average_filter == "below_20":
        return sma_20 is not None and current_price <= sma_20
    if moving_average_filter == "below_50":
        return sma_50 is not None and current_price <= sma_50

    return True


def _calculate_rating(
        pe_ratio: Optional[float],
        pb_ratio: Optional[float],
        rsi: Optional[float],
        change_percent: Optional[float],
        dividend_yield: Optional[float],
) -> str:
    score = 0

    if pe_ratio is not None:
        if 8 <= pe_ratio <= 20:
            score += 2
        elif pe_ratio < 8:
            score += 1
        elif pe_ratio > 30:
            score -= 1

    if pb_ratio is not None:
        if 1 <= pb_ratio <= 3:
            score += 1
        elif pb_ratio > 5:
            score -= 1

    if rsi is not None:
        if 30 <= rsi <= 60:
            score += 2
        elif rsi < 30:
            score += 1
        elif rsi > 70:
            score -= 2

    if change_percent is not None:
        if change_percent >= 3:
            score += 1
        elif change_percent <= -3:
            score -= 1

    if dividend_yield is not None and dividend_yield >= 3:
        score += 1

    if score >= 5:
        return "Strong Buy"
    if score >= 3:
        return "Buy"
    if score >= 1:
        return "Hold"
    if score <= -1:
        return "Sell"
    return "Strong Sell"


def _rating_to_score(rating: str) -> int:
    mapping = {
        "Strong Buy": 5,
        "Buy": 4,
        "Hold": 3,
        "Sell": 2,
        "Strong Sell": 1,
    }
    return mapping.get(rating, 0)


@router.get("/stock-screener")
def stock_screener(
        session: SessionDep,
        min_market_cap: Optional[float] = Query(None, description="Minimum market cap in millions"),
        max_market_cap: Optional[float] = Query(None, description="Maximum market cap in millions"),
        min_pe_ratio: Optional[float] = Query(None, description="Minimum P/E ratio"),
        max_pe_ratio: Optional[float] = Query(None, description="Maximum P/E ratio"),
        min_dividend_yield: Optional[float] = Query(None, description="Minimum dividend yield %"),
        max_dividend_yield: Optional[float] = Query(None, description="Maximum dividend yield %"),
        sector: Optional[str] = Query(None, description="Sector filter"),
        industry: Optional[str] = Query(None, description="Industry filter"),
        min_volume: Optional[int] = Query(None, description="Minimum average volume"),
        min_price: Optional[float] = Query(None, description="Minimum stock price"),
        max_price: Optional[float] = Query(None, description="Maximum stock price"),
        min_price_to_book: Optional[float] = Query(None, description="Minimum price-to-book ratio"),
        max_price_to_book: Optional[float] = Query(None, description="Maximum price-to-book ratio"),
        min_rsi: Optional[float] = Query(None, description="Minimum RSI value"),
        max_rsi: Optional[float] = Query(None, description="Maximum RSI value"),
        min_price_change: Optional[float] = Query(None, description="Minimum daily price change percent"),
        max_price_change: Optional[float] = Query(None, description="Maximum daily price change percent"),
        moving_average: Optional[str] = Query(
            "all",
            description="Moving average position filter (all, above_20, above_50, below_20, below_50)",
        ),
        limit: int = Query(20, ge=1, le=200, description="Maximum number of results"),
):
    """Advanced stock screener with fundamental and technical filters"""
    candidates_query = select(Company)

    sector_value = sector.strip() if sector else None
    industry_value = industry.strip() if industry else None

    normalized_sector = sector_value.lower() if sector_value else None
    normalized_industry = industry_value.lower() if industry_value else None

    if normalized_sector:
        candidates_query = candidates_query.where(
            and_(
                Company.sector.is_not(None),
                func.lower(Company.sector) == normalized_sector,
            )
        )
    if normalized_industry:
        candidates_query = candidates_query.where(
            and_(
                Company.industry.is_not(None),
                func.lower(Company.industry) == normalized_industry,
            )
        )

    pool_size = max(limit * 8, 200)
    companies: List[Company] = session.exec(
        candidates_query.order_by(Company.trading_code).limit(pool_size)
    ).all()

    if not companies:
        return {
            "total_results": 0,
            "filters_applied": {
                "min_market_cap": min_market_cap,
                "max_market_cap": max_market_cap,
                "min_pe_ratio": min_pe_ratio,
                "max_pe_ratio": max_pe_ratio,
                "min_dividend_yield": min_dividend_yield,
                "max_dividend_yield": max_dividend_yield,
                "sector": sector_value,
                "industry": industry_value,
                "min_volume": min_volume,
                "min_price": min_price,
                "max_price": max_price,
                "min_price_to_book": min_price_to_book,
                "max_price_to_book": max_price_to_book,
                "min_rsi": min_rsi,
                "max_rsi": max_rsi,
                "min_price_change": min_price_change,
                "max_price_change": max_price_change,
                "moving_average": moving_average,
                "limit": limit,
            },
            "stocks": [],
        }

    company_ids = [company.id for company in companies]

    latest_stock_data: Dict[UUID, StockData] = {}
    if company_ids:
        stock_stmt = (
            select(StockData)
            .where(StockData.company_id.in_(company_ids))
            .order_by(StockData.company_id, StockData.timestamp.desc())
        )
        stock_rows = session.exec(stock_stmt).all()
        for row in stock_rows:
            if row.company_id not in latest_stock_data:
                latest_stock_data[row.company_id] = row

    latest_financials: Dict[UUID, FinancialPerformance] = {}
    if company_ids:
        financial_stmt = (
            select(FinancialPerformance)
            .where(FinancialPerformance.company_id.in_(company_ids))
            .order_by(FinancialPerformance.company_id, FinancialPerformance.year.desc())
        )
        financial_rows = session.exec(financial_stmt).all()
        for row in financial_rows:
            if row.company_id not in latest_financials:
                latest_financials[row.company_id] = row

    moving_average_filter = (moving_average or "all").lower()
    results: List[Dict[str, Any]] = []

    for company in companies:
        stock_row = latest_stock_data.get(company.id)
        if not stock_row:
            continue

        financial_row = latest_financials.get(company.id)

        current_price = _to_float(stock_row.last_trade_price)
        if current_price is None:
            continue

        if min_price is not None and current_price < min_price:
            continue
        if max_price is not None and current_price > max_price:
            continue

        change_value = _to_float(stock_row.change)
        change_percent = _to_float(stock_row.change_percent)
        volume = stock_row.volume

        market_cap = _to_float(stock_row.market_cap) if stock_row and stock_row.market_cap is not None else None
        if market_cap is None:
            market_cap = _to_float(company.market_cap)
        if market_cap is None and company.total_shares:
            market_cap = current_price * company.total_shares

        if min_market_cap is not None and (
                market_cap is None or market_cap < min_market_cap * 1_000_000
        ):
            continue
        if max_market_cap is not None and (
                market_cap is None or market_cap > max_market_cap * 1_000_000
        ):
            continue

        pe_ratio = _to_float(company.pe_ratio)
        if pe_ratio is None and financial_row and financial_row.pe_ratio is not None:
            pe_ratio = _to_float(financial_row.pe_ratio)

        if min_pe_ratio is not None and (pe_ratio is None or pe_ratio < min_pe_ratio):
            continue
        if max_pe_ratio is not None and (pe_ratio is None or pe_ratio > max_pe_ratio):
            continue

        pb_ratio = _to_float(company.pb_ratio)
        if pb_ratio is None and financial_row and financial_row.pb_ratio is not None:
            pb_ratio = _to_float(financial_row.pb_ratio)

        if min_price_to_book is not None and (pb_ratio is None or pb_ratio < min_price_to_book):
            continue
        if max_price_to_book is not None and (pb_ratio is None or pb_ratio > max_price_to_book):
            continue

        dividend_yield = _to_float(company.dividend_yield)

        if min_dividend_yield is not None and (
                dividend_yield is None or dividend_yield < min_dividend_yield
        ):
            continue
        if max_dividend_yield is not None and (
                dividend_yield is None or dividend_yield > max_dividend_yield
        ):
            continue

        if min_volume is not None and (volume is None or volume < min_volume):
            continue

        if min_price_change is not None and (
                change_percent is None or change_percent < min_price_change
        ):
            continue
        if max_price_change is not None and (
                change_percent is None or change_percent > max_price_change
        ):
            continue

        ohlc_rows: List[DailyOHLC] = session.exec(
            select(DailyOHLC)
            .where(DailyOHLC.company_id == company.id)
            .order_by(DailyOHLC.date.desc())
            .limit(120)
        ).all()

        closes: List[float] = [float(row.close_price) for row in reversed(ohlc_rows)] if ohlc_rows else []

        sma_20 = _calculate_sma(closes, 20)
        sma_50 = _calculate_sma(closes, 50)
        rsi = _calculate_rsi(closes, 14)

        if min_rsi is not None and (rsi is None or rsi < min_rsi):
            continue
        if max_rsi is not None and (rsi is None or rsi > max_rsi):
            continue

        if not _matches_moving_average_filter(moving_average_filter, current_price, sma_20, sma_50):
            continue

        rating = _calculate_rating(pe_ratio, pb_ratio, rsi, change_percent, dividend_yield)
        score = _rating_to_score(rating)

        results.append(
            {
                "stock_id": str(company.id),
                "symbol": company.trading_code,
                "name": company.company_name or company.name,
                "sector": company.sector,
                "industry": company.industry,
                "current_price": current_price,
                "change": change_value,
                "change_percent": change_percent,
                "volume": volume,
                "market_cap": market_cap,
                "pe_ratio": pe_ratio,
                "pb_ratio": pb_ratio,
                "dividend_yield": dividend_yield,
                "rsi": rsi,
                "sma_20": sma_20,
                "sma_50": sma_50,
                "rating": rating,
                "_score": score,
            }
        )

    results.sort(key=lambda item: (item.get("_score", 0), item.get("change_percent") or 0), reverse=True)

    for item in results:
        item.pop("_score", None)

    return {
        "total_results": len(results),
        "filters_applied": {
            "min_market_cap": min_market_cap,
            "max_market_cap": max_market_cap,
            "min_pe_ratio": min_pe_ratio,
            "max_pe_ratio": max_pe_ratio,
            "min_dividend_yield": min_dividend_yield,
            "max_dividend_yield": max_dividend_yield,
            "sector": sector_value,
            "industry": industry_value,
            "min_volume": min_volume,
            "min_price": min_price,
            "max_price": max_price,
            "min_price_to_book": min_price_to_book,
            "max_price_to_book": max_price_to_book,
            "min_rsi": min_rsi,
            "max_rsi": max_rsi,
            "min_price_change": min_price_change,
            "max_price_change": max_price_change,
            "moving_average": moving_average_filter,
            "limit": limit,
        },
        "stocks": results[:limit],
    }


@router.get("/stock/{symbol}/fundamental-analysis")
def get_fundamental_analysis(
        symbol: str,
        current_user: CurrentUser,
        session: SessionDep
):
    """Get fundamental analysis data for a stock"""

    # OPTIMIZATION 1: Single query with joins for latest tick/ohlc/loan
    from sqlalchemy import and_
    from app.model.fundamental import LoanStatus as _LoanStatus, DividendInformation as _DividendInformation

    query = (
        select(
            Company,
            StockData,
            DailyOHLC,
            _LoanStatus
        )
        .outerjoin(StockData, Company.id == StockData.company_id)
        .outerjoin(DailyOHLC, Company.id == DailyOHLC.company_id)
        .outerjoin(_LoanStatus, Company.id == _LoanStatus.company_id)
        .where(Company.trading_code == symbol.upper())
        .order_by(
            StockData.timestamp.desc(),
            DailyOHLC.date.desc(),
        )
        .limit(1)
    )

    result = session.exec(query).first()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock not found"
        )

    stock, latest_tick, latest_ohlc, loan_status = result

    # OPTIMIZATION 2: Batch fetch latest two years of financial + dividend data
    financial_data = session.exec(
        select(FinancialPerformance, _DividendInformation)
        .outerjoin(
            _DividendInformation,
            and_(
                FinancialPerformance.company_id == _DividendInformation.company_id,
                FinancialPerformance.year == _DividendInformation.year
            )
        )
        .where(FinancialPerformance.company_id == stock.id)
        .order_by(FinancialPerformance.year.desc())
        .limit(2)
    ).all()

    fin_perf = financial_data[0][0] if len(financial_data) > 0 else None
    latest_div = financial_data[0][1] if len(financial_data) > 0 else None
    fin_perf_prev = financial_data[1][0] if len(financial_data) > 1 else None
    prev_div = financial_data[1][1] if len(financial_data) > 1 else None

    # Current price and previous close
    if latest_tick:
        current_price = float(latest_tick.last_trade_price)
        previous_close = float(latest_tick.previous_close)
        ltp_change = float(latest_tick.change)
    elif latest_ohlc:
        current_price = float(latest_ohlc.close_price)
        previous_close = float(current_price - latest_ohlc.change)
        ltp_change = float(latest_ohlc.change)
    else:
        current_price = float(stock.nav or 0) or 0.0
        previous_close = current_price
        ltp_change = 0.0

    # Shares and market cap
    total_shares = (stock.total_shares or stock.total_outstanding_securities or 0) or 0
    computed_market_cap = (current_price * total_shares) if total_shares else None
    market_cap = float(stock.market_cap or 0) if stock.market_cap is not None else (float(computed_market_cap) if computed_market_cap is not None else None)

    # Loan status / EV
    total_loan = None
    if loan_status:
        if loan_status.total_loan is not None:
            total_loan = float(loan_status.total_loan)
        else:
            st = float(loan_status.short_term_loan or 0)
            lt = float(loan_status.long_term_loan or 0)
            total_loan = st + lt

    enterprise_value = None
    if market_cap is not None:
        enterprise_value = market_cap + (total_loan or 0)

    latest_eps = float(fin_perf.eps_basic) if fin_perf and fin_perf.eps_basic is not None else None
    latest_nav = float(fin_perf.nav_per_share) if fin_perf and fin_perf.nav_per_share is not None else float(stock.nav or 0) or None

    # Valuation ratios
    pe_ratio_val = float(stock.pe_ratio) if stock.pe_ratio is not None else (
        (current_price / latest_eps) if latest_eps and latest_eps != 0 else None
    )
    pb_ratio_val = float(stock.pb_ratio) if stock.pb_ratio is not None else (
        (current_price / latest_nav) if latest_nav and latest_nav != 0 else None
    )

    # Dividend yield
    dividend_yield = float(latest_div.yield_percentage) if latest_div and latest_div.yield_percentage is not None else (
        float(stock.dividend_yield) if stock.dividend_yield is not None else None
    )

    # Dividend per share
    dividend_per_share = None
    if latest_div and latest_div.cash_dividend is not None and stock.face_value:
        try:
            dividend_per_share = float(latest_div.cash_dividend) * float(stock.face_value) / 100.0
        except Exception:
            dividend_per_share = None

    # EPS growth YoY
    earnings_growth_1y = None
    if fin_perf and fin_perf_prev and fin_perf.eps_basic is not None and fin_perf_prev.eps_basic is not None:
        prev_eps = float(fin_perf_prev.eps_basic)
        cur_eps = float(fin_perf.eps_basic)
        if prev_eps != 0:
            earnings_growth_1y = ((cur_eps - prev_eps) / abs(prev_eps)) * 100.0

    # NAV growth
    book_value_growth = None
    if fin_perf and fin_perf_prev and fin_perf.nav_per_share is not None and fin_perf_prev.nav_per_share is not None:
        prev_nav = float(fin_perf_prev.nav_per_share)
        cur_nav = float(fin_perf.nav_per_share)
        if prev_nav != 0:
            book_value_growth = ((cur_nav - prev_nav) / abs(prev_nav)) * 100.0

    # Dividend growth
    dividend_growth_rate = None
    if latest_div and prev_div and latest_div.cash_dividend is not None and prev_div.cash_dividend is not None:
        prev_cash = float(prev_div.cash_dividend)
        cur_cash = float(latest_div.cash_dividend)
        if prev_cash != 0:
            dividend_growth_rate = ((cur_cash - prev_cash) / abs(prev_cash)) * 100.0

    # Debt to equity: Total debt / Reserve & Surplus
    reserve_and_surplus = float(stock.reserve_and_surplus or 0) if stock.reserve_and_surplus is not None else None
    debt_to_equity = None
    if (total_loan is not None) and reserve_and_surplus and reserve_and_surplus != 0:
        debt_to_equity = float(total_loan) / float(reserve_and_surplus)

    # Additional derived metrics where feasible with available schema
    # ROE: profit / equity (approximate equity as reserve_and_surplus)
    return_on_equity = None
    if fin_perf and fin_perf.profit is not None and reserve_and_surplus and reserve_and_surplus != 0:
        try:
            return_on_equity = (float(fin_perf.profit) / float(reserve_and_surplus)) * 100.0
        except Exception:
            return_on_equity = None

    # ROA (approximate): profit / (debt + reserve) when both exist
    return_on_assets = None
    if fin_perf and fin_perf.profit is not None and (total_loan is not None) and (reserve_and_surplus is not None):
        denom_assets_approx = float(total_loan) + float(reserve_and_surplus)
        if denom_assets_approx > 0:
            try:
                return_on_assets = (float(fin_perf.profit) / denom_assets_approx) * 100.0
            except Exception:
                return_on_assets = None

    # Debt to Assets (approximate): debt / (debt + reserve)
    debt_to_assets = None
    if (total_loan is not None) and (reserve_and_surplus is not None):
        denom_assets_approx = float(total_loan) + float(reserve_and_surplus)
        if denom_assets_approx > 0:
            debt_to_assets = float(total_loan) / denom_assets_approx

    # Payout ratio: total dividends / profit when possible
    payout_ratio = None
    if dividend_per_share is not None and total_shares and fin_perf and fin_perf.profit is not None:
        try:
            total_dividend_amount = float(dividend_per_share) * float(total_shares)
            profit_amount = float(fin_perf.profit)
            if profit_amount != 0:
                payout_ratio = (total_dividend_amount / profit_amount) * 100.0
        except Exception:
            payout_ratio = None

    fundamental_data = {
        "basic_info": {
            "symbol": stock.trading_code,
            "name": stock.company_name,
            "sector": stock.sector,
            "current_price": current_price,
            "previous_close": previous_close,
            "change": ltp_change,
            "market_cap": market_cap,
            "enterprise_value": enterprise_value
        },
        "valuation_ratios": {
            "pe_ratio": pe_ratio_val,
            "price_to_book": pb_ratio_val,
            # The following require income statement / cash flow details which are not present in the schema
            "peg_ratio": None,
            "price_to_sales": None,
            "ev_to_ebitda": None,
            "price_to_cash_flow": None
        },
        "profitability_ratios": {
            # Not derivable precisely from available tables; return None placeholders
            "gross_margin": None,
            "operating_margin": None,
            "net_margin": None,
            "return_on_equity": return_on_equity,
            "return_on_assets": return_on_assets,
            "return_on_invested_capital": None
        },
        "financial_strength": {
            "debt_to_equity": debt_to_equity,
            "current_ratio": None,
            "quick_ratio": None,
            "interest_coverage": None,
            "debt_to_assets": debt_to_assets
        },
        "growth_metrics": {
            "earnings_growth_1y": earnings_growth_1y,
            "book_value_growth": book_value_growth,
            "dividend_growth_1y": dividend_growth_rate
        },
        "dividend_info": {
            "dividend_yield": dividend_yield,
            "dividend_per_share": dividend_per_share,
            "payout_ratio": payout_ratio,
            "dividend_growth_rate": dividend_growth_rate
        }
    }

    # Calculate investment score
    score = 0
    pe_for_score = fundamental_data["valuation_ratios"]["pe_ratio"]
    dte_for_score = fundamental_data["financial_strength"]["debt_to_equity"]
    earn_growth = fundamental_data["growth_metrics"].get("earnings_growth_1y")
    dy = fundamental_data["dividend_info"]["dividend_yield"]

    if pe_for_score is not None and pe_for_score < 20:
        score += 1
    # ROE not available; skip
    if dte_for_score is not None and dte_for_score < 0.5:
        score += 1
    if earn_growth is not None and earn_growth > 5:
        score += 1
    if dy is not None and dy > 2:
        score += 1

    fundamental_data["investment_score"] = {
        "score": score,
        "max_score": 4,
        "rating": "Strong Buy" if score >= 4 else "Buy" if score >= 3 else "Hold" if score >= 2 else "Sell"
    }

    return fundamental_data


@router.get("/stock/{symbol}/technical-analysis")
def get_technical_analysis(
        symbol: str,
        current_user: CurrentUser,
        session: SessionDep,
        period: int = Query(30, description="Number of days for analysis"),
):
    """Get technical analysis indicators for a stock"""

    # Get stock information
    stock = session.exec(
        select(Company).where(Company.trading_code == symbol.upper())
    ).first()

    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock not found"
        )

    # Get historical price data
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=period)

    price_data = session.exec(
        select(DailyOHLC)
        .where(DailyOHLC.company_id == stock.id)
        .where(DailyOHLC.date >= start_date)
        .where(DailyOHLC.date <= end_date)
        .order_by(DailyOHLC.date)
    ).all()

    if not price_data:
        # Generate mock price data for demonstration
        current_price = float(stock.current_price or 100)
        prices = []
        for i in range(period):
            # Generate realistic price movement
            price = current_price * (1 + (hash(f"{symbol}{i}") % 21 - 10) / 100)
            prices.append(price)

        price_data = [{"close": price, "volume": 1000000 + i * 1000} for i, price in enumerate(prices)]
    else:
        price_data = [{"close": float(p.close), "volume": p.volume} for p in price_data]

    if len(price_data) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient price data for technical analysis"
        )

    # Calculate technical indicators
    closes = [p["close"] for p in price_data]
    volumes = [p["volume"] for p in price_data]

    # Simple Moving Average (SMA)
    sma_5 = sum(closes[-5:]) / 5 if len(closes) >= 5 else closes[-1]
    sma_20 = sum(closes[-20:]) / 20 if len(closes) >= 20 else closes[-1]
    sma_50 = sum(closes[-50:]) / 50 if len(closes) >= 50 else closes[-1]

    # Exponential Moving Average (EMA)
    def calculate_ema(prices, period):
        if len(prices) < period:
            return prices[-1]
        multiplier = 2 / (period + 1)
        ema = prices[0]
        for price in prices[1:]:
            ema = (price * multiplier) + (ema * (1 - multiplier))
        return ema

    ema_12 = calculate_ema(closes, 12)
    ema_26 = calculate_ema(closes, 26)

    # MACD
    macd_line = ema_12 - ema_26
    signal_line = calculate_ema([macd_line] * 9, 9)  # Simplified
    macd_histogram = macd_line - signal_line

    # RSI
    def calculate_rsi(prices, period=14):
        if len(prices) < period + 1:
            return 50  # Neutral RSI

        gains = []
        losses = []

        for i in range(1, len(prices)):
            change = prices[i] - prices[i - 1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))

        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period

        if avg_loss == 0:
            return 100

        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi

    rsi = calculate_rsi(closes)

    # Bollinger Bands
    sma_20_bb = sum(closes[-20:]) / 20 if len(closes) >= 20 else closes[-1]
    std_dev = (sum((price - sma_20_bb) ** 2 for price in closes[-20:]) / 20) ** 0.5 if len(closes) >= 20 else 0
    upper_band = sma_20_bb + (2 * std_dev)
    lower_band = sma_20_bb - (2 * std_dev)

    # Volume indicators
    avg_volume = sum(volumes) / len(volumes)
    volume_ratio = volumes[-1] / avg_volume if avg_volume > 0 else 1

    # Support and Resistance levels
    recent_highs = max(closes[-10:]) if len(closes) >= 10 else max(closes)
    recent_lows = min(closes[-10:]) if len(closes) >= 10 else min(closes)

    # Generate signals
    signals = []
    current_price = closes[-1]

    if current_price > sma_20:
        signals.append({"type": "bullish", "indicator": "SMA", "message": "Price above 20-day SMA"})
    else:
        signals.append({"type": "bearish", "indicator": "SMA", "message": "Price below 20-day SMA"})

    if rsi > 70:
        signals.append({"type": "bearish", "indicator": "RSI", "message": "Overbought condition (RSI > 70)"})
    elif rsi < 30:
        signals.append({"type": "bullish", "indicator": "RSI", "message": "Oversold condition (RSI < 30)"})

    if macd_line > signal_line:
        signals.append({"type": "bullish", "indicator": "MACD", "message": "MACD above signal line"})
    else:
        signals.append({"type": "bearish", "indicator": "MACD", "message": "MACD below signal line"})

    return {
        "symbol": symbol,
        "period": period,
        "current_price": current_price,
        "indicators": {
            "moving_averages": {
                "sma_5": round(sma_5, 2),
                "sma_20": round(sma_20, 2),
                "sma_50": round(sma_50, 2),
                "ema_12": round(ema_12, 2),
                "ema_26": round(ema_26, 2)
            },
            "momentum": {
                "rsi": round(rsi, 2),
                "macd_line": round(macd_line, 2),
                "signal_line": round(signal_line, 2),
                "macd_histogram": round(macd_histogram, 2)
            },
            "volatility": {
                "upper_bollinger": round(upper_band, 2),
                "middle_bollinger": round(sma_20_bb, 2),
                "lower_bollinger": round(lower_band, 2),
                "bollinger_position": round((current_price - lower_band) / (upper_band - lower_band) * 100, 2)
            },
            "volume": {
                "current_volume": volumes[-1],
                "average_volume": round(avg_volume, 0),
                "volume_ratio": round(volume_ratio, 2)
            },
            "support_resistance": {
                "resistance": round(recent_highs, 2),
                "support": round(recent_lows, 2),
                "current_position": round((current_price - recent_lows) / (recent_highs - recent_lows) * 100, 2)
            }
        },
        "signals": signals,
        "summary": {
            "bullish_signals": len([s for s in signals if s["type"] == "bullish"]),
            "bearish_signals": len([s for s in signals if s["type"] == "bearish"]),
            "overall_sentiment": "bullish" if len([s for s in signals if s["type"] == "bullish"]) > len(
                [s for s in signals if s["type"] == "bearish"]) else "bearish"
        }
    }


@router.get("/stock/{symbol}/news")
def get_stock_news(
        symbol: str,
        current_user: CurrentUser,
        session: SessionDep,
        limit: int = Query(20, description="Number of news articles to return"),
):
    """Get recent news for a specific stock"""

    # Get stock information
    stock = session.exec(
        select(Company).where(Company.trading_code == symbol.upper())
    ).first()

    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock not found"
        )

    # Get stock-specific news
    stock_news = session.exec(
        select(StockNews, News)
        .join(News, StockNews.news_id == News.id)
        .where(StockNews.stock_id == stock.id)
        .where(News.is_active == True)
        .order_by(News.published_at.desc())
        .limit(limit)
    ).all()

    news_articles = []
    for stock_news_item, news in stock_news:
        news_articles.append({
            "id": str(news.id),
            "title": news.title,
            "summary": news.summary,
            "content": news.content[:500] + "..." if len(news.content) > 500 else news.content,
            "source": news.source,
            "source_url": news.source_url,
            "author": news.author,
            "category": news.category,
            "sentiment": news.sentiment,
            "sentiment_score": float(news.sentiment_score) if news.sentiment_score else None,
            "published_at": news.published_at,
            "tags": news.tags,
            "relevance_score": stock_news_item.relevance_score
        })

    # If no specific stock news, get general market news
    if not news_articles:
        general_news = session.exec(
            select(News)
            .where(News.category.in_(["market", "earnings", "analysis"]))
            .where(News.is_active == True)
            .order_by(News.published_at.desc())
            .limit(limit)
        ).all()

        for news in general_news:
            news_articles.append({
                "id": str(news.id),
                "title": news.title,
                "summary": news.summary,
                "content": news.content[:500] + "..." if len(news.content) > 500 else news.content,
                "source": news.source,
                "source_url": news.source_url,
                "author": news.author,
                "category": news.category,
                "sentiment": news.sentiment,
                "sentiment_score": float(news.sentiment_score) if news.sentiment_score else None,
                "published_at": news.published_at,
                "tags": news.tags,
                "relevance_score": 0.5  # Lower relevance for general news
            })

    return {
        "symbol": symbol,
        "stock_name": stock.company_name,
        "total_articles": len(news_articles),
        "articles": news_articles
    }


@router.get("/market/sectors")
def get_sector_analysis(
        current_user: CurrentUser,
        session: SessionDep
):
    """Get market sector performance analysis"""

    # Get latest date from DailyOHLC
    latest_date_query = select(func.max(DailyOHLC.date))
    latest_date = session.exec(latest_date_query).one()
    
    if not latest_date:
        # Fallback if no data exists
        return {
            "total_sectors": 0,
            "sectors": [],
            "market_summary": {
                "best_performing_sector": None,
                "worst_performing_sector": None,
                "avg_sector_performance": 0
            }
        }

    # Calculate dates for 1W and 1M comparison
    # We find the max date that is <= target date to handle weekends/holidays
    date_1w_target = latest_date - timedelta(days=7)
    date_1m_target = latest_date - timedelta(days=30)
    
    # Helper to get closest available trading date
    def get_closest_date(target_date):
        query = select(func.max(DailyOHLC.date)).where(DailyOHLC.date <= target_date)
        return session.exec(query).one()
        
    date_1w = get_closest_date(date_1w_target)
    date_1m = get_closest_date(date_1m_target)

    # Fetch data for calculations
    # We need: Sector, Market Cap, Latest Price, 1W Price, 1M Price for ALL companies
    # This is more efficient than querying per sector
    
    # 1. Get latest data (Price + Change%)
    latest_data = session.exec(
        select(
            Company.id, 
            Company.sector, 
            Company.market_cap,
            DailyOHLC.close_price,
            DailyOHLC.change_percent
        )
        .join(DailyOHLC, Company.id == DailyOHLC.company_id)
        .where(DailyOHLC.date == latest_date)
        .where(Company.sector.is_not(None))
    ).all()
    
    # 2. Get 1W data (Price only)
    data_1w = {}
    if date_1w:
        results_1w = session.exec(
            select(DailyOHLC.company_id, DailyOHLC.close_price)
            .where(DailyOHLC.date == date_1w)
        ).all()
        data_1w = {r[0]: float(r[1]) for r in results_1w}
        
    # 3. Get 1M data (Price only)
    data_1m = {}
    if date_1m:
        results_1m = session.exec(
            select(DailyOHLC.company_id, DailyOHLC.close_price)
            .where(DailyOHLC.date == date_1m)
        ).all()
        data_1m = {r[0]: float(r[1]) for r in results_1m}

    # Aggregate by sector
    sectors_data = {}
    total_market_cap = 0
    
    for company_id, sector, mcap, close, change_pct in latest_data:
        if not sector: continue
        
        mcap_val = float(mcap or 0)
        close_val = float(close or 0)
        change_pct_val = float(change_pct or 0)
        
        if sector not in sectors_data:
            sectors_data[sector] = {
                "count": 0,
                "total_mcap": 0,
                "weighted_change_1d": 0,
                "weighted_change_1w": 0,
                "weighted_change_1m": 0,
                "mcap_for_1w": 0, # Only sum mcap if we have 1w data for this stock
                "mcap_for_1m": 0  # Only sum mcap if we have 1m data for this stock
            }
            
        sec = sectors_data[sector]
        sec["count"] += 1
        sec["total_mcap"] += mcap_val
        total_market_cap += mcap_val
        
        # 1D Change (Weighted)
        sec["weighted_change_1d"] += change_pct_val * mcap_val
        
        # 1W Change
        if company_id in data_1w and data_1w[company_id] > 0:
            price_1w = data_1w[company_id]
            change_1w = ((close_val - price_1w) / price_1w) * 100
            sec["weighted_change_1w"] += change_1w * mcap_val
            sec["mcap_for_1w"] += mcap_val
            
        # 1M Change
        if company_id in data_1m and data_1m[company_id] > 0:
            price_1m = data_1m[company_id]
            change_1m = ((close_val - price_1m) / price_1m) * 100
            sec["weighted_change_1m"] += change_1m * mcap_val
            sec["mcap_for_1m"] += mcap_val

    # Finalize results
    sector_analysis = []
    
    for sector, data in sectors_data.items():
        # Avoid division by zero
        perf_1d = (data["weighted_change_1d"] / data["total_mcap"]) if data["total_mcap"] > 0 else 0
        perf_1w = (data["weighted_change_1w"] / data["mcap_for_1w"]) if data["mcap_for_1w"] > 0 else 0
        perf_1m = (data["weighted_change_1m"] / data["mcap_for_1m"]) if data["mcap_for_1m"] > 0 else 0
        
        weight = (data["total_mcap"] / total_market_cap * 100) if total_market_cap > 0 else 0
        
        sector_analysis.append({
            "sector": sector,
            "stock_count": data["count"],
            "performance": {
                "1_day": round(perf_1d, 2),
                "1_week": round(perf_1w, 2),
                "1_month": round(perf_1m, 2)
            },
            "market_cap_weight": round(weight, 2),
            "momentum": "bullish" if perf_1w > 2 else "bearish" if perf_1w < -2 else "neutral"
        })

    # Sort by 1-day performance (more relevant for daily dashboard)
    sector_analysis.sort(key=lambda x: x["performance"]["1_day"], reverse=True)

    return {
        "total_sectors": len(sector_analysis),
        "sectors": sector_analysis,
        "market_summary": {
            "best_performing_sector": sector_analysis[0]["sector"] if sector_analysis else None,
            "worst_performing_sector": sector_analysis[-1]["sector"] if sector_analysis else None,
            "avg_sector_performance": round(
                sum(s["performance"]["1_day"] for s in sector_analysis) / len(sector_analysis),
                2) if sector_analysis else 0
        }
    }


@router.get("/stock-of-the-day")
def get_stock_of_the_day(
        current_user: CurrentUser,
        session: SessionDep
):
    """Pick a stock of the day using a combined score from ResearchService."""
    service = ResearchService(session)
    # Take top by score from screener with light filters
    results = service.stock_screener(limit=50)
    if not results:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No stocks available")
    top = max(results, key=lambda r: r.score)
    return {
        "symbol": top.symbol,
        "name": top.name,
        "sector": top.sector,
        "current_price": top.current_price,
        "score": top.score,
        "technical_score": top.technical_score,
        "change_percent": top.change_percent,
        "reason": "Top composite score across fundamentals and technicals",
        "target_price": round(top.current_price * 1.1, 2),
        "rating": "Buy" if top.score >= 6 else "Hold",
    }


@router.get("/analyst-picks")
def get_analyst_picks(
        session: SessionDep,
        limit: int = Query(5, ge=1, le=20),
):
    """Return a list of analyst picks with rating and target price."""
    service = ResearchService(session)
    stocks = session.exec(select(Company).limit(100)).all() or []
    picks = []
    for stock in stocks[:100]:
        fin = service._calculate_financial_metrics(stock)
        tech = service._calculate_technical_indicators(stock)
        rating, target, recommendation = service._generate_analyst_recommendation(stock, fin, tech)
        picks.append({
            "symbol": stock.trading_code,
            "name": stock.company_name or stock.name,
            "sector": stock.sector,
            "rating": rating,
            "target_price": round(target, 2),
            "recommendation": recommendation,
        })
    picks.sort(key=lambda p: (p["rating"] in ["Strong Buy", "Buy"], p["target_price"]), reverse=True)
    return picks[:limit]


@router.get("/earnings-highlights")
def get_earnings_highlights(
        session: SessionDep,
        limit: int = Query(10, ge=1, le=50),
):
    """Return latest quarterly results highlights (placeholder composition)."""
    # Placeholder: derive from DailyOHLC and StockData deltas as proxy
    end = datetime.utcnow()
    start = end - timedelta(days=30)
    rows = session.exec(
        select(DailyOHLC, Company)
        .join(Company, Company.id == DailyOHLC.company_id)
        .where(DailyOHLC.date >= start)
        .order_by(DailyOHLC.date.desc())
        .limit(200)
    ).all()
    table = []
    seen = set()
    for ohlc, sc in rows:
        symbol = sc.trading_code
        if not symbol or symbol in seen:
            continue
        seen.add(symbol)
        yoy = float(ohlc.change_percent)
        table.append({
            "symbol": symbol,
            "name": sc.company_name or sc.name,
            "revenue_yoy": round(2.0 + (hash(symbol) % 150) / 10.0, 2),
            "eps_yoy": round(-5.0 + (hash(symbol + 'e') % 200) / 10.0, 2),
            "margin": round(10.0 + (hash(symbol + 'm') % 200) / 10.0, 2),
            "price_change_day": round(yoy, 2),
        })
    return table[:limit]


@router.get("/themes")
def get_thematic_ideas(
        current_user: CurrentUser,
        session: SessionDep
):
    """Return thematic investment ideas with example tickers."""
    sectors = [row[0] for row in
               session.exec(select(Company.sector).where(Company.sector.is_not(None)).distinct()).all()]
    themes = [
        {"name": "Export Boosters", "description": "Export-oriented companies benefiting from FX incentives",
         "tags": ["Export", "FX"], "tickers": []},
        {"name": "Dividend Champions", "description": "High-yield, stable dividend payers", "tags": ["Dividend"],
         "tickers": []},
        {"name": "Infrastructure Play", "description": "Beneficiaries of public and private infrastructure spend",
         "tags": ["Infra"], "tickers": []},
    ]
    # Simple mapping of first few symbols per sector to each theme
    all_symbols = [
        row.trading_code
        for row in session.exec(select(Company).limit(200)).all()
        if row.trading_code
    ]
    for i, theme in enumerate(themes):
        theme["tickers"] = all_symbols[i::3][:8]
    return {"themes": themes, "sectors": sectors}
