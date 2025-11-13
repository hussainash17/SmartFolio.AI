"""
Risk Analysis Service

This module provides comprehensive risk analysis for portfolios, including:
- Risk metrics (VaR, CVaR, volatility, Sharpe, beta, tracking error)
- Sector concentration analysis
- Correlation analysis
- Stress testing
- Risk alerts generation
"""

from typing import List, Dict, Optional, Tuple
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlmodel import Session, select, and_

from app.services.performance_calculator import PerformanceCalculator
from app.services.benchmark_service import BenchmarkService
from app.model.portfolio import Portfolio
from app.model.risk_management import PortfolioRiskMetrics, RiskAlert
from app.model.performance import BenchmarkData


class RiskService:
    """Service for comprehensive risk analysis"""
    
    def __init__(self, db: Session):
        self.db = db
        self.calculator = PerformanceCalculator(db)
        self.benchmark_service = BenchmarkService(db)
    
    def get_risk_overview(
        self,
        portfolio_id: str,
        period: str = "1Y",
        benchmark_id: Optional[str] = None
    ) -> Dict:
        """
        Get comprehensive risk overview for a portfolio.
        
        Returns:
            Dictionary with riskScore, activeAlerts, var95, volatility, sharpe, maxDrawdown, beta, trackingError
        """
        from app.api.routes.performance import get_date_range_from_period
        
        start_date, end_date = get_date_range_from_period(period)
        
        # Get portfolio value
        portfolio_value = self.calculator._get_portfolio_value_on_date(portfolio_id, end_date)
        
        # Get portfolio returns
        valuations = self.calculator._get_daily_valuations(portfolio_id, start_date, end_date)
        if not valuations or len(valuations) < 2:
            return self._empty_risk_overview(portfolio_id)
        
        returns = [v['daily_return'] for v in valuations if v['daily_return'] is not None]
        if not returns:
            return self._empty_risk_overview(portfolio_id)
        
        # Calculate basic metrics
        volatility = self.calculator.calculate_volatility(returns, annualize=True) * 100
        twr = self.calculator.calculate_time_weighted_return(portfolio_id, start_date, end_date)
        sharpe = self.calculator.calculate_sharpe_ratio(twr, volatility / 100) if volatility > 0 else 0.0
        max_dd = self.calculator.calculate_max_drawdown(valuations)
        var_95 = self.calculator.calculate_var(returns, portfolio_value, confidence=0.95)
        
        # Beta and tracking error (if benchmark provided)
        beta = 1.0
        tracking_error = 0.0
        
        if benchmark_id:
            benchmark_returns = self._get_benchmark_returns(benchmark_id, start_date, end_date)
            if benchmark_returns and len(benchmark_returns) == len(returns):
                beta = self.calculator.calculate_beta(returns, benchmark_returns)
                diff_returns = [r - b for r, b in zip(returns, benchmark_returns)]
                tracking_error = self.calculator.calculate_tracking_error(diff_returns)
        
        # Calculate risk score (0-10 scale)
        risk_score = self._calculate_risk_score(volatility, max_dd['max_drawdown_percent'], var_95, portfolio_value)
        
        # Get active alerts count
        active_alerts = self._count_active_alerts(portfolio_id)
        
        return {
            'riskScore': round(risk_score, 1),
            'activeAlerts': active_alerts,
            'var95': round(var_95, 2),
            'volatility': round(volatility, 2),
            'sharpeRatio': round(sharpe, 2),
            'maxDrawdown': round(max_dd['max_drawdown_percent'], 2),
            'beta': round(beta, 2),
            'trackingError': round(tracking_error, 2)
        }
    
    def get_risk_metrics(
        self,
        portfolio_id: str,
        period: str = "1Y",
        benchmark_id: Optional[str] = None
    ) -> Dict:
        """
        Get detailed risk metrics.
        
        Returns:
            Dictionary with all risk metrics
        """
        from app.api.routes.performance import get_date_range_from_period
        
        start_date, end_date = get_date_range_from_period(period)
        
        # Get portfolio value
        portfolio_value = self.calculator._get_portfolio_value_on_date(portfolio_id, end_date)
        
        # Get portfolio returns
        valuations = self.calculator._get_daily_valuations(portfolio_id, start_date, end_date)
        if not valuations or len(valuations) < 2:
            return self._empty_risk_metrics()
        
        returns = [v['daily_return'] for v in valuations if v['daily_return'] is not None]
        if not returns:
            return self._empty_risk_metrics()
        
        # Calculate metrics
        volatility = self.calculator.calculate_volatility(returns, annualize=True) * 100
        twr = self.calculator.calculate_time_weighted_return(portfolio_id, start_date, end_date)
        sharpe = self.calculator.calculate_sharpe_ratio(twr, volatility / 100) if volatility > 0 else 0.0
        sortino = self.calculator.calculate_sortino_ratio(twr, returns) if len(returns) > 1 else 0.0
        max_dd = self.calculator.calculate_max_drawdown(valuations)
        var_95 = self.calculator.calculate_var(returns, portfolio_value, confidence=0.95)
        cvar_95 = self.calculator.calculate_cvar(returns, portfolio_value, confidence=0.95)
        
        # Beta and tracking metrics
        beta = 1.0
        tracking_error = 0.0
        tracking_difference = 0.0
        
        if benchmark_id:
            benchmark_returns = self._get_benchmark_returns(benchmark_id, start_date, end_date)
            if benchmark_returns and len(benchmark_returns) == len(returns):
                beta = self.calculator.calculate_beta(returns, benchmark_returns)
                diff_returns = [r - b for r, b in zip(returns, benchmark_returns)]
                tracking_error = self.calculator.calculate_tracking_error(diff_returns)
                tracking_difference = self.calculator.calculate_tracking_difference(diff_returns)
        
        return {
            'volatilityPct': round(volatility, 2),
            'sharpeRatio': round(sharpe, 2),
            'sortinoRatio': round(sortino, 2),
            'maxDrawdownPct': round(max_dd['max_drawdown_percent'], 2),
            'var95Amt': round(var_95, 2),
            'cvar95Amt': round(cvar_95, 2),
            'beta': round(beta, 2),
            'trackingErrorPct': round(tracking_error, 2),
            'trackingDifferencePct': round(tracking_difference, 2)
        }
    
    def get_risk_metrics_timeseries(
        self,
        portfolio_id: str,
        period: str = "1Y",
        benchmark_id: Optional[str] = None
    ) -> Dict:
        """
        Get risk metrics as time series.
        
        Returns:
            Dictionary with dates and metric arrays
        """
        from app.api.routes.performance import get_date_range_from_period
        
        start_date, end_date = get_date_range_from_period(period)
        
        # Get daily valuations
        valuations = self.calculator._get_daily_valuations(portfolio_id, start_date, end_date)
        if not valuations or len(valuations) < 2:
            return {
                'dates': [],
                'volatilityPct': [],
                'sharpe': [],
                'drawdownPct': [],
                'var95Amt': [],
                'beta': [],
                'trackingErrorPct': []
            }
        
        dates = []
        volatility_values = []
        sharpe_values = []
        drawdown_values = []
        var_values = []
        beta_values = []
        tracking_error_values = []
        
        # Calculate rolling metrics (30-day window)
        window = 30
        portfolio_value = self.calculator._get_portfolio_value_on_date(portfolio_id, end_date)
        
        for i in range(window, len(valuations)):
            window_vals = valuations[i-window:i+1]
            window_returns = [v['daily_return'] for v in window_vals if v['daily_return'] is not None]
            
            if len(window_returns) < 2:
                continue
            
            date_val = window_vals[-1]['date']
            dates.append(date_val.isoformat() if isinstance(date_val, date) else date_val)
            
            # Volatility
            vol = self.calculator.calculate_volatility(window_returns, annualize=True) * 100
            volatility_values.append(round(vol, 2))
            
            # Sharpe (simplified)
            twr_window = sum(window_returns) / len(window_returns) * 252  # Approximate annualized
            sharpe = self.calculator.calculate_sharpe_ratio(twr_window, vol / 100) if vol > 0 else 0.0
            sharpe_values.append(round(sharpe, 2))
            
            # Drawdown
            dd = self.calculator.calculate_max_drawdown(window_vals)
            drawdown_values.append(round(dd['max_drawdown_percent'], 2))
            
            # VaR
            var_val = self.calculator.calculate_var(window_returns, portfolio_value, confidence=0.95)
            var_values.append(round(var_val, 2))
            
            # Beta and tracking error (if benchmark)
            beta_val = 1.0
            te_val = 0.0
            
            if benchmark_id:
                bench_returns = self._get_benchmark_returns(benchmark_id, window_vals[0]['date'], window_vals[-1]['date'])
                if bench_returns and len(benchmark_returns) == len(window_returns):
                    beta_val = self.calculator.calculate_beta(window_returns, bench_returns)
                    diff_returns = [r - b for r, b in zip(window_returns, bench_returns)]
                    te_val = self.calculator.calculate_tracking_error(diff_returns)
            
            beta_values.append(round(beta_val, 2))
            tracking_error_values.append(round(te_val, 2))
        
        return {
            'dates': dates,
            'volatilityPct': volatility_values,
            'sharpe': sharpe_values,
            'drawdownPct': drawdown_values,
            'var95Amt': var_values,
            'beta': beta_values,
            'trackingErrorPct': tracking_error_values
        }
    
    def get_sector_concentration(
        self,
        portfolio_id: str,
        period: str = "1Y",
        benchmark_id: Optional[str] = None
    ) -> Dict:
        """
        Get sector concentration analysis.
        
        Returns:
            Dictionary with items (sector weights) and topNConcentrationPct
        """
        from app.api.routes.performance import get_date_range_from_period
        
        start_date, end_date = get_date_range_from_period(period)
        
        # Get current sector weights
        current_weights = self.calculator.compute_sector_weights(portfolio_id, end_date)
        
        # Get previous month weights for trend
        prev_month_date = end_date - timedelta(days=30)
        prev_weights = self.calculator.compute_sector_weights(portfolio_id, prev_month_date)
        
        # Get benchmark sector weights if provided
        benchmark_weights = {}
        if benchmark_id:
            benchmark_weights = self._get_benchmark_sector_weights(benchmark_id, end_date)
        
        # Build items list
        items = []
        for sector, weight in current_weights.items():
            benchmark_weight = benchmark_weights.get(sector, 0.0)
            prev_weight = prev_weights.get(sector, weight)
            trend = weight - prev_weight
            
            # Determine risk level
            deviation = weight - benchmark_weight
            if abs(deviation) > 5:
                risk = 'high'
            elif abs(deviation) > 2:
                risk = 'medium'
            else:
                risk = 'low'
            
            items.append({
                'sector': sector,
                'weightPct': round(weight, 2),
                'benchmarkWeightPct': round(benchmark_weight, 2),
                'deviationPct': round(deviation, 2),
                'trendPct': round(trend, 2),
                'risk': risk
            })
        
        # Sort by weight
        items.sort(key=lambda x: x['weightPct'], reverse=True)
        
        # Calculate top 5 concentration
        top_5_concentration = sum(item['weightPct'] for item in items[:5])
        
        return {
            'items': items,
            'topNConcentrationPct': round(top_5_concentration, 2)
        }
    
    def get_correlation_analysis(
        self,
        portfolio_id: str,
        period: str = "1Y",
        top: int = 10
    ) -> Dict:
        """
        Get correlation analysis for portfolio holdings.
        
        Args:
            portfolio_id: Portfolio ID
            period: Time period
            top: Number of top holdings to analyze
        
        Returns:
            Dictionary with avgCorrelation, pairs, and optional matrix
        """
        from app.api.routes.performance import get_date_range_from_period
        
        start_date, end_date = get_date_range_from_period(period)
        
        # Get holdings returns (limit to top N)
        holdings_returns = self.calculator.get_holdings_returns(portfolio_id, start_date, end_date, top_n=top)
        
        # Compute correlation matrix
        correlation_data = self.calculator.compute_correlation_matrix(holdings_returns)
        
        return {
            'avgCorrelation': round(correlation_data['avg_correlation'], 3),
            'pairs': correlation_data['pairs'][:20],  # Limit to top 20 pairs
            'matrix': correlation_data.get('matrix', [])
        }
    
    def get_stress_tests(
        self,
        portfolio_id: str,
        scenarios: Optional[List[str]] = None,
        benchmark_id: Optional[str] = None
    ) -> Dict:
        """
        Get stress test results for various scenarios.
        
        Args:
            portfolio_id: Portfolio ID
            scenarios: List of scenario keys (default: all)
            benchmark_id: Optional benchmark ID
        
        Returns:
            Dictionary with scenarios list
        """
        if scenarios is None:
            scenarios = ['2008', 'covid', 'rate_hike', 'tech_crash']
        
        # Define scenario periods
        scenario_periods = {
            '2008': (date(2007, 10, 1), date(2009, 3, 1)),  # Financial crisis
            'covid': (date(2020, 2, 1), date(2020, 4, 1)),  # COVID crash
            'rate_hike': None,  # Factor shock
            'tech_crash': (date(2000, 3, 1), date(2000, 12, 1))  # Dot-com crash
        }
        
        results = []
        
        for scenario_key in scenarios:
            if scenario_key not in scenario_periods:
                continue
            
            period = scenario_periods[scenario_key]
            
            if scenario_key == 'rate_hike':
                # Factor shock: simulate 200bp rate increase impact
                impact = self._simulate_rate_hike_impact(portfolio_id)
                results.append({
                    'key': scenario_key,
                    'label': 'Rising Interest Rates',
                    'portfolioImpactPct': round(impact, 2),
                    'details': {
                        'description': '+200 basis points',
                        'method': 'factor_shock'
                    }
                })
            elif period:
                # Historical simulation
                impact = self._simulate_historical_scenario(portfolio_id, period[0], period[1])
                labels = {
                    '2008': '2008 Financial Crisis',
                    'covid': 'COVID-19 Crash',
                    'tech_crash': 'Tech Sector Correction'
                }
                results.append({
                    'key': scenario_key,
                    'label': labels.get(scenario_key, scenario_key),
                    'portfolioImpactPct': round(impact, 2),
                    'details': {
                        'startDate': period[0].isoformat(),
                        'endDate': period[1].isoformat(),
                        'method': 'historical_simulation'
                    }
                })
        
        return {'scenarios': results}
    
    def _get_benchmark_returns(
        self,
        benchmark_id: str,
        start_date: date,
        end_date: date
    ) -> Optional[List[float]]:
        """Get benchmark daily returns for date range."""
        benchmark_data = self.benchmark_service.get_benchmark_returns(
            benchmark_id, start_date, end_date, frequency='daily'
        )
        
        if not benchmark_data:
            return None
        
        # Extract returns
        returns = []
        for data in benchmark_data:
            if 'daily_return' in data and data['daily_return'] is not None:
                returns.append(float(data['daily_return']))
        
        return returns if returns else None
    
    def _get_benchmark_sector_weights(
        self,
        benchmark_id: str,
        as_of_date: date
    ) -> Dict[str, float]:
        """Get benchmark sector weights (placeholder - would query benchmark_sector_weights table)."""
        # TODO: Implement when benchmark_sector_weights table is available
        # For now, return empty dict or default weights
        return {}
    
    def _simulate_historical_scenario(
        self,
        portfolio_id: str,
        start_date: date,
        end_date: date
    ) -> float:
        """Simulate portfolio performance during historical scenario."""
        # Get current holdings
        current_holdings = self.calculator._get_holdings_on_date(portfolio_id, date.today())
        
        if not current_holdings:
            return 0.0
        
        # Calculate weighted return during scenario period
        total_return = 0.0
        
        for holding in current_holdings:
            weight = holding['weight']
            company_id = holding['company_id']
            
            # Get prices during scenario
            start_price = self.calculator._get_stock_price(company_id, start_date)
            end_price = self.calculator._get_stock_price(company_id, end_date)
            
            if start_price and end_price and start_price > 0:
                security_return = (end_price - start_price) / start_price
                total_return += weight * security_return
        
        return total_return * 100  # Convert to percentage
    
    def _simulate_rate_hike_impact(
        self,
        portfolio_id: str
    ) -> float:
        """Simulate impact of 200bp rate hike (simplified model)."""
        # Simplified: assume -0.5% impact per 100bp for equity-heavy portfolios
        # This is a placeholder - real implementation would use duration/convexity for bonds
        # and sector-specific sensitivities for equities
        holdings = self.calculator._get_holdings_on_date(portfolio_id, date.today())
        
        if not holdings:
            return 0.0
        
        # Assume average impact of -1% for 200bp hike
        return -1.0
    
    def _calculate_risk_score(
        self,
        volatility: float,
        max_drawdown: float,
        var_95: float,
        portfolio_value: float
    ) -> float:
        """Calculate overall risk score (0-10 scale)."""
        # Normalize components
        vol_score = min(volatility / 30.0, 1.0) * 3.0  # Max 3 points
        dd_score = min(abs(max_drawdown) / 30.0, 1.0) * 3.0  # Max 3 points
        var_score = min((var_95 / portfolio_value) * 100 / 5.0, 1.0) * 4.0  # Max 4 points
        
        total_score = vol_score + dd_score + var_score
        
        return min(total_score, 10.0)
    
    def _count_active_alerts(self, portfolio_id: str) -> int:
        """Count active risk alerts for portfolio."""
        statement = select(RiskAlert).where(
            and_(
                RiskAlert.portfolio_id == portfolio_id,
                RiskAlert.is_active == True
            )
        )
        alerts = self.db.exec(statement).all()
        return len(alerts)
    
    def _empty_risk_overview(self, portfolio_id: str) -> Dict:
        """Return empty risk overview."""
        return {
            'riskScore': 0.0,
            'activeAlerts': self._count_active_alerts(portfolio_id),
            'var95': 0.0,
            'volatility': 0.0,
            'sharpeRatio': 0.0,
            'maxDrawdown': 0.0,
            'beta': 1.0,
            'trackingError': 0.0
        }
    
    def _empty_risk_metrics(self) -> Dict:
        """Return empty risk metrics."""
        return {
            'volatilityPct': 0.0,
            'sharpeRatio': 0.0,
            'sortinoRatio': 0.0,
            'maxDrawdownPct': 0.0,
            'var95Amt': 0.0,
            'cvar95Amt': 0.0,
            'beta': 1.0,
            'trackingErrorPct': 0.0,
            'trackingDifferencePct': 0.0
        }

