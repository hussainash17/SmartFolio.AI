"""
Tests for risk calculation functions in PerformanceCalculator
"""

import pytest
import numpy as np
from datetime import date, timedelta
from decimal import Decimal

from app.services.performance_calculator import PerformanceCalculator


class TestRiskCalculations:
    """Test risk calculation methods"""
    
    def test_calculate_var(self):
        """Test VaR calculation"""
        calculator = PerformanceCalculator(None)  # No DB needed for pure calculations
        
        # Create sample returns (some negative)
        returns = [0.01, -0.02, 0.015, -0.01, 0.005, -0.03, 0.02, -0.015]
        portfolio_value = 100000.0
        
        var_95 = calculator.calculate_var(returns, portfolio_value, confidence=0.95)
        
        # VaR should be positive (loss amount)
        assert var_95 >= 0
        # Should be less than portfolio value
        assert var_95 < portfolio_value
    
    def test_calculate_cvar(self):
        """Test CVaR calculation"""
        calculator = PerformanceCalculator(None)
        
        returns = [0.01, -0.02, 0.015, -0.01, 0.005, -0.03, 0.02, -0.015]
        portfolio_value = 100000.0
        
        cvar_95 = calculator.calculate_cvar(returns, portfolio_value, confidence=0.95)
        
        # CVaR should be positive and >= VaR
        assert cvar_95 >= 0
    
    def test_calculate_tracking_error(self):
        """Test tracking error calculation"""
        calculator = PerformanceCalculator(None)
        
        # Portfolio returns vs benchmark returns
        diff_returns = [0.001, -0.002, 0.0015, -0.001, 0.0005]
        
        tracking_error = calculator.calculate_tracking_error(diff_returns, annualize=True)
        
        # Tracking error should be positive
        assert tracking_error >= 0
    
    def test_calculate_tracking_difference(self):
        """Test tracking difference calculation"""
        calculator = PerformanceCalculator(None)
        
        diff_returns = [0.001, -0.002, 0.0015, -0.001, 0.0005]
        
        tracking_diff = calculator.calculate_tracking_difference(diff_returns, annualize=True)
        
        # Can be positive or negative
        assert isinstance(tracking_diff, float)
    
    def test_compute_correlation_matrix(self):
        """Test correlation matrix computation"""
        calculator = PerformanceCalculator(None)
        
        # Create sample holdings returns
        holdings_returns = {
            'AAPL': [0.01, 0.02, -0.01, 0.015, 0.005],
            'MSFT': [0.012, 0.018, -0.008, 0.014, 0.006],
            'GOOGL': [0.011, 0.019, -0.009, 0.013, 0.004]
        }
        
        result = calculator.compute_correlation_matrix(holdings_returns)
        
        assert 'avg_correlation' in result
        assert 'pairs' in result
        assert 'matrix' in result
        assert len(result['pairs']) > 0
        
        # Check correlation values are between -1 and 1
        for pair in result['pairs']:
            assert -1 <= pair['correlation'] <= 1
            assert pair['risk'] in ['low', 'medium', 'high']
    
    def test_get_correlation_risk(self):
        """Test correlation risk classification"""
        calculator = PerformanceCalculator(None)
        
        assert calculator._get_correlation_risk(0.8) == 'high'
        assert calculator._get_correlation_risk(0.5) == 'medium'
        assert calculator._get_correlation_risk(0.3) == 'low'
        assert calculator._get_correlation_risk(-0.8) == 'high'  # Absolute value
    
    def test_calculate_beta(self):
        """Test beta calculation"""
        calculator = PerformanceCalculator(None)
        
        portfolio_returns = [0.01, 0.02, -0.01, 0.015, 0.005]
        benchmark_returns = [0.008, 0.018, -0.012, 0.012, 0.003]
        
        beta = calculator.calculate_beta(portfolio_returns, benchmark_returns)
        
        # Beta should be a float
        assert isinstance(beta, float)
        # Beta can be any value (positive or negative)
        assert not np.isnan(beta)
    
    def test_empty_returns_handling(self):
        """Test that empty returns are handled gracefully"""
        calculator = PerformanceCalculator(None)
        
        # Empty returns should return 0 or default values
        assert calculator.calculate_var([], 100000.0) == 0.0
        assert calculator.calculate_cvar([], 100000.0) == 0.0
        assert calculator.calculate_tracking_error([]) == 0.0
        assert calculator.calculate_tracking_difference([]) == 0.0
        
        # Single return should also handle gracefully
        assert calculator.calculate_var([0.01], 100000.0) == 0.0
    
    def test_correlation_with_insufficient_data(self):
        """Test correlation with insufficient data"""
        calculator = PerformanceCalculator(None)
        
        # Single holding
        holdings_returns = {
            'AAPL': [0.01, 0.02]
        }
        
        result = calculator.compute_correlation_matrix(holdings_returns)
        
        assert result['avg_correlation'] == 0.0
        assert len(result['pairs']) == 0

