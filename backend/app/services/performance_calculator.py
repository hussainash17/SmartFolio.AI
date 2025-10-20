"""
Portfolio Performance Calculator Service

This module provides core performance calculation functions adapted to the TradeSmart database schema.
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
import numpy as np
import pandas as pd
from scipy.optimize import newton
from sqlmodel import Session, select, and_, func

from app.model.portfolio import Portfolio, PortfolioPosition
from app.model.trade import Trade
from app.model.stock import DailyOHLC
from app.model.company import Company
from app.model.performance import (
    PortfolioDailyValuation,
    BenchmarkData,
    Benchmark,
)


class PerformanceCalculator:
    """Core performance calculation service"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ============================================================================
    # CORE RETURN CALCULATIONS
    # ============================================================================
    
    def calculate_time_weighted_return(
        self,
        portfolio_id: str,
        start_date: date,
        end_date: date
    ) -> float:
        """
        Calculate Time-Weighted Return (TWR) using Modified Dietz method.
        
        TWR neutralizes the impact of external cash flows, making it ideal
        for comparing portfolio managers' performance.
        """
        valuations = self._get_daily_valuations(portfolio_id, start_date, end_date)
        cash_flows = self._get_cash_flows_by_date(portfolio_id, start_date, end_date)
        
        if len(valuations) < 2:
            return 0.0
        
        # Calculate sub-period returns
        sub_returns = []
        for i in range(len(valuations) - 1):
            begin_value = float(valuations[i]['value'])
            end_value = float(valuations[i + 1]['value'])
            period_cf = cash_flows.get(valuations[i + 1]['date'], 0.0)
            
            # Modified Dietz formula for sub-period
            # Weight = 0.5 (assumes cash flow occurs mid-period)
            weight = 0.5
            denominator = begin_value + (weight * period_cf)
            
            if denominator > 0:
                sub_return = (end_value - begin_value - period_cf) / denominator
                sub_returns.append(sub_return)
        
        # Chain-link the sub-period returns
        if not sub_returns:
            return 0.0
        
        twr = np.prod([1 + r for r in sub_returns]) - 1
        return float(twr)
    
    def calculate_money_weighted_return(
        self,
        portfolio_id: str,
        start_date: date,
        end_date: date
    ) -> float:
        """
        Calculate Money-Weighted Return (Internal Rate of Return - IRR).
        
        MWR accounts for the timing and size of cash flows, representing
        the actual investor experience.
        """
        cash_flows = self._get_all_cash_flows(portfolio_id, start_date, end_date)
        initial_value = self._get_portfolio_value_on_date(portfolio_id, start_date)
        final_value = self._get_portfolio_value_on_date(portfolio_id, end_date)
        
        if not cash_flows and initial_value == 0:
            return 0.0
        
        # Add initial investment as negative cash flow
        all_flows = [{'date': start_date, 'amount': -initial_value}]
        all_flows.extend(cash_flows)
        all_flows.append({'date': end_date, 'amount': final_value})
        
        def npv_function(rate):
            """Calculate NPV for given rate"""
            npv = 0
            for cf in all_flows:
                days_diff = (cf['date'] - start_date).days
                years = days_diff / 365.25
                npv += cf['amount'] / ((1 + rate) ** years)
            return npv
        
        try:
            # Use Newton's method to solve for IRR
            irr = newton(npv_function, 0.1, maxiter=100)
            return float(irr)
        except (RuntimeError, ValueError):
            # If Newton's method fails, return simple return
            if initial_value > 0:
                return (final_value - initial_value) / initial_value
            return 0.0
    
    def calculate_cumulative_returns(
        self,
        portfolio_id: str,
        start_date: date,
        end_date: date,
        frequency: str = 'daily'
    ) -> List[Dict]:
        """
        Calculate cumulative returns over time.
        """
        valuations = self._get_daily_valuations(portfolio_id, start_date, end_date)
        
        if not valuations:
            return []
        
        results = []
        initial_value = float(valuations[0]['value'])
        prev_value = initial_value
        
        for i, val in enumerate(valuations):
            current_value = float(val['value'])
            
            # Daily return
            if i == 0:
                daily_return = 0.0
            else:
                daily_return = (current_value - prev_value) / prev_value * 100 if prev_value > 0 else 0.0
            
            # Cumulative return
            cumulative_return = (current_value - initial_value) / initial_value * 100 if initial_value > 0 else 0.0
            
            results.append({
                'date': val['date'].isoformat() if isinstance(val['date'], date) else val['date'],
                'value': current_value,
                'daily_return': daily_return,
                'cumulative_return': cumulative_return
            })
            
            prev_value = current_value
        
        # Resample if needed
        if frequency != 'daily':
            results = self._resample_returns(results, frequency)
        
        return results
    
    def annualize_return(self, total_return: float, days: int) -> float:
        """
        Convert total return to annualized return.
        """
        if days <= 0:
            return 0.0
        return ((1 + total_return) ** (365.25 / days)) - 1
    
    # ============================================================================
    # RISK METRICS
    # ============================================================================
    
    def calculate_volatility(
        self,
        returns: List[float],
        annualize: bool = True
    ) -> float:
        """Calculate volatility (standard deviation of returns)."""
        if len(returns) < 2:
            return 0.0
        
        returns_array = np.array(returns)
        volatility = np.std(returns_array, ddof=1)
        
        if annualize:
            # Assuming daily returns, annualize with sqrt(252) for trading days
            volatility = volatility * np.sqrt(252)
        
        return float(volatility)
    
    def calculate_sharpe_ratio(
        self,
        portfolio_return: float,
        volatility: float,
        risk_free_rate: float = 0.05
    ) -> float:
        """Calculate Sharpe Ratio."""
        if volatility == 0:
            return 0.0
        
        return (portfolio_return - risk_free_rate) / volatility
    
    def calculate_sortino_ratio(
        self,
        portfolio_return: float,
        returns: List[float],
        risk_free_rate: float = 0.05
    ) -> float:
        """Calculate Sortino Ratio."""
        downside_returns = [r for r in returns if r < 0]
        
        if len(downside_returns) < 2:
            return 0.0
        
        downside_deviation = np.std(downside_returns, ddof=1) * np.sqrt(252)
        
        if downside_deviation == 0:
            return 0.0
        
        return (portfolio_return - risk_free_rate) / downside_deviation
    
    def calculate_max_drawdown(
        self,
        valuations: List[Dict]
    ) -> Dict:
        """Calculate maximum drawdown."""
        if len(valuations) < 2:
            return {
                'max_drawdown_percent': 0.0,
                'max_drawdown_amount': 0.0,
                'start_date': None,
                'end_date': None,
                'recovery_date': None,
                'days_to_recover': None
            }
        
        values = [float(v['value']) for v in valuations]
        dates = [v['date'] if isinstance(v['date'], date) else datetime.fromisoformat(v['date']).date() for v in valuations]
        
        # Calculate running maximum
        running_max = np.maximum.accumulate(values)
        
        # Calculate drawdown at each point
        drawdowns = (values - running_max) / running_max
        
        # Find maximum drawdown
        max_dd_idx = np.argmin(drawdowns)
        max_dd_percent = drawdowns[max_dd_idx]
        
        # Find the peak before max drawdown
        peak_idx = np.argmax(values[:max_dd_idx + 1]) if max_dd_idx > 0 else 0
        
        # Find recovery date (if recovered)
        recovery_idx = None
        peak_value = values[peak_idx]
        for i in range(max_dd_idx + 1, len(values)):
            if values[i] >= peak_value:
                recovery_idx = i
                break
        
        return {
            'max_drawdown_percent': float(max_dd_percent * 100),
            'max_drawdown_amount': float(values[max_dd_idx] - values[peak_idx]),
            'start_date': dates[peak_idx].isoformat(),
            'end_date': dates[max_dd_idx].isoformat(),
            'recovery_date': dates[recovery_idx].isoformat() if recovery_idx else None,
            'days_to_recover': (dates[recovery_idx] - dates[max_dd_idx]).days if recovery_idx else None
        }
    
    def calculate_beta(
        self,
        portfolio_returns: List[float],
        benchmark_returns: List[float]
    ) -> float:
        """Calculate portfolio beta relative to benchmark."""
        if len(portfolio_returns) != len(benchmark_returns) or len(portfolio_returns) < 2:
            return 1.0
        
        portfolio_array = np.array(portfolio_returns)
        benchmark_array = np.array(benchmark_returns)
        
        covariance = np.cov(portfolio_array, benchmark_array)[0, 1]
        benchmark_variance = np.var(benchmark_array, ddof=1)
        
        if benchmark_variance == 0:
            return 1.0
        
        beta = covariance / benchmark_variance
        return float(beta)
    
    def calculate_alpha(
        self,
        portfolio_return: float,
        benchmark_return: float,
        beta: float,
        risk_free_rate: float = 0.05
    ) -> float:
        """Calculate Jensen's Alpha."""
        expected_return = risk_free_rate + beta * (benchmark_return - risk_free_rate)
        alpha = portfolio_return - expected_return
        return float(alpha)
    
    # ============================================================================
    # ATTRIBUTION ANALYSIS
    # ============================================================================
    
    def calculate_security_contribution(
        self,
        portfolio_id: str,
        start_date: date,
        end_date: date
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        Calculate individual security contribution to portfolio return.
        
        Returns tuple of (contributors, detractors)
        """
        # Get portfolio positions at start date
        holdings = self._get_holdings_on_date(portfolio_id, start_date)
        
        # Calculate return for each security
        contributions = []
        
        for holding in holdings:
            symbol = holding['symbol']
            weight = holding['weight']
            
            # Get start and end prices
            start_price = self._get_stock_price(holding['company_id'], start_date)
            end_price = self._get_stock_price(holding['company_id'], end_date)
            
            if start_price and end_price and start_price > 0:
                security_return = (end_price - start_price) / start_price
                contribution = weight * security_return
                
                contributions.append({
                    'symbol': symbol,
                    'name': holding['name'],
                    'sector': holding.get('sector', 'Unknown'),
                    'weight': weight * 100,  # Convert to percentage
                    'return': security_return * 100,
                    'contribution': contribution * 100,
                    'beginning_value': holding['value'],
                    'ending_value': holding['value'] * (1 + security_return),
                    'gain_loss': holding['value'] * security_return
                })
        
        # Sort by contribution
        contributions.sort(key=lambda x: x['contribution'], reverse=True)
        
        # Split into contributors and detractors
        contributors = [c for c in contributions if c['contribution'] > 0]
        detractors = [c for c in contributions if c['contribution'] < 0]
        
        return contributors[:10], detractors[:5]  # Top 10 contributors, top 5 detractors
    
    # ============================================================================
    # HELPER METHODS
    # ============================================================================
    
    def _get_daily_valuations(
        self,
        portfolio_id: str,
        start_date: date,
        end_date: date
    ) -> List[Dict]:
        """Get daily portfolio valuations from database."""
        # Try to get from portfolio_daily_valuations table first
        statement = select(PortfolioDailyValuation).where(
            and_(
                PortfolioDailyValuation.portfolio_id == portfolio_id,
                PortfolioDailyValuation.valuation_date >= start_date,
                PortfolioDailyValuation.valuation_date <= end_date
            )
        ).order_by(PortfolioDailyValuation.valuation_date)
        
        valuations = self.db.exec(statement).all()
        
        if valuations:
            return [
                {
                    'date': v.valuation_date,
                    'value': float(v.total_value),
                    'daily_return': float(v.daily_return) if v.daily_return else 0.0
                }
                for v in valuations
            ]
        
        # If no cached valuations, calculate on-the-fly for the date range
        # This is slower but works as fallback
        current_date = start_date
        result = []
        while current_date <= end_date:
            value = self._get_portfolio_value_on_date(portfolio_id, current_date)
            result.append({
                'date': current_date,
                'value': value,
                'daily_return': 0.0
            })
            current_date += timedelta(days=1)
        
        # Calculate daily returns
        for i in range(1, len(result)):
            if result[i-1]['value'] > 0:
                result[i]['daily_return'] = (result[i]['value'] - result[i-1]['value']) / result[i-1]['value']
        
        return result
    
    def _get_cash_flows_by_date(
        self,
        portfolio_id: str,
        start_date: date,
        end_date: date
    ) -> Dict[date, float]:
        """Get cash flows grouped by date."""
        # Query trades that represent cash flows (deposits/withdrawals)
        statement = select(Trade).where(
            and_(
                Trade.portfolio_id == portfolio_id,
                Trade.trade_date >= datetime.combine(start_date, datetime.min.time()),
                Trade.trade_date <= datetime.combine(end_date, datetime.max.time())
            )
        )
        
        trades = self.db.exec(statement).all()
        
        cash_flows = {}
        for trade in trades:
            trade_date = trade.trade_date.date()
            if trade_date not in cash_flows:
                cash_flows[trade_date] = 0.0
            
            # BUY is negative cash flow (money out), SELL is positive (money in)
            if trade.trade_type.upper() == 'BUY':
                cash_flows[trade_date] -= float(trade.net_amount)
            elif trade.trade_type.upper() == 'SELL':
                cash_flows[trade_date] += float(trade.net_amount)
        
        return cash_flows
    
    def _get_all_cash_flows(
        self,
        portfolio_id: str,
        start_date: date,
        end_date: date
    ) -> List[Dict]:
        """Get all cash flows with dates."""
        cash_flows_dict = self._get_cash_flows_by_date(portfolio_id, start_date, end_date)
        return [{'date': d, 'amount': amt} for d, amt in cash_flows_dict.items()]
    
    def _get_portfolio_value_on_date(
        self,
        portfolio_id: str,
        target_date: date
    ) -> float:
        """Calculate portfolio total value on a specific date."""
        # Get portfolio
        portfolio = self.db.get(Portfolio, portfolio_id)
        if not portfolio:
            return 0.0
        
        # Get all positions for this portfolio
        statement = select(PortfolioPosition).where(
            PortfolioPosition.portfolio_id == portfolio_id
        )
        positions = self.db.exec(statement).all()
        
        total_value = 0.0
        for position in positions:
            if position.quantity > 0:
                # Get stock price on target_date
                price = self._get_stock_price(position.stock_id, target_date)
                if price:
                    total_value += position.quantity * price
        
        # Add cash balance
        if portfolio.cash_balance:
            total_value += float(portfolio.cash_balance)
        
        return total_value
    
    def _get_holdings_on_date(
        self,
        portfolio_id: str,
        target_date: date
    ) -> List[Dict]:
        """Get portfolio holdings on a specific date."""
        # Get portfolio total value
        total_value = self._get_portfolio_value_on_date(portfolio_id, target_date)
        
        # Get positions
        statement = select(PortfolioPosition).where(
            PortfolioPosition.portfolio_id == portfolio_id
        )
        positions = self.db.exec(statement).all()
        
        holdings = []
        for position in positions:
            if position.quantity > 0:
                # Get company info
                company = self.db.get(Company, position.stock_id)
                if not company:
                    continue
                
                # Get stock price
                price = self._get_stock_price(position.stock_id, target_date)
                if not price:
                    continue
                
                position_value = position.quantity * price
                weight = position_value / total_value if total_value > 0 else 0.0
                
                holdings.append({
                    'symbol': company.trading_code,
                    'name': company.name,
                    'sector': company.sector or 'Unknown',
                    'company_id': str(position.stock_id),
                    'quantity': position.quantity,
                    'price': price,
                    'value': position_value,
                    'weight': weight
                })
        
        return holdings
    
    def _get_stock_price(
        self,
        company_id: str,
        target_date: date
    ) -> Optional[float]:
        """Get stock price on a specific date."""
        # Query DailyOHLC for the closest date <= target_date
        statement = select(DailyOHLC).where(
            and_(
                DailyOHLC.company_id == company_id,
                func.date(DailyOHLC.date) <= target_date
            )
        ).order_by(DailyOHLC.date.desc()).limit(1)
        
        ohlc = self.db.exec(statement).first()
        
        if ohlc:
            return float(ohlc.close_price)
        
        return None
    
    def _resample_returns(
        self,
        daily_data: List[Dict],
        frequency: str
    ) -> List[Dict]:
        """Resample daily data to weekly or monthly."""
        if frequency == 'daily' or not daily_data:
            return daily_data
        
        df = pd.DataFrame(daily_data)
        # Filter out invalid dates (before pandas datetime range)
        # Pandas can handle dates from 1677-09-21 to 2262-04-11
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df = df.dropna(subset=['date'])
        
        if df.empty:
            return []
        
        df.set_index('date', inplace=True)
        
        if frequency == 'weekly':
            resampled = df.resample('W').last()
        elif frequency == 'monthly':
            resampled = df.resample('M').last()
        else:
            return daily_data
        
        # Drop rows with NaN values
        resampled = resampled.dropna()
        
        result = resampled.reset_index().to_dict('records')
        # Convert dates back to strings
        for r in result:
            r['date'] = r['date'].date().isoformat()
        
        return result
