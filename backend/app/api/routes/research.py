from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import select, Session, func, and_, or_
import math

from app.api.deps import get_current_user, get_session_dep
from app.model.user import User
from app.model.stock import StockCompany, StockData, DailyOHLC
from app.model.alert import News, StockNews

router = APIRouter(prefix="/research", tags=["research"])


@router.get("/stock-screener")
def stock_screener(
    min_market_cap: Optional[float] = Query(None, description="Minimum market cap in millions"),
    max_market_cap: Optional[float] = Query(None, description="Maximum market cap in millions"),
    min_pe_ratio: Optional[float] = Query(None, description="Minimum P/E ratio"),
    max_pe_ratio: Optional[float] = Query(None, description="Maximum P/E ratio"),
    min_dividend_yield: Optional[float] = Query(None, description="Minimum dividend yield %"),
    max_dividend_yield: Optional[float] = Query(None, description="Maximum dividend yield %"),
    sector: Optional[str] = Query(None, description="Sector filter"),
    min_volume: Optional[int] = Query(None, description="Minimum average volume"),
    min_price: Optional[float] = Query(None, description="Minimum stock price"),
    max_price: Optional[float] = Query(None, description="Maximum stock price"),
    limit: int = Query(50, description="Maximum number of results"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Advanced stock screener with fundamental and technical filters"""
    
    # Build the query
    query = select(StockCompany)
    
    # Apply filters
    conditions = []
    
    if sector:
        conditions.append(StockCompany.sector == sector)
    
    if min_price is not None:
        conditions.append(StockCompany.current_price >= min_price)
    
    if max_price is not None:
        conditions.append(StockCompany.current_price <= max_price)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    # Execute query
    stocks = session.exec(query.limit(limit)).all()
    
    # Calculate additional metrics for each stock
    screener_results = []
    for stock in stocks:
        # Mock financial ratios (in real implementation, calculate from financial data)
        mock_pe_ratio = 15.5 + (hash(stock.symbol) % 20)  # Mock P/E between 15-35
        mock_market_cap = float(stock.current_price or 100) * 1000000  # Mock market cap
        mock_dividend_yield = 2.0 + (hash(stock.symbol) % 50) / 10  # Mock dividend yield 2-7%
        mock_volume = 500000 + (hash(stock.symbol) % 2000000)  # Mock volume
        
        # Apply additional filters
        if min_market_cap is not None and mock_market_cap < min_market_cap * 1000000:
            continue
        if max_market_cap is not None and mock_market_cap > max_market_cap * 1000000:
            continue
        if min_pe_ratio is not None and mock_pe_ratio < min_pe_ratio:
            continue
        if max_pe_ratio is not None and mock_pe_ratio > max_pe_ratio:
            continue
        if min_dividend_yield is not None and mock_dividend_yield < min_dividend_yield:
            continue
        if max_dividend_yield is not None and mock_dividend_yield > max_dividend_yield:
            continue
        if min_volume is not None and mock_volume < min_volume:
            continue
        
        # Calculate score based on criteria
        score = 0
        if mock_pe_ratio < 20:
            score += 1
        if mock_dividend_yield > 3:
            score += 1
        if mock_market_cap > 1000000000:  # > $1B market cap
            score += 1
        
        screener_results.append({
            "stock_id": str(stock.id),
            "symbol": stock.symbol,
            "name": stock.name,
            "sector": stock.sector,
            "current_price": float(stock.current_price or 0),
            "market_cap": mock_market_cap,
            "pe_ratio": round(mock_pe_ratio, 2),
            "dividend_yield": round(mock_dividend_yield, 2),
            "avg_volume": mock_volume,
            "score": score,
            "52_week_high": float(stock.week_52_high or stock.current_price or 0),
            "52_week_low": float(stock.week_52_low or stock.current_price or 0)
        })
    
    # Sort by score descending
    screener_results.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "total_results": len(screener_results),
        "filters_applied": {
            "min_market_cap": min_market_cap,
            "max_market_cap": max_market_cap,
            "min_pe_ratio": min_pe_ratio,
            "max_pe_ratio": max_pe_ratio,
            "min_dividend_yield": min_dividend_yield,
            "max_dividend_yield": max_dividend_yield,
            "sector": sector,
            "min_volume": min_volume,
            "min_price": min_price,
            "max_price": max_price
        },
        "stocks": screener_results
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
        select(StockCompany).where(StockCompany.symbol == symbol.upper())
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
            "symbol": stock.symbol,
            "name": stock.name,
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
        select(StockCompany).where(StockCompany.symbol == symbol.upper())
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
        .where(DailyOHLC.stock_id == stock.id)
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
        select(StockCompany).where(StockCompany.symbol == symbol.upper())
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
        "stock_name": stock.name,
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
        select(StockCompany.sector, func.count(StockCompany.id).label("stock_count"))
        .where(StockCompany.sector.is_not(None))
        .group_by(StockCompany.sector)
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