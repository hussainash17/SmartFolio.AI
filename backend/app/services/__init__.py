"""
Service layer for the portfolio management system.

This module contains business logic and data processing services
that are independent of the API layer and can be easily tested.
"""

from .base import BaseService
from .kyc_service import KYCService
from .portfolio_service import PortfolioService
from .analytics_service import AnalyticsService
from .research_service import ResearchService
from .goal_service import EnhancedInvestmentGoalService
from .financial_calculations import FinancialCalculator, calculate_step_up_sip

__all__ = [
    "BaseService",
    "KYCService", 
    "PortfolioService",
    "AnalyticsService",
    "ResearchService",
    "EnhancedInvestmentGoalService",
    "FinancialCalculator",
    "calculate_step_up_sip",
]