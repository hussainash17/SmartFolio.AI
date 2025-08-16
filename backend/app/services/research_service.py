"""
Research service module.

This module provides stock research functionality including
stock screening, financial analysis, technical indicators, and market research.
"""

from typing import Dict, List, Optional, Tuple, Any
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal
from sqlmodel import Session, select, func, and_, or_, desc
import logging
from dataclasses import dataclass
import math

from app.services.base import BaseService, ServiceException
from app.model.stock import StockCompany, StockData, DailyOHLC
from app.model.alert import News, StockNews
from app.model.portfolio import Portfolio, PortfolioPosition
from app.model.trade import Trade
from app.model.user import User

logger = logging.getLogger(__name__)


@dataclass
class StockScreenerResult:
    """Data class for stock screener results."""
    stock_id: str
    symbol: str
    name: str
    sector: str
    current_price: float
    market_cap: float
    pe_ratio: float
    dividend_yield: float
    avg_volume: int
    score: int
    change_percent: float
    technical_score: int


@dataclass
class FinancialMetrics:
    """Data class for calculated financial metrics."""
    pe_ratio: float
    pb_ratio: float
    market_cap: float
    dividend_yield: float
    roe: float
    debt_to_equity: float
    revenue_growth: float
    eps_growth: float
    free_cash_flow: float


@dataclass
class TechnicalIndicators:
    """Data class for technical analysis indicators."""
    rsi: float
    macd: float
    moving_avg_20: float
    moving_avg_50: float
    bollinger_upper: float
    bollinger_lower: float
    volume_trend: str
    support_level: float
    resistance_level: float


@dataclass
class StockAnalysis:
    """Comprehensive stock analysis data."""
    stock: StockCompany
    financial_metrics: FinancialMetrics
    technical_indicators: TechnicalIndicators
    price_history: List[Dict[str, Any]]
    news: List[Dict[str, Any]]
    analyst_rating: str
    price_target: float
    recommendation: str


class ResearchService(BaseService[StockCompany, None, None]):
    """Service for stock research and analysis operations."""
    
    def __init__(self, session: Optional[Session] = None):
        super().__init__(StockCompany, session)
    
    def stock_screener(
        self,
        min_market_cap: Optional[float] = None,
        max_market_cap: Optional[float] = None,
        min_pe_ratio: Optional[float] = None,
        max_pe_ratio: Optional[float] = None,
        min_dividend_yield: Optional[float] = None,
        max_dividend_yield: Optional[float] = None,
        sector: Optional[str] = None,
        min_volume: Optional[int] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        limit: int = 50
    ) -> List[StockScreenerResult]:
        """
        Advanced stock screener with fundamental and technical filters.
        
        Args:
            Various filtering parameters
            limit: Maximum number of results
            
        Returns:
            List of stocks matching the criteria
        """
        try:
            # Build the query
            query = select(StockCompany)
            conditions = []
            
            # Apply basic filters
            if sector:
                conditions.append(StockCompany.sector == sector)
            
            if min_price is not None:
                conditions.append(StockCompany.current_price >= min_price)
            
            if max_price is not None:
                conditions.append(StockCompany.current_price <= max_price)
            
            if conditions:
                query = query.where(and_(*conditions))
            
            # Execute query
            stocks = self.session.exec(query.limit(limit * 2)).all()  # Get more for filtering
            
            # Calculate additional metrics and apply filters
            screener_results = []
            for stock in stocks:
                try:
                    metrics = self._calculate_financial_metrics(stock)
                    technical = self._calculate_technical_indicators(stock)
                    
                    # Apply financial filters
                    if min_market_cap is not None and metrics.market_cap < min_market_cap * 1000000:
                        continue
                    if max_market_cap is not None and metrics.market_cap > max_market_cap * 1000000:
                        continue
                    if min_pe_ratio is not None and metrics.pe_ratio < min_pe_ratio:
                        continue
                    if max_pe_ratio is not None and metrics.pe_ratio > max_pe_ratio:
                        continue
                    if min_dividend_yield is not None and metrics.dividend_yield < min_dividend_yield:
                        continue
                    if max_dividend_yield is not None and metrics.dividend_yield > max_dividend_yield:
                        continue
                    
                    # Calculate score based on criteria
                    score = self._calculate_stock_score(metrics, technical)
                    
                    # Calculate technical score
                    technical_score = self._calculate_technical_score(technical)
                    
                    # Calculate price change
                    change_percent = self._calculate_price_change(stock)
                    
                    screener_results.append(StockScreenerResult(
                        stock_id=str(stock.id),
                        symbol=stock.symbol,
                        name=stock.company_name,
                        sector=stock.sector or "Unknown",
                        current_price=float(stock.current_price or 0),
                        market_cap=metrics.market_cap,
                        pe_ratio=metrics.pe_ratio,
                        dividend_yield=metrics.dividend_yield,
                        avg_volume=int(self._get_average_volume(stock)),
                        score=score,
                        change_percent=change_percent,
                        technical_score=technical_score
                    ))
                    
                except Exception as e:
                    logger.warning(f"Error processing stock {stock.symbol}: {e}")
                    continue
            
            # Sort by score and limit results
            screener_results.sort(key=lambda x: x.score, reverse=True)
            return screener_results[:limit]
            
        except Exception as e:
            logger.error(f"Error in stock screener: {e}")
            raise ServiceException(f"Stock screening failed: {str(e)}")
    
    def get_stock_analysis(self, stock_id: UUID) -> StockAnalysis:
        """
        Get comprehensive analysis for a specific stock.
        
        Args:
            stock_id: Stock UUID
            
        Returns:
            Complete stock analysis
        """
        try:
            stock = self.get_by_id(stock_id)
            if not stock:
                raise ServiceException("Stock not found", status_code=404)
            
            # Calculate metrics
            financial_metrics = self._calculate_financial_metrics(stock)
            technical_indicators = self._calculate_technical_indicators(stock)
            
            # Get price history
            price_history = self._get_price_history(stock, days=90)
            
            # Get news
            news = self._get_stock_news(stock, limit=10)
            
            # Generate analyst rating and recommendation
            analyst_rating, price_target, recommendation = self._generate_analyst_recommendation(
                stock, financial_metrics, technical_indicators
            )
            
            return StockAnalysis(
                stock=stock,
                financial_metrics=financial_metrics,
                technical_indicators=technical_indicators,
                price_history=price_history,
                news=news,
                analyst_rating=analyst_rating,
                price_target=price_target,
                recommendation=recommendation
            )
            
        except Exception as e:
            logger.error(f"Error getting stock analysis for {stock_id}: {e}")
            raise ServiceException(f"Failed to analyze stock: {str(e)}")
    
    def get_trending_stocks(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get trending stocks based on volume and price movement.
        
        Args:
            limit: Number of stocks to return
            
        Returns:
            List of trending stocks with metrics
        """
        try:
            # Get stocks with recent activity
            stocks = self.session.exec(
                select(StockCompany)
                .where(StockCompany.current_price.is_not(None))
                .limit(limit * 3)
            ).all()
            
            trending = []
            for stock in stocks:
                try:
                    change_percent = self._calculate_price_change(stock)
                    volume_ratio = self._calculate_volume_ratio(stock)
                    trend_score = abs(change_percent) + (volume_ratio * 2)
                    
                    trending.append({
                        "stock_id": str(stock.id),
                        "symbol": stock.symbol,
                        "name": stock.company_name,
                        "current_price": float(stock.current_price or 0),
                        "change_percent": change_percent,
                        "volume_ratio": volume_ratio,
                        "trend_score": trend_score,
                        "sector": stock.sector
                    })
                except Exception as e:
                    logger.warning(f"Error processing trending stock {stock.symbol}: {e}")
                    continue
            
            # Sort by trend score
            trending.sort(key=lambda x: x["trend_score"], reverse=True)
            return trending[:limit]
            
        except Exception as e:
            logger.error(f"Error getting trending stocks: {e}")
            raise ServiceException(f"Failed to get trending stocks: {str(e)}")
    
    def get_sector_analysis(self, sector: str) -> Dict[str, Any]:
        """
        Get sector-wide analysis and performance.
        
        Args:
            sector: Sector name
            
        Returns:
            Sector analysis data
        """
        try:
            stocks = self.session.exec(
                select(StockCompany).where(StockCompany.sector == sector)
            ).all()
            
            if not stocks:
                raise ServiceException("No stocks found for this sector", status_code=404)
            
            # Calculate sector metrics
            total_market_cap = 0
            total_volume = 0
            price_changes = []
            pe_ratios = []
            
            for stock in stocks:
                try:
                    metrics = self._calculate_financial_metrics(stock)
                    total_market_cap += metrics.market_cap
                    total_volume += self._get_average_volume(stock)
                    price_changes.append(self._calculate_price_change(stock))
                    pe_ratios.append(metrics.pe_ratio)
                except Exception:
                    continue
            
            avg_pe_ratio = sum(pe_ratios) / len(pe_ratios) if pe_ratios else 0
            avg_change = sum(price_changes) / len(price_changes) if price_changes else 0
            
            # Find top performers
            top_performers = []
            for stock in stocks[:10]:  # Limit for performance
                try:
                    change = self._calculate_price_change(stock)
                    top_performers.append({
                        "symbol": stock.symbol,
                        "name": stock.company_name,
                        "change_percent": change,
                        "current_price": float(stock.current_price or 0)
                    })
                except Exception:
                    continue
            
            top_performers.sort(key=lambda x: x["change_percent"], reverse=True)
            
            return {
                "sector": sector,
                "total_stocks": len(stocks),
                "total_market_cap": total_market_cap,
                "avg_pe_ratio": avg_pe_ratio,
                "avg_change_percent": avg_change,
                "total_volume": total_volume,
                "top_performers": top_performers[:5],
                "bottom_performers": top_performers[-5:]
            }
            
        except Exception as e:
            logger.error(f"Error in sector analysis for {sector}: {e}")
            raise ServiceException(f"Sector analysis failed: {str(e)}")
    
    def search_stocks(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Search stocks by symbol or name.
        
        Args:
            query: Search query
            limit: Maximum results
            
        Returns:
            List of matching stocks
        """
        try:
            # Search by symbol and name
            stocks = self.session.exec(
                select(StockCompany).where(
                    or_(
                        StockCompany.symbol.ilike(f"%{query}%"),
                        StockCompany.company_name.ilike(f"%{query}%")
                    )
                ).limit(limit)
            ).all()
            
            results = []
            for stock in stocks:
                results.append({
                    "stock_id": str(stock.id),
                    "symbol": stock.symbol,
                    "name": stock.company_name,
                    "sector": stock.sector,
                    "current_price": float(stock.current_price or 0),
                    "change_percent": self._calculate_price_change(stock)
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching stocks with query '{query}': {e}")
            raise ServiceException(f"Stock search failed: {str(e)}")
    
    # Private helper methods
    def _calculate_financial_metrics(self, stock: StockCompany) -> FinancialMetrics:
        """Calculate financial metrics for a stock (with mock data)."""
        # In a real implementation, these would be calculated from actual financial data
        symbol_hash = hash(stock.symbol) % 1000
        
        return FinancialMetrics(
            pe_ratio=15.0 + (symbol_hash % 20),  # 15-35
            pb_ratio=1.0 + (symbol_hash % 5),    # 1-6
            market_cap=float(stock.current_price or 100) * 1000000 * (1 + symbol_hash % 100),
            dividend_yield=2.0 + (symbol_hash % 50) / 10,  # 2-7%
            roe=10.0 + (symbol_hash % 25),       # 10-35%
            debt_to_equity=0.3 + (symbol_hash % 70) / 100,  # 0.3-1.0
            revenue_growth=5.0 + (symbol_hash % 20),         # 5-25%
            eps_growth=3.0 + (symbol_hash % 30),             # 3-33%
            free_cash_flow=1000000 + (symbol_hash * 10000)
        )
    
    def _calculate_technical_indicators(self, stock: StockCompany) -> TechnicalIndicators:
        """Calculate technical indicators (with mock data)."""
        current_price = float(stock.current_price or 100)
        symbol_hash = hash(stock.symbol) % 1000
        
        return TechnicalIndicators(
            rsi=30 + (symbol_hash % 40),  # 30-70
            macd=-2.0 + (symbol_hash % 40) / 10,  # -2 to 2
            moving_avg_20=current_price * (0.95 + (symbol_hash % 10) / 100),
            moving_avg_50=current_price * (0.90 + (symbol_hash % 20) / 100),
            bollinger_upper=current_price * 1.05,
            bollinger_lower=current_price * 0.95,
            volume_trend="increasing" if symbol_hash % 2 else "decreasing",
            support_level=current_price * 0.92,
            resistance_level=current_price * 1.08
        )
    
    def _calculate_stock_score(self, financial: FinancialMetrics, technical: TechnicalIndicators) -> int:
        """Calculate a composite stock score."""
        score = 0
        
        # Financial scoring
        if financial.pe_ratio < 20:
            score += 2
        if financial.dividend_yield > 3:
            score += 1
        if financial.roe > 15:
            score += 2
        if financial.debt_to_equity < 0.5:
            score += 1
        if financial.revenue_growth > 10:
            score += 2
        
        # Technical scoring
        if 30 < technical.rsi < 70:
            score += 1
        if technical.macd > 0:
            score += 1
        if technical.volume_trend == "increasing":
            score += 1
        
        return min(score, 10)  # Cap at 10
    
    def _calculate_technical_score(self, technical: TechnicalIndicators) -> int:
        """Calculate technical analysis score."""
        score = 0
        
        if technical.rsi < 30:  # Oversold
            score += 2
        elif technical.rsi > 70:  # Overbought
            score -= 1
        else:
            score += 1
        
        if technical.macd > 0:
            score += 1
        
        if technical.volume_trend == "increasing":
            score += 1
        
        return max(0, min(score, 5))  # 0-5 range
    
    def _calculate_price_change(self, stock: StockCompany) -> float:
        """Calculate price change percentage (mock)."""
        symbol_hash = hash(stock.symbol) % 1000
        return -10.0 + (symbol_hash % 200) / 10  # -10% to +10%
    
    def _get_average_volume(self, stock: StockCompany) -> float:
        """Get average trading volume (mock)."""
        symbol_hash = hash(stock.symbol) % 1000
        return 500000 + (symbol_hash * 1000)
    
    def _calculate_volume_ratio(self, stock: StockCompany) -> float:
        """Calculate volume ratio vs average (mock)."""
        symbol_hash = hash(stock.symbol) % 1000
        return 0.5 + (symbol_hash % 200) / 100  # 0.5 to 2.5
    
    def _get_price_history(self, stock: StockCompany, days: int = 90) -> List[Dict[str, Any]]:
        """Get historical price data."""
        # In real implementation, query DailyOHLC table
        history = []
        current_price = float(stock.current_price or 100)
        
        for i in range(days):
            date = datetime.now() - timedelta(days=i)
            # Mock price with some volatility
            price_change = (-0.05 + (hash(f"{stock.symbol}{i}") % 100) / 1000)
            price = current_price * (1 + price_change)
            
            history.append({
                "date": date.isoformat(),
                "open": price * 0.99,
                "high": price * 1.02,
                "low": price * 0.98,
                "close": price,
                "volume": self._get_average_volume(stock) * (0.8 + (i % 40) / 100)
            })
        
        return history[::-1]  # Reverse to chronological order
    
    def _get_stock_news(self, stock: StockCompany, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent news for a stock."""
        # In real implementation, query news tables
        return [
            {
                "title": f"Market Analysis: {stock.symbol} Shows Strong Performance",
                "summary": f"Recent developments in {stock.company_name} indicate positive market trends...",
                "published_date": (datetime.now() - timedelta(days=1)).isoformat(),
                "source": "Financial Times",
                "sentiment": "positive"
            },
            {
                "title": f"{stock.symbol} Quarterly Earnings Report",
                "summary": f"{stock.company_name} releases quarterly results with key financial metrics...",
                "published_date": (datetime.now() - timedelta(days=3)).isoformat(),
                "source": "Bloomberg",
                "sentiment": "neutral"
            }
        ][:limit]
    
    def _generate_analyst_recommendation(
        self, 
        stock: StockCompany, 
        financial: FinancialMetrics, 
        technical: TechnicalIndicators
    ) -> Tuple[str, float, str]:
        """Generate analyst rating, price target, and recommendation."""
        current_price = float(stock.current_price or 100)
        
        # Calculate recommendation based on metrics
        score = self._calculate_stock_score(financial, technical)
        
        if score >= 8:
            rating = "Strong Buy"
            price_target = current_price * 1.20
            recommendation = "Strong growth potential with solid fundamentals"
        elif score >= 6:
            rating = "Buy"
            price_target = current_price * 1.10
            recommendation = "Good investment opportunity with moderate upside"
        elif score >= 4:
            rating = "Hold"
            price_target = current_price * 1.02
            recommendation = "Maintain current position, monitor for changes"
        elif score >= 2:
            rating = "Sell"
            price_target = current_price * 0.90
            recommendation = "Consider reducing position due to concerns"
        else:
            rating = "Strong Sell"
            price_target = current_price * 0.80
            recommendation = "Exit position due to significant risks"
        
        return rating, price_target, recommendation