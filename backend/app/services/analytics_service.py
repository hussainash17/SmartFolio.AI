"""
Analytics service module.

This module provides portfolio analytics, performance calculations,
and risk metrics with proper mathematical foundations.
"""

from typing import Dict, List, Optional, Tuple, Any
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal
from sqlmodel import Session, select, func
import math
import logging
from dataclasses import dataclass

from app.services.base import BaseService, ServiceException
from app.model.portfolio import Portfolio, PortfolioPosition
from app.model.trade import Trade
from app.model.stock import StockCompany, StockData, DailyOHLC
from app.model.user import User

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetrics:
    """Data class for portfolio performance metrics."""
    current_value: float
    total_investment: float
    absolute_return: float
    absolute_return_percent: float
    annualized_return: float
    cagr: float
    volatility: float
    sharpe_ratio: float
    max_drawdown: float
    total_trades: int
    period_days: int


@dataclass
class AllocationBreakdown:
    """Data class for portfolio allocation analysis."""
    stock_wise: List[Dict[str, Any]]
    sector_wise: List[Dict[str, Any]]
    concentration_risk: Dict[str, float]


@dataclass
class BenchmarkComparison:
    """Data class for benchmark comparison results."""
    portfolio_return: float
    benchmark_return: float
    alpha: float
    beta: float
    information_ratio: float
    tracking_error: float
    outperformance: bool


class AnalyticsService:
    """Service for portfolio analytics and performance calculations."""
    
    def __init__(self, session: Optional[Session] = None):
        self._session = session
    
    @property
    def session(self) -> Session:
        """Get or create a database session."""
        if self._session is None:
            from app.core.db import get_session
            self._session = next(get_session())
        return self._session
    
    def verify_portfolio_ownership(self, portfolio_id: UUID, user_id: UUID) -> Portfolio:
        """
        Verify that a portfolio belongs to a user.
        
        Args:
            portfolio_id: Portfolio UUID
            user_id: User UUID
            
        Returns:
            Portfolio if found and owned by user
            
        Raises:
            ServiceException: If portfolio not found or not owned by user
        """
        portfolio = self.session.exec(
            select(Portfolio).where(
                Portfolio.id == portfolio_id,
                Portfolio.user_id == user_id
            )
        ).first()
        
        if not portfolio:
            raise ServiceException("Portfolio not found", status_code=404)
        
        return portfolio
    
    def get_portfolio_performance(
        self, 
        portfolio_id: UUID, 
        user_id: UUID,
        period: str = "1Y"
    ) -> PerformanceMetrics:
        """
        Calculate comprehensive portfolio performance metrics.
        
        Args:
            portfolio_id: Portfolio UUID
            user_id: User UUID for ownership verification
            period: Time period (1D, 1W, 1M, 3M, 6M, 1Y, 2Y, 5Y, ALL)
            
        Returns:
            Performance metrics
        """
        # Verify ownership
        portfolio = self.verify_portfolio_ownership(portfolio_id, user_id)
        
        # Calculate date range
        end_date = datetime.utcnow()
        period_map = {
            "1D": timedelta(days=1),
            "1W": timedelta(weeks=1),
            "1M": timedelta(days=30),
            "3M": timedelta(days=90),
            "6M": timedelta(days=180),
            "1Y": timedelta(days=365),
            "2Y": timedelta(days=730),
            "5Y": timedelta(days=1825),
            "ALL": timedelta(days=3650)
        }
        
        start_date = end_date - period_map.get(period, timedelta(days=365))
        period_days = (end_date - start_date).days
        
        # Get portfolio positions
        positions = self.session.exec(
            select(PortfolioPosition).where(PortfolioPosition.portfolio_id == portfolio_id)
        ).all()
        
        # Get trades in the period
        trades = self.session.exec(
            select(Trade).where(
                Trade.portfolio_id == portfolio_id,
                Trade.executed_at >= start_date,
                Trade.executed_at <= end_date
            ).order_by(Trade.executed_at)
        ).all()
        
        # Calculate basic metrics
        current_value = sum(float(pos.current_value) for pos in positions)
        total_investment = sum(float(pos.total_investment) for pos in positions)
        absolute_return = current_value - total_investment
        absolute_return_percent = (absolute_return / total_investment * 100) if total_investment > 0 else 0
        
        # Calculate annualized return
        if period_days > 0 and total_investment > 0:
            annualized_return = ((current_value / total_investment) ** (365 / period_days) - 1) * 100
        else:
            annualized_return = 0
        
        # Calculate CAGR
        years = period_days / 365.25
        if years > 0 and total_investment > 0 and current_value > 0:
            cagr = ((current_value / total_investment) ** (1 / years) - 1) * 100
        else:
            cagr = 0
        
        # Calculate volatility
        volatility = self._calculate_volatility(trades)
        
        # Calculate Sharpe ratio
        risk_free_rate = 2.0  # Assume 2% risk-free rate
        sharpe_ratio = (annualized_return - risk_free_rate) / volatility if volatility > 0 else 0
        
        # Calculate maximum drawdown
        max_drawdown = self._calculate_max_drawdown(trades)
        
        return PerformanceMetrics(
            current_value=current_value,
            total_investment=total_investment,
            absolute_return=absolute_return,
            absolute_return_percent=round(absolute_return_percent, 2),
            annualized_return=round(annualized_return, 2),
            cagr=round(cagr, 2),
            volatility=round(volatility, 2),
            sharpe_ratio=round(sharpe_ratio, 2),
            max_drawdown=round(max_drawdown, 2),
            total_trades=len(trades),
            period_days=period_days
        )
    
    def get_portfolio_allocation(self, portfolio_id: UUID, user_id: UUID) -> AllocationBreakdown:
        """
        Get portfolio allocation breakdown by stock and sector.
        
        Args:
            portfolio_id: Portfolio UUID
            user_id: User UUID for ownership verification
            
        Returns:
            Allocation breakdown
        """
        # Verify ownership
        portfolio = self.verify_portfolio_ownership(portfolio_id, user_id)
        
        # Get positions with stock information
        positions_query = self.session.exec(
            select(PortfolioPosition, StockCompany)
            .join(StockCompany, PortfolioPosition.stock_id == StockCompany.id)
            .where(PortfolioPosition.portfolio_id == portfolio_id)
        ).all()
        
        total_value = sum(float(pos.current_value) for pos, _ in positions_query)
        
        if total_value == 0:
            return AllocationBreakdown(
                stock_wise=[],
                sector_wise=[],
                concentration_risk={"top_5_holdings": 0, "top_10_holdings": 0, "largest_holding": 0}
            )
        
        # Stock-wise allocation
        stock_allocations = []
        for position, stock in positions_query:
            allocation_percent = float(position.current_value) / total_value * 100
            stock_allocations.append({
                "stock_id": str(stock.id),
                "symbol": stock.symbol,
                "name": stock.name,
                "sector": stock.sector,
                "current_value": float(position.current_value),
                "allocation_percent": round(allocation_percent, 2),
                "quantity": position.quantity,
                "unrealized_pnl": float(position.unrealized_pnl),
                "unrealized_pnl_percent": float(position.unrealized_pnl_percent)
            })
        
        # Sort by allocation percentage
        stock_allocations.sort(key=lambda x: x["allocation_percent"], reverse=True)
        
        # Sector-wise allocation
        sector_allocations = self._calculate_sector_allocation(stock_allocations, total_value)
        
        # Concentration risk analysis
        concentration_risk = self._calculate_concentration_risk(stock_allocations)
        
        return AllocationBreakdown(
            stock_wise=stock_allocations,
            sector_wise=sector_allocations,
            concentration_risk=concentration_risk
        )
    
    def compare_with_benchmark(
        self,
        portfolio_id: UUID,
        user_id: UUID,
        benchmark_symbol: str = "SPY",
        period: str = "1Y"
    ) -> BenchmarkComparison:
        """
        Compare portfolio performance with a benchmark.
        
        Args:
            portfolio_id: Portfolio UUID
            user_id: User UUID for ownership verification
            benchmark_symbol: Benchmark symbol
            period: Time period for comparison
            
        Returns:
            Benchmark comparison results
        """
        # Get portfolio performance
        portfolio_metrics = self.get_portfolio_performance(portfolio_id, user_id, period)
        
        # Get benchmark performance (mock data for now)
        benchmark_return = self._get_benchmark_return(benchmark_symbol, period)
        
        # Calculate alpha and beta
        alpha = portfolio_metrics.annualized_return - benchmark_return
        beta = self._calculate_beta(portfolio_metrics.volatility)
        
        # Calculate information ratio
        tracking_error = abs(portfolio_metrics.annualized_return - benchmark_return)
        information_ratio = alpha / tracking_error if tracking_error > 0 else 0
        
        return BenchmarkComparison(
            portfolio_return=portfolio_metrics.annualized_return,
            benchmark_return=benchmark_return,
            alpha=round(alpha, 2),
            beta=round(beta, 2),
            information_ratio=round(information_ratio, 2),
            tracking_error=round(tracking_error, 2),
            outperformance=portfolio_metrics.annualized_return > benchmark_return
        )
    
    def get_dividend_analysis(self, portfolio_id: UUID, user_id: UUID) -> Dict[str, Any]:
        """
        Analyze dividend income from portfolio holdings.
        
        Args:
            portfolio_id: Portfolio UUID
            user_id: User UUID for ownership verification
            
        Returns:
            Dividend analysis data
        """
        # Verify ownership
        portfolio = self.verify_portfolio_ownership(portfolio_id, user_id)
        
        # Get positions with stock information
        positions_query = self.session.exec(
            select(PortfolioPosition, StockCompany)
            .join(StockCompany, PortfolioPosition.stock_id == StockCompany.id)
            .where(PortfolioPosition.portfolio_id == portfolio_id)
        ).all()
        
        total_portfolio_value = sum(float(pos.current_value) for pos, _ in positions_query)
        
        dividend_stocks = []
        total_annual_dividends = 0
        
        for position, stock in positions_query:
            # Mock dividend yield (in production, fetch from financial data API)
            dividend_yield = self._get_mock_dividend_yield(stock.sector)
            annual_dividend = float(position.current_value) * (dividend_yield / 100)
            total_annual_dividends += annual_dividend
            
            if dividend_yield > 0:
                dividend_stocks.append({
                    "stock_id": str(stock.id),
                    "symbol": stock.symbol,
                    "name": stock.name,
                    "sector": stock.sector,
                    "position_value": float(position.current_value),
                    "dividend_yield": dividend_yield,
                    "annual_dividend": round(annual_dividend, 2),
                    "quarterly_dividend": round(annual_dividend / 4, 2),
                    "quantity": position.quantity
                })
        
        portfolio_dividend_yield = (total_annual_dividends / total_portfolio_value * 100) if total_portfolio_value > 0 else 0
        
        return {
            "portfolio_id": str(portfolio_id),
            "total_portfolio_value": total_portfolio_value,
            "total_annual_dividends": round(total_annual_dividends, 2),
            "portfolio_dividend_yield": round(portfolio_dividend_yield, 2),
            "quarterly_income": round(total_annual_dividends / 4, 2),
            "monthly_income": round(total_annual_dividends / 12, 2),
            "dividend_stocks": dividend_stocks,
            "dividend_growth_estimate": 3.5  # Mock growth estimate
        }
    
    def get_cost_basis_analysis(self, portfolio_id: UUID, user_id: UUID) -> Dict[str, Any]:
        """
        Analyze cost basis and tax implications.
        
        Args:
            portfolio_id: Portfolio UUID
            user_id: User UUID for ownership verification
            
        Returns:
            Cost basis analysis data
        """
        # Verify ownership
        portfolio = self.verify_portfolio_ownership(portfolio_id, user_id)
        
        # Get all trades for cost basis calculation
        trades = self.session.exec(
            select(Trade, StockCompany)
            .join(StockCompany, Trade.stock_id == StockCompany.id)
            .where(Trade.portfolio_id == portfolio_id)
            .order_by(Trade.executed_at)
        ).all()
        
        # Get current positions
        positions = self.session.exec(
            select(PortfolioPosition, StockCompany)
            .join(StockCompany, PortfolioPosition.stock_id == StockCompany.id)
            .where(PortfolioPosition.portfolio_id == portfolio_id)
        ).all()
        
        # Calculate cost basis analysis
        stock_analysis = self._calculate_cost_basis(trades, positions)
        
        # Calculate tax implications
        tax_analysis = self._calculate_tax_implications(stock_analysis)
        
        return {
            "portfolio_id": str(portfolio_id),
            "total_cost_basis": tax_analysis["total_cost_basis"],
            "total_current_value": tax_analysis["total_current_value"],
            "total_unrealized_gains": tax_analysis["total_unrealized_gains"],
            "total_realized_gains": tax_analysis["total_realized_gains"],
            "stock_analysis": stock_analysis,
            "tax_loss_opportunities": tax_analysis["tax_loss_opportunities"],
            "estimated_tax_liability": tax_analysis["estimated_tax_liability"]
        }
    
    def _calculate_volatility(self, trades: List[Trade]) -> float:
        """Calculate portfolio volatility from trade history."""
        if len(trades) < 2:
            return 0
        
        daily_returns = []
        for i in range(1, len(trades)):
            prev_value = float(trades[i-1].total_amount)
            curr_value = float(trades[i].total_amount)
            if prev_value > 0:
                daily_return = (curr_value - prev_value) / prev_value
                daily_returns.append(daily_return)
        
        if len(daily_returns) < 2:
            return 0
        
        mean_return = sum(daily_returns) / len(daily_returns)
        variance = sum((r - mean_return) ** 2 for r in daily_returns) / (len(daily_returns) - 1)
        volatility = math.sqrt(variance) * math.sqrt(252) * 100  # Annualized volatility
        
        return volatility
    
    def _calculate_max_drawdown(self, trades: List[Trade]) -> float:
        """Calculate maximum drawdown from trade history."""
        if not trades:
            return 0
        
        max_drawdown = 0
        peak_value = 0
        
        for trade in trades:
            trade_value = float(trade.total_amount)
            if trade_value > peak_value:
                peak_value = trade_value
            else:
                drawdown = (peak_value - trade_value) / peak_value * 100 if peak_value > 0 else 0
                max_drawdown = max(max_drawdown, drawdown)
        
        return max_drawdown
    
    def _calculate_sector_allocation(self, stock_allocations: List[Dict], total_value: float) -> List[Dict]:
        """Calculate sector-wise allocation from stock allocations."""
        sector_map = {}
        
        for allocation in stock_allocations:
            sector = allocation["sector"] or "Unknown"
            if sector not in sector_map:
                sector_map[sector] = {"value": 0, "stocks": []}
            sector_map[sector]["value"] += allocation["current_value"]
            sector_map[sector]["stocks"].append(allocation["symbol"])
        
        sector_allocations = []
        for sector, data in sector_map.items():
            sector_allocations.append({
                "sector": sector,
                "value": data["value"],
                "allocation_percent": round(data["value"] / total_value * 100, 2),
                "stock_count": len(data["stocks"]),
                "stocks": data["stocks"]
            })
        
        sector_allocations.sort(key=lambda x: x["allocation_percent"], reverse=True)
        return sector_allocations
    
    def _calculate_concentration_risk(self, stock_allocations: List[Dict]) -> Dict[str, float]:
        """Calculate concentration risk metrics."""
        if not stock_allocations:
            return {"top_5_holdings": 0, "top_10_holdings": 0, "largest_holding": 0}
        
        top_5_percent = sum(stock["allocation_percent"] for stock in stock_allocations[:5])
        top_10_percent = sum(stock["allocation_percent"] for stock in stock_allocations[:10])
        largest_holding = stock_allocations[0]["allocation_percent"]
        
        return {
            "top_5_holdings": round(top_5_percent, 2),
            "top_10_holdings": round(top_10_percent, 2),
            "largest_holding": round(largest_holding, 2)
        }
    
    def _get_benchmark_return(self, benchmark_symbol: str, period: str) -> float:
        """Get benchmark return for the specified period (mock data)."""
        benchmark_data = {
            "SPY": {"1M": 2.1, "3M": 5.8, "6M": 12.3, "1Y": 15.7, "2Y": 8.9, "5Y": 11.2},
            "QQQ": {"1M": 3.2, "3M": 8.1, "6M": 18.9, "1Y": 22.4, "2Y": 12.8, "5Y": 16.8},
            "IWM": {"1M": 1.8, "3M": 4.2, "6M": 9.7, "1Y": 12.3, "2Y": 6.8, "5Y": 8.9}
        }
        
        return benchmark_data.get(benchmark_symbol, {}).get(period, 10.0)
    
    def _calculate_beta(self, portfolio_volatility: float) -> float:
        """Calculate portfolio beta (simplified calculation)."""
        # Simplified beta calculation - in production, use correlation with market
        market_volatility = 15.0  # Assume market volatility of 15%
        return portfolio_volatility / market_volatility if market_volatility > 0 else 1.0
    
    def _get_mock_dividend_yield(self, sector: Optional[str]) -> float:
        """Get mock dividend yield based on sector."""
        sector_yields = {
            "Utilities": 4.5,
            "REIT": 5.2,
            "Consumer Staples": 3.1,
            "Energy": 3.8,
            "Financials": 2.9,
            "Healthcare": 2.2,
            "Technology": 1.4,
            "Consumer Discretionary": 1.8
        }
        
        return sector_yields.get(sector, 2.0)
    
    def _calculate_cost_basis(
        self, 
        trades: List[Tuple[Trade, StockCompany]], 
        positions: List[Tuple[PortfolioPosition, StockCompany]]
    ) -> Dict[str, Any]:
        """Calculate detailed cost basis analysis."""
        stock_analysis = {}
        
        # Initialize with current positions
        for position, stock in positions:
            stock_id = str(stock.id)
            stock_analysis[stock_id] = {
                "symbol": stock.symbol,
                "name": stock.name,
                "current_quantity": position.quantity,
                "average_cost": float(position.average_price),
                "total_cost": float(position.total_investment),
                "current_value": float(position.current_value),
                "unrealized_pnl": float(position.unrealized_pnl),
                "unrealized_pnl_percent": float(position.unrealized_pnl_percent),
                "lots": [],
                "short_term_gains": 0,
                "long_term_gains": 0
            }
        
        # Add trade lots
        for trade, stock in trades:
            stock_id = str(stock.id)
            if stock_id in stock_analysis:
                days_held = (datetime.utcnow() - trade.executed_at).days
                is_long_term = days_held > 365
                
                lot_info = {
                    "trade_id": str(trade.id),
                    "date": trade.executed_at,
                    "quantity": trade.quantity,
                    "price": float(trade.price),
                    "total_cost": float(trade.total_amount),
                    "days_held": days_held,
                    "is_long_term": is_long_term,
                    "trade_type": trade.trade_type
                }
                
                stock_analysis[stock_id]["lots"].append(lot_info)
        
        return stock_analysis
    
    def _calculate_tax_implications(self, stock_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate tax implications from cost basis analysis."""
        total_cost_basis = sum(analysis["total_cost"] for analysis in stock_analysis.values())
        total_current_value = sum(analysis["current_value"] for analysis in stock_analysis.values())
        total_unrealized_gains = sum(analysis["unrealized_pnl"] for analysis in stock_analysis.values())
        total_realized_gains = 0  # Would be calculated from closed positions
        
        # Tax loss harvesting opportunities
        tax_loss_opportunities = []
        for stock_id, analysis in stock_analysis.items():
            if analysis["unrealized_pnl"] < -1000:  # Loss > $1000
                tax_loss_opportunities.append({
                    "symbol": analysis["symbol"],
                    "unrealized_loss": analysis["unrealized_pnl"],
                    "current_value": analysis["current_value"],
                    "tax_savings_estimate": abs(analysis["unrealized_pnl"]) * 0.25  # 25% tax rate assumption
                })
        
        estimated_tax_liability = max(0, total_unrealized_gains) * 0.20  # 20% capital gains tax assumption
        
        return {
            "total_cost_basis": total_cost_basis,
            "total_current_value": total_current_value,
            "total_unrealized_gains": round(total_unrealized_gains, 2),
            "total_realized_gains": round(total_realized_gains, 2),
            "tax_loss_opportunities": tax_loss_opportunities,
            "estimated_tax_liability": round(estimated_tax_liability, 2)
        }