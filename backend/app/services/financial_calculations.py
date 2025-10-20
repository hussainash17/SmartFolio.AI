"""
Financial Calculation Utilities for Investment Goals

This module provides comprehensive financial calculations including:
- SIP (Systematic Investment Plan) calculations
- Future Value calculations
- Monte Carlo simulations for goal achievement probability
- Asset allocation recommendations
- Return projections
"""

import math
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Tuple
from app.model.user import RiskAppetite, InvestmentGoal


class FinancialCalculator:
    """Comprehensive financial calculator for investment goals"""
    
    # Asset class expected returns (annual %)
    EXPECTED_RETURNS = {
        'equity': {'min': 10.0, 'avg': 12.0, 'max': 15.0, 'std_dev': 15.0},
        'debt': {'min': 6.0, 'avg': 7.5, 'max': 9.0, 'std_dev': 5.0},
        'gold': {'min': 6.0, 'avg': 8.0, 'max': 10.0, 'std_dev': 12.0},
        'cash': {'min': 3.0, 'avg': 4.0, 'max': 5.0, 'std_dev': 1.0},
    }
    
    # Inflation rate
    INFLATION_RATE = 6.0  # Annual inflation %
    
    @staticmethod
    def calculate_sip_required(
        target_amount: float,
        current_savings: float,
        years_to_goal: float,
        expected_return: float,
        inflation_adjust: bool = True
    ) -> Dict[str, float]:
        """
        Calculate required monthly SIP amount.
        
        Formula: SIP = FV * r / [((1 + r)^n - 1) * (1 + r)]
        where:
            FV = Future Value needed
            r = monthly rate of return
            n = number of months
            
        Args:
            target_amount: Target amount to achieve
            current_savings: Current amount already saved
            years_to_goal: Years until goal
            expected_return: Expected annual return %
            inflation_adjust: Whether to adjust target for inflation
            
        Returns:
            Dict with SIP details including monthly amount, total investment, returns
        """
        # Validate inputs
        if years_to_goal <= 0:
            raise ValueError("Years to goal must be positive")
        
        # Minimum 1 month investment period
        if years_to_goal < 1/12:
            years_to_goal = 1/12
        
        # Adjust target for inflation if needed
        if inflation_adjust:
            adjusted_target = target_amount * math.pow(
                (1 + FinancialCalculator.INFLATION_RATE / 100), 
                years_to_goal
            )
        else:
            adjusted_target = target_amount
        
        # Calculate future value of current savings
        months = max(1, int(years_to_goal * 12))  # Ensure at least 1 month
        monthly_rate = expected_return / 100 / 12
        
        fv_current_savings = current_savings * math.pow(1 + monthly_rate, months)
        
        # Amount needed from SIP
        amount_needed_from_sip = adjusted_target - fv_current_savings
        
        if amount_needed_from_sip <= 0:
            return {
                'monthly_sip_required': 0.0,
                'total_investment': current_savings,
                'expected_final_value': fv_current_savings,
                'expected_returns': fv_current_savings - current_savings,
                'time_period_months': months,
                'inflation_adjusted_target': adjusted_target,
            }
        
        # Calculate required monthly SIP
        # FV = SIP * [((1 + r)^n - 1) / r] * (1 + r)
        # SIP = FV / [((1 + r)^n - 1) / r] * (1 + r)]
        if monthly_rate > 0:
            sip_multiplier = ((math.pow(1 + monthly_rate, months) - 1) / monthly_rate) * (1 + monthly_rate)
            
            # Safety check: ensure multiplier is not zero or too small
            if sip_multiplier < 0.01:
                monthly_sip = amount_needed_from_sip / months
            else:
                monthly_sip = amount_needed_from_sip / sip_multiplier
        else:
            monthly_sip = amount_needed_from_sip / months
        
        total_investment = current_savings + (monthly_sip * months)
        expected_final_value = adjusted_target
        expected_returns = expected_final_value - total_investment
        
        return {
            'monthly_sip_required': round(monthly_sip, 2),
            'total_investment': round(total_investment, 2),
            'expected_final_value': round(expected_final_value, 2),
            'expected_returns': round(expected_returns, 2),
            'time_period_months': months,
            'inflation_adjusted_target': round(adjusted_target, 2),
        }
    
    @staticmethod
    def calculate_future_value(
        monthly_investment: float,
        current_savings: float,
        years: float,
        annual_return: float
    ) -> float:
        """
        Calculate future value of investments.
        
        Args:
            monthly_investment: Monthly SIP amount
            current_savings: Current amount saved
            years: Investment period in years
            annual_return: Expected annual return %
            
        Returns:
            Future value
        """
        # Ensure at least 1 month calculation period
        months = max(1, int(years * 12))
        monthly_rate = annual_return / 100 / 12
        
        # FV of current savings
        fv_current = current_savings * math.pow(1 + monthly_rate, months)
        
        # FV of monthly SIP
        if monthly_rate > 0:
            fv_sip = monthly_investment * (((math.pow(1 + monthly_rate, months) - 1) / monthly_rate) * (1 + monthly_rate))
        else:
            fv_sip = monthly_investment * months
        
        return round(fv_current + fv_sip, 2)
    
    @staticmethod
    def monte_carlo_simulation(
        monthly_sip: float,
        current_savings: float,
        years_to_goal: float,
        asset_allocation: Dict[str, float],
        num_simulations: int = 10000
    ) -> Dict[str, float]:
        """
        Run Monte Carlo simulation to determine probability of achieving goal.
        
        Args:
            monthly_sip: Monthly investment amount
            current_savings: Current savings
            years_to_goal: Years until goal
            asset_allocation: Dict of asset_class: percentage
            num_simulations: Number of simulations to run
            
        Returns:
            Dict with probability metrics
        """
        # Ensure at least 1 month for simulation
        months = max(1, int(years_to_goal * 12))
        
        # Calculate weighted portfolio return and volatility
        portfolio_return = 0.0
        portfolio_volatility = 0.0
        
        for asset_class, percentage in asset_allocation.items():
            if asset_class in FinancialCalculator.EXPECTED_RETURNS:
                returns = FinancialCalculator.EXPECTED_RETURNS[asset_class]
                portfolio_return += (returns['avg'] / 100) * (percentage / 100)
                portfolio_volatility += ((returns['std_dev'] / 100) * (percentage / 100)) ** 2
        
        portfolio_volatility = math.sqrt(portfolio_volatility)
        monthly_return = portfolio_return / 12
        monthly_volatility = portfolio_volatility / math.sqrt(12)
        
        # Run simulations
        final_values = []
        
        for _ in range(num_simulations):
            value = current_savings
            
            for month in range(months):
                # Generate random return for this month
                random_return = np.random.normal(monthly_return, monthly_volatility)
                
                # Apply return and add monthly SIP
                value = value * (1 + random_return) + monthly_sip
            
            final_values.append(value)
        
        final_values = np.array(final_values)
        
        return {
            'mean_final_value': float(np.mean(final_values)),
            'median_final_value': float(np.median(final_values)),
            'percentile_10': float(np.percentile(final_values, 10)),
            'percentile_25': float(np.percentile(final_values, 25)),
            'percentile_75': float(np.percentile(final_values, 75)),
            'percentile_90': float(np.percentile(final_values, 90)),
            'std_deviation': float(np.std(final_values)),
        }
    
    @staticmethod
    def calculate_goal_probability(
        target_amount: float,
        monthly_sip: float,
        current_savings: float,
        years_to_goal: float,
        asset_allocation: Dict[str, float],
        num_simulations: int = 10000
    ) -> float:
        """
        Calculate probability of achieving investment goal using Monte Carlo.
        
        Returns:
            Probability as percentage (0-100)
        """
        # Ensure at least 1 month for calculation
        months = max(1, int(years_to_goal * 12))
        
        # Calculate weighted portfolio return and volatility
        portfolio_return = 0.0
        portfolio_volatility = 0.0
        
        for asset_class, percentage in asset_allocation.items():
            if asset_class in FinancialCalculator.EXPECTED_RETURNS:
                returns = FinancialCalculator.EXPECTED_RETURNS[asset_class]
                portfolio_return += (returns['avg'] / 100) * (percentage / 100)
                portfolio_volatility += ((returns['std_dev'] / 100) * (percentage / 100)) ** 2
        
        portfolio_volatility = math.sqrt(portfolio_volatility)
        monthly_return = portfolio_return / 12
        monthly_volatility = portfolio_volatility / math.sqrt(12)
        
        # Run simulations
        successes = 0
        
        for _ in range(num_simulations):
            value = current_savings
            
            for month in range(months):
                random_return = np.random.normal(monthly_return, monthly_volatility)
                value = value * (1 + random_return) + monthly_sip
            
            if value >= target_amount:
                successes += 1
        
        probability = (successes / num_simulations) * 100
        return round(probability, 2)
    
    @staticmethod
    def get_asset_allocation_for_goal(
        goal_type: InvestmentGoal,
        risk_appetite: RiskAppetite,
        years_to_goal: float
    ) -> Dict[str, float]:
        """
        Get recommended asset allocation based on goal type, risk, and time horizon.
        
        Uses glide path for long-term goals (reducing equity as goal approaches).
        
        Returns:
            Dict with equity, debt, gold, cash percentages
        """
        # Base allocations by risk appetite
        base_allocations = {
            RiskAppetite.CONSERVATIVE: {'equity': 20, 'debt': 60, 'gold': 10, 'cash': 10},
            RiskAppetite.MODERATE: {'equity': 50, 'debt': 35, 'gold': 10, 'cash': 5},
            RiskAppetite.AGGRESSIVE: {'equity': 75, 'debt': 15, 'gold': 8, 'cash': 2},
        }
        
        allocation = base_allocations[risk_appetite].copy()
        
        # Adjust for time horizon (glide path)
        if years_to_goal < 2:
            # Very short term - reduce equity significantly
            equity_reduction = min(allocation['equity'] * 0.5, 30)
            allocation['equity'] -= equity_reduction
            allocation['debt'] += equity_reduction * 0.7
            allocation['cash'] += equity_reduction * 0.3
        elif years_to_goal < 5:
            # Short to medium term - moderate equity reduction
            equity_reduction = min(allocation['equity'] * 0.3, 20)
            allocation['equity'] -= equity_reduction
            allocation['debt'] += equity_reduction * 0.8
            allocation['cash'] += equity_reduction * 0.2
        elif years_to_goal > 15:
            # Very long term - can increase equity slightly
            if risk_appetite != RiskAppetite.AGGRESSIVE:
                equity_increase = 10
                allocation['equity'] += equity_increase
                allocation['debt'] -= equity_increase * 0.6
                allocation['gold'] -= equity_increase * 0.4
        
        # Goal-specific adjustments
        if goal_type == InvestmentGoal.EMERGENCY_FUND:
            # Emergency fund needs high liquidity
            allocation = {'equity': 10, 'debt': 40, 'gold': 5, 'cash': 45}
        elif goal_type == InvestmentGoal.HOME_PURCHASE and years_to_goal < 3:
            # Near-term home purchase needs safety
            allocation['equity'] = min(allocation['equity'], 30)
            allocation['debt'] = max(allocation['debt'], 50)
        elif goal_type == InvestmentGoal.RETIREMENT and years_to_goal > 10:
            # Long-term retirement can be more aggressive
            if risk_appetite != RiskAppetite.CONSERVATIVE:
                allocation['equity'] = min(allocation['equity'] + 10, 85)
        
        # Ensure allocations sum to 100
        total = sum(allocation.values())
        if total != 100:
            adjustment_factor = 100 / total
            allocation = {k: round(v * adjustment_factor, 2) for k, v in allocation.items()}
        
        return allocation
    
    @staticmethod
    def calculate_expected_returns(
        asset_allocation: Dict[str, float]
    ) -> Tuple[float, float, float]:
        """
        Calculate expected returns (min, avg, max) based on asset allocation.
        
        Returns:
            Tuple of (min_return, avg_return, max_return) as percentages
        """
        min_return = 0.0
        avg_return = 0.0
        max_return = 0.0
        
        for asset_class, percentage in asset_allocation.items():
            if asset_class in FinancialCalculator.EXPECTED_RETURNS:
                returns = FinancialCalculator.EXPECTED_RETURNS[asset_class]
                weight = percentage / 100
                min_return += returns['min'] * weight
                avg_return += returns['avg'] * weight
                max_return += returns['max'] * weight
        
        return (round(min_return, 2), round(avg_return, 2), round(max_return, 2))
    
    @staticmethod
    def calculate_shortfall(
        current_value: float,
        target_amount: float,
        months_remaining: int,
        current_monthly_sip: float,
        expected_return: float
    ) -> Dict[str, float]:
        """
        Calculate if there's a shortfall and how much additional SIP is needed.
        
        Returns:
            Dict with shortfall info and recommended additional SIP
        """
        # Project future value with current SIP
        years_remaining = months_remaining / 12
        projected_value = FinancialCalculator.calculate_future_value(
            current_monthly_sip,
            current_value,
            years_remaining,
            expected_return
        )
        
        shortfall = max(0, target_amount - projected_value)
        
        if shortfall > 0:
            # Calculate additional SIP needed
            sip_calc = FinancialCalculator.calculate_sip_required(
                shortfall,
                0,
                years_remaining,
                expected_return,
                inflation_adjust=False
            )
            additional_sip_needed = sip_calc['monthly_sip_required']
        else:
            additional_sip_needed = 0.0
        
        return {
            'projected_value': projected_value,
            'shortfall_amount': round(shortfall, 2),
            'additional_sip_needed': round(additional_sip_needed, 2),
            'on_track': shortfall == 0,
        }


def calculate_step_up_sip(
    initial_sip: float,
    step_up_percent: float,
    years_to_goal: float,
    expected_return: float,
    current_savings: float = 0
) -> float:
    """
    Calculate future value with step-up SIP (increasing SIP annually).
    
    Args:
        initial_sip: Initial monthly SIP amount
        step_up_percent: Annual increase in SIP %
        years_to_goal: Investment period
        expected_return: Expected annual return %
        current_savings: Current amount saved
        
    Returns:
        Future value with step-up SIP
    """
    monthly_rate = expected_return / 100 / 12
    value = current_savings
    current_sip = initial_sip
    
    for year in range(int(years_to_goal)):
        # Invest for 12 months at current SIP level
        for month in range(12):
            value = value * (1 + monthly_rate) + current_sip
        
        # Increase SIP for next year
        current_sip *= (1 + step_up_percent / 100)
    
    # Handle remaining months
    remaining_months = int((years_to_goal - int(years_to_goal)) * 12)
    for month in range(remaining_months):
        value = value * (1 + monthly_rate) + current_sip
    
    return round(value, 2)

