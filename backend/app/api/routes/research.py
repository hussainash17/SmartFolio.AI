from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import select, Session, func, and_, or_
import math

from app.api.deps import get_current_user, get_session_dep
from app.model.user import User
from app.model.stock import StockData, DailyOHLC
from app.model.company import Company
from app.model.fundamental import FinancialPerformance
from app.model.alert import News, StockNews
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
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
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
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get fundamental analysis data for a stock"""
    
    # Get stock information
    stock = session.exec(
        select(Company).where(Company.trading_code == symbol.upper())
    ).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock not found"
        )
    
    # Mock fundamental data (in real implementation, fetch from financial data API)
    current_price = float(stock.current_price or 100)
    
    # Mock financial ratios
    fundamental_data = {
        "basic_info": {
            "symbol": stock.trading_code,
            "name": stock.company_name,
            "sector": stock.sector,
            "current_price": current_price,
            "market_cap": current_price * 1000000,  # Mock shares outstanding
            "enterprise_value": current_price * 1100000
        },
        "valuation_ratios": {
            "pe_ratio": round(15.5 + (hash(symbol) % 20), 2),
            "peg_ratio": round(1.2 + (hash(symbol) % 30) / 10, 2),
            "price_to_book": round(2.1 + (hash(symbol) % 40) / 10, 2),
            "price_to_sales": round(3.2 + (hash(symbol) % 50) / 10, 2),
            "ev_to_ebitda": round(12.5 + (hash(symbol) % 25), 2),
            "price_to_cash_flow": round(8.3 + (hash(symbol) % 20), 2)
        },
        "profitability_ratios": {
            "gross_margin": round(35.5 + (hash(symbol) % 30), 2),
            "operating_margin": round(12.3 + (hash(symbol) % 20), 2),
            "net_margin": round(8.7 + (hash(symbol) % 15), 2),
            "return_on_equity": round(15.2 + (hash(symbol) % 25), 2),
            "return_on_assets": round(7.8 + (hash(symbol) % 15), 2),
            "return_on_invested_capital": round(11.4 + (hash(symbol) % 20), 2)
        },
        "financial_strength": {
            "debt_to_equity": round(0.3 + (hash(symbol) % 80) / 100, 2),
            "current_ratio": round(1.5 + (hash(symbol) % 20) / 10, 2),
            "quick_ratio": round(1.1 + (hash(symbol) % 15) / 10, 2),
            "interest_coverage": round(5.5 + (hash(symbol) % 30), 2),
            "debt_to_assets": round(0.25 + (hash(symbol) % 40) / 100, 2)
        },
        "growth_metrics": {
            "revenue_growth_1y": round(-5.0 + (hash(symbol) % 30), 2),
            "revenue_growth_3y": round(-3.0 + (hash(symbol) % 25), 2),
            "earnings_growth_1y": round(-8.0 + (hash(symbol) % 40), 2),
            "earnings_growth_3y": round(-5.0 + (hash(symbol) % 35), 2),
            "dividend_growth_1y": round(0.0 + (hash(symbol) % 15), 2),
            "book_value_growth": round(-2.0 + (hash(symbol) % 20), 2)
        },
        "dividend_info": {
            "dividend_yield": round(2.0 + (hash(symbol) % 50) / 10, 2),
            "dividend_per_share": round(2.5 + (hash(symbol) % 30) / 10, 2),
            "payout_ratio": round(30.0 + (hash(symbol) % 50), 2),
            "dividend_growth_rate": round(3.0 + (hash(symbol) % 10), 2)
        }
    }
    
    # Calculate investment score
    score = 0
    if fundamental_data["valuation_ratios"]["pe_ratio"] < 20:
        score += 1
    if fundamental_data["profitability_ratios"]["return_on_equity"] > 15:
        score += 1
    if fundamental_data["financial_strength"]["debt_to_equity"] < 0.5:
        score += 1
    if fundamental_data["growth_metrics"]["revenue_growth_1y"] > 5:
        score += 1
    if fundamental_data["dividend_info"]["dividend_yield"] > 2:
        score += 1
    
    fundamental_data["investment_score"] = {
        "score": score,
        "max_score": 5,
        "rating": "Strong Buy" if score >= 4 else "Buy" if score >= 3 else "Hold" if score >= 2 else "Sell"
    }
    
    return fundamental_data


@router.get("/stock/{symbol}/technical-analysis")
def get_technical_analysis(
    symbol: str,
    period: int = Query(30, description="Number of days for analysis"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
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
            change = prices[i] - prices[i-1]
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
            "overall_sentiment": "bullish" if len([s for s in signals if s["type"] == "bullish"]) > len([s for s in signals if s["type"] == "bearish"]) else "bearish"
        }
    }


@router.get("/stock/{symbol}/news")
def get_stock_news(
    symbol: str,
    limit: int = Query(20, description="Number of news articles to return"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
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
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get market sector performance analysis"""
    
    # Get all sectors
    sectors_query = session.exec(
        select(Company.sector, func.count(Company.id).label("stock_count"))
        .where(Company.sector.is_not(None))
        .group_by(Company.sector)
    ).all()
    
    sector_analysis = []
    for sector, stock_count in sectors_query:
        # Mock sector performance (in real implementation, calculate from actual data)
        performance_1d = -2.0 + (hash(sector) % 80) / 10  # -2% to +6%
        performance_1w = -5.0 + (hash(sector + "1w") % 150) / 10  # -5% to +10%
        performance_1m = -10.0 + (hash(sector + "1m") % 300) / 10  # -10% to +20%
        
        sector_analysis.append({
            "sector": sector,
            "stock_count": stock_count,
            "performance": {
                "1_day": round(performance_1d, 2),
                "1_week": round(performance_1w, 2),
                "1_month": round(performance_1m, 2)
            },
            "market_cap_weight": round(5.0 + (hash(sector + "mcap") % 150) / 10, 2),  # Mock weight
            "momentum": "bullish" if performance_1w > 2 else "bearish" if performance_1w < -2 else "neutral"
        })
    
    # Sort by 1-week performance
    sector_analysis.sort(key=lambda x: x["performance"]["1_week"], reverse=True)
    
    return {
        "total_sectors": len(sector_analysis),
        "sectors": sector_analysis,
        "market_summary": {
            "best_performing_sector": sector_analysis[0]["sector"] if sector_analysis else None,
            "worst_performing_sector": sector_analysis[-1]["sector"] if sector_analysis else None,
            "avg_sector_performance": round(sum(s["performance"]["1_week"] for s in sector_analysis) / len(sector_analysis), 2) if sector_analysis else 0
        }
    }


@router.get("/stock-of-the-day")
def get_stock_of_the_day(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
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
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
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
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
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
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Return thematic investment ideas with example tickers."""
    sectors = [row[0] for row in session.exec(select(Company.sector).where(Company.sector.is_not(None)).distinct()).all()]
    themes = [
        {"name": "Export Boosters", "description": "Export-oriented companies benefiting from FX incentives", "tags": ["Export", "FX"], "tickers": []},
        {"name": "Dividend Champions", "description": "High-yield, stable dividend payers", "tags": ["Dividend"], "tickers": []},
        {"name": "Infrastructure Play", "description": "Beneficiaries of public and private infrastructure spend", "tags": ["Infra"], "tickers": []},
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