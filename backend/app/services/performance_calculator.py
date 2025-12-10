"""
Portfolio Performance Calculator Service

This module provides core performance calculation functions adapted to the TradeSmart database schema.
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
import numpy as np
import pandas as pd
from scipy.optimize import newton, brentq
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
        # Lightweight in-process caches for the lifetime of this instance/request
        self._price_cache: Dict[str, Dict[date, float]] = {}
        self._company_cache: Dict[str, Company] = {}

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
        
        For very short periods or when IRR produces unrealistic results,
        falls back to simple return calculation.
        """
        cash_flows = self._get_all_cash_flows(portfolio_id, start_date, end_date)
        # Use optimized single-date valuations
        initial_value = self._get_portfolio_value_on_date_optimized(portfolio_id, start_date)
        final_value = self._get_portfolio_value_on_date_optimized(portfolio_id, end_date)

        if not cash_flows and initial_value == 0:
            return 0.0

        # Calculate simple return as fallback
        simple_return = (final_value - initial_value) / initial_value if initial_value > 0 else 0.0
        
        # For very short periods (< 30 days) or when cash flows are negligible,
        # use simple return to avoid unrealistic IRR values
        days = (end_date - start_date).days
        total_cash_flow = sum(abs(cf['amount']) for cf in cash_flows)
        cash_flow_ratio = total_cash_flow / initial_value if initial_value > 0 else 0.0
        
        # Use simple return if:
        # 1. Period is very short (< 30 days) AND cash flows are small (< 5% of initial value)
        # 2. No significant cash flows relative to portfolio size
        if days < 30 and cash_flow_ratio < 0.05:
            return simple_return

        # Add initial investment as negative cash flow
        all_flows = [{'date': start_date, 'amount': -initial_value}]
        all_flows.extend(cash_flows)
        all_flows.append({'date': end_date, 'amount': final_value})

        def npv_at(rate):
            """Calculate NPV for given rate with domain guard."""
            # Disallow rates where 1 + rate <= 0 to avoid invalid fractional powers
            if (1 + rate) <= 0:
                return np.inf
            total = 0.0
            for cf in all_flows:
                days_diff = (cf['date'] - start_date).days
                years = days_diff / 365.25
                if not np.isfinite(years):
                    continue
                total += cf['amount'] / ((1 + rate) ** years)
            return total

        try:
            # Prefer a bracketed solver to keep (1 + rate) > 0
            low, high = -0.9999, 10.0
            f_low, f_high = npv_at(low), npv_at(high)
            
            if np.sign(f_low) == np.sign(f_high):
                # Attempt to expand the upper bound to find a sign change
                # while keeping 1 + rate > 0
                bracket_found = False
                for high_bound in [20.0, 50.0, 100.0]:
                    f_high = npv_at(high_bound)
                    if np.sign(f_low) != np.sign(f_high):
                        bracket_found = True
                        high = high_bound
                        break
                
                if not bracket_found:
                    # Try Newton method, but validate the result
                    try:
                        irr = newton(npv_at, 0.1, maxiter=100)
                        # Validate IRR is in reasonable range (-99% to 1000%)
                        if -0.99 <= irr <= 10.0:
                            return float(irr)
                        else:
                            # IRR is unrealistic, use simple return
                            return simple_return
                    except (RuntimeError, ValueError, OverflowError, ZeroDivisionError):
                        return simple_return
            
            # Use bracketed solver
            irr = brentq(npv_at, low, high, maxiter=200)
            
            # Validate IRR is in reasonable range
            if -0.99 <= irr <= 10.0:
                return float(irr)
            else:
                # IRR is unrealistic, use simple return
                return simple_return
                
        except (RuntimeError, ValueError, OverflowError, ZeroDivisionError):
            # If solving fails, return simple return as a fallback
            return simple_return

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

        # Vectorized computation for speed
        values = np.array([float(v['value']) for v in valuations], dtype=float)
        initial_value = values[0] if len(values) > 0 else 0.0

        daily_returns = np.zeros(len(values), dtype=float)
        if len(values) > 1:
            prev = values[:-1]
            prev[prev == 0] = np.nan
            diffs = np.diff(values)
            daily_returns[1:] = np.where(np.isfinite(prev) & (prev > 0), (diffs / prev) * 100.0, 0.0)

        if initial_value > 0:
            cumulative_returns = (values - initial_value) / initial_value * 100.0
        else:
            cumulative_returns = np.zeros(len(values), dtype=float)

        results = [
            {
                'date': v['date'].isoformat() if isinstance(v['date'], date) else v['date'],
                'value': float(values[i]),
                'daily_return': float(daily_returns[i]),
                'cumulative_return': float(cumulative_returns[i]),
            }
            for i, v in enumerate(valuations)
        ]

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
    # MULTI-PORTFOLIO RETURN CALCULATIONS (Client-Level)
    # ============================================================================

    def calculate_aggregated_daily_valuations(
        self,
        portfolio_ids: List[str],
        start_date: date,
        end_date: date
    ) -> List[Dict]:
        """
        Aggregate daily valuations across multiple portfolios.
        
        For each date, sums the portfolio values across all provided portfolios.
        This is used to calculate combined TWR/MWR for a client with multiple portfolios.
        
        Args:
            portfolio_ids: List of portfolio IDs to aggregate
            start_date: Start date for valuations
            end_date: End date for valuations
            
        Returns:
            List of dicts with 'date', 'value', and 'daily_return' keys
        """
        if not portfolio_ids:
            return []
        
        # Get valuations for each portfolio
        all_valuations: Dict[date, float] = {}
        
        for pid in portfolio_ids:
            valuations = self._get_daily_valuations(pid, start_date, end_date)
            for v in valuations:
                val_date = v['date'] if isinstance(v['date'], date) else datetime.fromisoformat(v['date']).date()
                if val_date not in all_valuations:
                    all_valuations[val_date] = 0.0
                all_valuations[val_date] += float(v['value'])
        
        if not all_valuations:
            return []
        
        # Sort by date
        sorted_dates = sorted(all_valuations.keys())
        
        # Build result with daily returns
        results = []
        prev_value = None
        
        for d in sorted_dates:
            value = all_valuations[d]
            daily_return = 0.0
            
            if prev_value is not None and prev_value > 0:
                daily_return = (value - prev_value) / prev_value
            
            results.append({
                'date': d,
                'value': value,
                'daily_return': daily_return
            })
            prev_value = value
        
        return results

    def calculate_combined_twr(
        self,
        portfolio_ids: List[str],
        start_date: date,
        end_date: date
    ) -> float:
        """
        Calculate Time-Weighted Return (TWR) for multiple portfolios combined.
        
        This method:
        1. Aggregates daily values across all portfolios (V_Total = V_A + V_B + ...)
        2. Aggregates cash flows from all portfolios
        3. Calculates subperiod returns on the combined values
        4. Chain-links the returns to get combined TWR
        
        Args:
            portfolio_ids: List of portfolio IDs to combine
            start_date: Start date for calculation
            end_date: End date for calculation
            
        Returns:
            Combined TWR as a decimal (e.g., 0.05 for 5%)
        """
        if not portfolio_ids:
            return 0.0
        
        # Step 1: Get aggregated valuations
        valuations = self.calculate_aggregated_daily_valuations(portfolio_ids, start_date, end_date)
        
        if len(valuations) < 2:
            return 0.0
        
        # Step 2: Get aggregated cash flows from all portfolios
        all_cash_flows: Dict[date, float] = {}
        for pid in portfolio_ids:
            cf = self._get_cash_flows_by_date(pid, start_date, end_date)
            for d, amt in cf.items():
                if d not in all_cash_flows:
                    all_cash_flows[d] = 0.0
                all_cash_flows[d] += amt
        
        # Step 3: Calculate subperiod returns using Modified Dietz
        sub_returns = []
        for i in range(len(valuations) - 1):
            begin_value = float(valuations[i]['value'])
            end_value = float(valuations[i + 1]['value'])
            period_date = valuations[i + 1]['date']
            period_cf = all_cash_flows.get(period_date, 0.0)
            
            # Modified Dietz formula for sub-period
            # Weight = 0.5 (assumes cash flow occurs mid-period)
            weight = 0.5
            denominator = begin_value + (weight * period_cf)
            
            if denominator > 0:
                sub_return = (end_value - begin_value - period_cf) / denominator
                sub_returns.append(sub_return)
        
        # Step 4: Chain-link the sub-period returns
        if not sub_returns:
            return 0.0
        
        twr = np.prod([1 + r for r in sub_returns]) - 1
        return float(twr)

    def calculate_combined_mwr(
        self,
        portfolio_ids: List[str],
        start_date: date,
        end_date: date
    ) -> float:
        """
        Calculate Money-Weighted Return (IRR) for multiple portfolios combined.
        
        This method:
        1. Sums initial and final values across all portfolios
        2. Aggregates all cash flows from all portfolios
        3. Calculates IRR on the combined cash flow stream
        
        Args:
            portfolio_ids: List of portfolio IDs to combine
            start_date: Start date for calculation
            end_date: End date for calculation
            
        Returns:
            Combined MWR as a decimal (e.g., 0.05 for 5%)
        """
        if not portfolio_ids:
            return 0.0
        
        # Step 1: Get combined initial and final values
        total_initial = sum(
            self._get_portfolio_value_on_date_optimized(pid, start_date)
            for pid in portfolio_ids
        )
        total_final = sum(
            self._get_portfolio_value_on_date_optimized(pid, end_date)
            for pid in portfolio_ids
        )
        
        # Step 2: Get all cash flows from all portfolios
        all_cash_flows = []
        for pid in portfolio_ids:
            cf = self._get_all_cash_flows(pid, start_date, end_date)
            all_cash_flows.extend(cf)
        
        if not all_cash_flows and total_initial == 0:
            return 0.0
        
        # Calculate simple return as fallback
        simple_return = (total_final - total_initial) / total_initial if total_initial > 0 else 0.0
        
        # For very short periods or when cash flows are negligible, use simple return
        days = (end_date - start_date).days
        total_cash_flow = sum(abs(cf['amount']) for cf in all_cash_flows)
        cash_flow_ratio = total_cash_flow / total_initial if total_initial > 0 else 0.0
        
        if days < 30 and cash_flow_ratio < 0.05:
            return simple_return
        
        # Step 3: Build cash flow stream for IRR calculation
        all_flows = [{'date': start_date, 'amount': -total_initial}]
        all_flows.extend(all_cash_flows)
        all_flows.append({'date': end_date, 'amount': total_final})
        
        def npv_at(rate):
            """Calculate NPV for given rate with domain guard."""
            if (1 + rate) <= 0:
                return np.inf
            total = 0.0
            for cf in all_flows:
                days_diff = (cf['date'] - start_date).days
                years = days_diff / 365.25
                if not np.isfinite(years):
                    continue
                total += cf['amount'] / ((1 + rate) ** years)
            return total
        
        try:
            # Prefer a bracketed solver to keep (1 + rate) > 0
            low, high = -0.9999, 10.0
            f_low, f_high = npv_at(low), npv_at(high)
            
            if np.sign(f_low) == np.sign(f_high):
                # Attempt to expand the upper bound to find a sign change
                bracket_found = False
                for high_bound in [20.0, 50.0, 100.0]:
                    f_high = npv_at(high_bound)
                    if np.sign(f_low) != np.sign(f_high):
                        bracket_found = True
                        high = high_bound
                        break
                
                if not bracket_found:
                    # Try Newton method, but validate the result
                    try:
                        irr = newton(npv_at, 0.1, maxiter=100)
                        if -0.99 <= irr <= 10.0:
                            return float(irr)
                        else:
                            return simple_return
                    except (RuntimeError, ValueError, OverflowError, ZeroDivisionError):
                        return simple_return
            
            # Use bracketed solver
            irr = brentq(npv_at, low, high, maxiter=200)
            
            if -0.99 <= irr <= 10.0:
                return float(irr)
            else:
                return simple_return
                
        except (RuntimeError, ValueError, OverflowError, ZeroDivisionError):
            return simple_return

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

    def calculate_var(
        self,
        returns: List[float],
        portfolio_value: float,
        confidence: float = 0.95
    ) -> float:
        """
        Calculate Value at Risk (VaR) using historical simulation.

        Args:
            returns: List of daily returns
            portfolio_value: Current portfolio value
            confidence: Confidence level (default 0.95 for 95% VaR)

        Returns:
            VaR as a dollar amount
        """
        if len(returns) < 2:
            return 0.0

        returns_array = np.array(returns)
        # Calculate percentile (e.g., 5th percentile for 95% VaR)
        percentile = (1 - confidence) * 100
        var_return = np.percentile(returns_array, percentile)

        # Convert to dollar amount (negative because VaR is a loss)
        var_amount = abs(var_return) * portfolio_value

        return float(var_amount)

    def calculate_cvar(
        self,
        returns: List[float],
        portfolio_value: float,
        confidence: float = 0.95
    ) -> float:
        """
        Calculate Conditional Value at Risk (CVaR/Expected Shortfall).

        CVaR is the average of losses beyond VaR threshold.
        """
        if len(returns) < 2:
            return 0.0

        returns_array = np.array(returns)
        percentile = (1 - confidence) * 100
        threshold = np.percentile(returns_array, percentile)

        # Get all returns below the threshold
        tail_returns = returns_array[returns_array <= threshold]

        if len(tail_returns) == 0:
            return 0.0

        # Average of tail returns
        cvar_return = np.mean(tail_returns)
        cvar_amount = abs(cvar_return) * portfolio_value

        return float(cvar_amount)

    def calculate_tracking_error(
        self,
        diff_returns: List[float],
        annualize: bool = True
    ) -> float:
        """
        Calculate tracking error: standard deviation of (portfolio return - benchmark return).

        Args:
            diff_returns: List of differences between portfolio and benchmark returns
            annualize: Whether to annualize the result

        Returns:
            Tracking error as a percentage
        """
        if len(diff_returns) < 2:
            return 0.0

        diff_array = np.array(diff_returns)
        tracking_error = np.std(diff_array, ddof=1)

        if annualize:
            # Annualize assuming daily returns
            tracking_error = tracking_error * np.sqrt(252)

        return float(tracking_error * 100)  # Convert to percentage

    def calculate_tracking_difference(
        self,
        diff_returns: List[float],
        annualize: bool = True
    ) -> float:
        """
        Calculate tracking difference: mean of (portfolio return - benchmark return).

        Args:
            diff_returns: List of differences between portfolio and benchmark returns
            annualize: Whether to annualize the result

        Returns:
            Tracking difference as a percentage
        """
        if len(diff_returns) == 0:
            return 0.0

        diff_array = np.array(diff_returns)
        tracking_diff = np.mean(diff_array)

        if annualize:
            # Annualize assuming daily returns
            tracking_diff = tracking_diff * 252

        return float(tracking_diff * 100)  # Convert to percentage

    def get_holdings_returns(
        self,
        portfolio_id: str,
        start_date: date,
        end_date: date,
        top_n: Optional[int] = None
    ) -> Dict[str, List[float]]:
        """
        Get daily returns for each holding in the portfolio.

        Args:
            portfolio_id: Portfolio ID
            start_date: Start date
            end_date: End date
            top_n: Limit to top N holdings by weight (default: all)

        Returns:
            Dictionary mapping symbol to list of daily returns
        """
        # Get current holdings (using end_date as reference)
        holdings = self._get_holdings_on_date(portfolio_id, end_date)

        # Sort by weight and limit if needed
        holdings.sort(key=lambda x: x['weight'], reverse=True)
        if top_n:
            holdings = holdings[:top_n]

        holdings_returns = {}

        for holding in holdings:
            company_id = holding['company_id']
            symbol = holding['symbol']

            # Get daily prices for this stock
            statement = select(DailyOHLC).where(
                and_(
                    DailyOHLC.company_id == company_id,
                    func.date(DailyOHLC.date) >= start_date,
                    func.date(DailyOHLC.date) <= end_date
                )
            ).order_by(DailyOHLC.date)

            ohlc_data = self.db.exec(statement).all()

            if len(ohlc_data) < 2:
                continue

            # Calculate daily returns
            returns = []
            for i in range(1, len(ohlc_data)):
                prev_close = float(ohlc_data[i-1].close_price)
                curr_close = float(ohlc_data[i].close_price)

                if prev_close > 0:
                    daily_return = (curr_close - prev_close) / prev_close
                    returns.append(daily_return)

            if returns:
                holdings_returns[symbol] = returns

        return holdings_returns

    def compute_correlation_matrix(
        self,
        holdings_returns: Dict[str, List[float]]
    ) -> Dict[str, any]:
        """
        Compute correlation matrix for holdings.

        Args:
            holdings_returns: Dictionary mapping symbol to list of returns

        Returns:
            Dictionary with avg_correlation, pairs, and matrix
        """
        if len(holdings_returns) < 2:
            return {
                'avg_correlation': 0.0,
                'pairs': [],
                'matrix': []
            }

        symbols = list(holdings_returns.keys())
        n = len(symbols)

        # Align returns by length (use minimum length)
        min_length = min(len(returns) for returns in holdings_returns.values())
        if min_length < 2:
            return {
                'avg_correlation': 0.0,
                'pairs': [],
                'matrix': []
            }

        # Create aligned return arrays
        aligned_returns = {}
        for symbol in symbols:
            aligned_returns[symbol] = np.array(holdings_returns[symbol][:min_length])

        # Compute correlation matrix
        returns_matrix = np.array([aligned_returns[symbol] for symbol in symbols])
        correlation_matrix = np.corrcoef(returns_matrix)

        # Extract pairs
        pairs = []
        correlations = []

        for i in range(n):
            for j in range(i + 1, n):
                corr = float(correlation_matrix[i, j])
                if not np.isnan(corr):
                    pairs.append({
                        'asset1': symbols[i],
                        'asset2': symbols[j],
                        'correlation': corr,
                        'risk': self._get_correlation_risk(corr)
                    })
                    correlations.append(corr)

        # Calculate average correlation
        avg_correlation = float(np.mean(correlations)) if correlations else 0.0

        return {
            'avg_correlation': avg_correlation,
            'pairs': pairs,
            'matrix': correlation_matrix.tolist()
        }

    def _get_correlation_risk(self, correlation: float) -> str:
        """Determine risk level based on correlation."""
        abs_corr = abs(correlation)
        if abs_corr > 0.7:
            return 'high'
        elif abs_corr > 0.4:
            return 'medium'
        else:
            return 'low'

    def compute_sector_weights(
        self,
        portfolio_id: str,
        target_date: date
    ) -> Dict[str, float]:
        """
        Compute sector weights for portfolio.

        Args:
            portfolio_id: Portfolio ID
            target_date: Date to compute weights for

        Returns:
            Dictionary mapping sector to weight percentage
        """
        holdings = self._get_holdings_on_date(portfolio_id, target_date)

        sector_values = {}
        total_value = sum(h['value'] for h in holdings)

        if total_value == 0:
            return {}

        for holding in holdings:
            sector = holding.get('sector', 'Unknown')
            value = holding['value']

            if sector not in sector_values:
                sector_values[sector] = 0.0

            sector_values[sector] += value

        # Convert to percentages
        sector_weights = {
            sector: (value / total_value) * 100
            for sector, value in sector_values.items()
        }

        return sector_weights

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

    def _bulk_load_prices(
        self,
        company_ids: List[str],
        start_date: date,
        end_date: date
    ) -> Dict[str, Dict[date, float]]:
        """Load all prices for multiple companies in a single query."""
        if not company_ids:
            return {}

        # Determine which company ids are not yet cached
        # Cache key is simply company_id; each holds a dict of date->price
        # We still query for the date window to avoid huge memory.
        statement = select(DailyOHLC).where(
            and_(
                DailyOHLC.company_id.in_(company_ids),
                func.date(DailyOHLC.date) >= start_date,
                func.date(DailyOHLC.date) <= end_date,
            )
        ).order_by(DailyOHLC.company_id, DailyOHLC.date)

        all_prices = self.db.exec(statement).all()

        prices_dict: Dict[str, Dict[date, float]] = {}
        for ohlc in all_prices:
            cid = str(ohlc.company_id)
            pdate = ohlc.date.date() if isinstance(ohlc.date, datetime) else ohlc.date
            if cid not in prices_dict:
                prices_dict[cid] = {}
            prices_dict[cid][pdate] = float(ohlc.close_price)

        return prices_dict

    def _bulk_load_companies(self, company_ids: List[str]) -> Dict[str, Company]:
        """Load multiple companies in a single query and cache them."""
        if not company_ids:
            return {}

        uncached_ids = [cid for cid in company_ids if cid not in self._company_cache]
        if uncached_ids:
            statement = select(Company).where(Company.id.in_(uncached_ids))
            companies = self.db.exec(statement).all()
            for company in companies:
                self._company_cache[str(company.id)] = company

        return {cid: self._company_cache[cid] for cid in company_ids if cid in self._company_cache}

    def _get_daily_valuations(
        self,
        portfolio_id: str,
        start_date: date,
        end_date: date
    ) -> List[Dict]:
        """Get daily portfolio valuations from database, with optimized fallback."""
        # Try to get from portfolio_daily_valuations table first (single query)
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

        # Optimized fallback: bulk-compute for the entire range
        return self._calculate_valuations_bulk(portfolio_id, start_date, end_date)

    def _calculate_valuations_bulk(
        self,
        portfolio_id: str,
        start_date: date,
        end_date: date
    ) -> List[Dict]:
        """Efficiently calculate valuations using bulk-loaded prices and pandas date ranges."""
        # Load positions once
        positions = self.db.exec(
            select(PortfolioPosition).where(PortfolioPosition.portfolio_id == portfolio_id)
        ).all()

        active_positions = [p for p in positions if p.quantity > 0]
        if not active_positions:
            return []

        company_ids = [str(p.stock_id) for p in active_positions]
        if not company_ids:
            return []

        # Load all prices for all companies in the window
        prices_dict = self._bulk_load_prices(company_ids, start_date, end_date)

        # Cash balance
        portfolio = self.db.get(Portfolio, portfolio_id)
        cash_balance = float(portfolio.cash_balance) if portfolio and portfolio.cash_balance else 0.0

        # Build date range once
        date_range = pd.date_range(start=start_date, end=end_date, freq='D')

        results: List[Dict] = []
        for ts in date_range:
            cur_date = ts.date()
            total_value = cash_balance

            for position in active_positions:
                cid = str(position.stock_id)
                if cid not in prices_dict:
                    continue
                # choose closest date <= cur_date
                available = [d for d in prices_dict[cid].keys() if d <= cur_date]
                if not available:
                    continue
                price = prices_dict[cid][max(available)]
                total_value += position.quantity * price

            results.append({'date': cur_date, 'value': total_value, 'daily_return': 0.0})

        # compute daily returns vectorized
        if len(results) > 1:
            values = np.array([r['value'] for r in results], dtype=float)
            prev = values[:-1]
            prev[prev == 0] = np.nan
            diffs = np.diff(values)
            daily = np.zeros(len(values), dtype=float)
            daily[1:] = np.where(np.isfinite(prev) & (prev > 0), diffs / prev, 0.0)
            for i in range(len(results)):
                results[i]['daily_return'] = float(daily[i])

        return results

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
        """Calculate portfolio total value on a specific date (delegates to optimized)."""
        return self._get_portfolio_value_on_date_optimized(portfolio_id, target_date)

    def _get_holdings_on_date(
        self,
        portfolio_id: str,
        target_date: date
    ) -> List[Dict]:
        """Get portfolio holdings on a specific date using bulk loading."""
        # Load positions
        positions = self.db.exec(
            select(PortfolioPosition).where(PortfolioPosition.portfolio_id == portfolio_id)
        ).all()
        active_positions = [p for p in positions if p.quantity > 0]
        if not active_positions:
            return []

        company_ids = [str(p.stock_id) for p in active_positions]
        companies = self._bulk_load_companies(company_ids)

        # Load a small window up to target_date to get last available price
        prices_dict = self._bulk_load_prices(company_ids, target_date - timedelta(days=7), target_date)

        # First pass: compute total value
        total_value = 0.0
        temp_values: Dict[str, Tuple[float, float]] = {}  # company_id -> (price, position_value)
        for p in active_positions:
            cid = str(p.stock_id)
            if cid not in prices_dict:
                continue
            dates = [d for d in prices_dict[cid].keys() if d <= target_date]
            if not dates:
                continue
            price = prices_dict[cid][max(dates)]
            pos_val = p.quantity * price
            temp_values[cid] = (price, pos_val)
            total_value += pos_val

        holdings: List[Dict] = []
        if total_value <= 0:
            return holdings

        # Second pass: build holdings with weights
        for p in active_positions:
            cid = str(p.stock_id)
            company = companies.get(cid)
            if not company or cid not in temp_values:
                continue
            price, pos_val = temp_values[cid]
            weight = pos_val / total_value if total_value > 0 else 0.0
            holdings.append({
                'symbol': company.trading_code,
                'name': company.name,
                'sector': company.sector or 'Unknown',
                'company_id': cid,
                'quantity': p.quantity,
                'price': price,
                'value': pos_val,
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

    def _get_portfolio_value_on_date_optimized(
        self,
        portfolio_id: str,
        target_date: date
    ) -> float:
        """Optimized single-date portfolio value using bulk loads."""
        # Use optimized holdings which already bulk load data
        holdings = self._get_holdings_on_date(portfolio_id, target_date)
        total_value = sum(h['value'] for h in holdings)

        # Add cash
        portfolio = self.db.get(Portfolio, portfolio_id)
        if portfolio and portfolio.cash_balance:
            total_value += float(portfolio.cash_balance)

        return total_value

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
