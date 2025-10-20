"""
Portfolio Performance Models

This module contains models for tracking portfolio performance metrics, including:
- Daily valuations
- Benchmark data
- Performance caching
- Reports and scheduled reports
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
import uuid

from sqlmodel import Field, Relationship, SQLModel, Column, JSON


# ============================================================================
# Benchmark Models
# ============================================================================

class BenchmarkBase(SQLModel):
    """Base model for benchmarks"""
    name: str = Field(max_length=100)
    ticker: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = None
    asset_class: Optional[str] = Field(default=None, max_length=50)
    region: Optional[str] = Field(default=None, max_length=50)
    data_source: Optional[str] = Field(default=None, max_length=50)
    is_active: bool = Field(default=True)


class Benchmark(BenchmarkBase, table=True):
    """Benchmark table model"""
    __tablename__ = "benchmarks"
    
    id: str = Field(primary_key=True, max_length=50)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


class BenchmarkPublic(BenchmarkBase):
    """Public benchmark model for API responses"""
    id: str
    created_at: datetime


class BenchmarkCreate(BenchmarkBase):
    """Model for creating a new benchmark"""
    id: str


# ============================================================================
# Benchmark Data Models
# ============================================================================

class BenchmarkDataBase(SQLModel):
    """Base model for benchmark historical data"""
    benchmark_id: str = Field(max_length=50)
    date: date
    close_value: Decimal = Field(max_digits=15, decimal_places=4)
    return_1d: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=6)
    return_cumulative: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=6)
    volume: Optional[int] = None


class BenchmarkData(BenchmarkDataBase, table=True):
    """Benchmark data table model"""
    __tablename__ = "benchmark_data"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


class BenchmarkDataPublic(BenchmarkDataBase):
    """Public benchmark data model for API responses"""
    id: int
    created_at: datetime


# ============================================================================
# Portfolio Daily Valuation Models
# ============================================================================

class PortfolioDailyValuationBase(SQLModel):
    """Base model for portfolio daily valuations"""
    portfolio_id: UUID
    valuation_date: date
    total_value: Decimal = Field(max_digits=15, decimal_places=2)
    cash_value: Optional[Decimal] = Field(default=None, max_digits=15, decimal_places=2)
    securities_value: Optional[Decimal] = Field(default=None, max_digits=15, decimal_places=2)
    daily_return: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=6)
    cumulative_return: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=6)


class PortfolioDailyValuation(PortfolioDailyValuationBase, table=True):
    """Portfolio daily valuation table model"""
    __tablename__ = "portfolio_daily_valuations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


class PortfolioDailyValuationPublic(PortfolioDailyValuationBase):
    """Public portfolio daily valuation model for API responses"""
    id: int
    created_at: datetime


class PortfolioDailyValuationCreate(PortfolioDailyValuationBase):
    """Model for creating a new portfolio daily valuation"""
    pass


# ============================================================================
# Portfolio Performance Cache Models
# ============================================================================

class PortfolioPerformanceCacheBase(SQLModel):
    """Base model for portfolio performance cache"""
    portfolio_id: UUID
    period: str = Field(max_length=10)
    benchmark_id: Optional[str] = Field(default=None, max_length=50)
    calculation_date: date
    metrics: dict = Field(sa_column=Column(JSON))


class PortfolioPerformanceCache(PortfolioPerformanceCacheBase, table=True):
    """Portfolio performance cache table model"""
    __tablename__ = "portfolio_performance_cache"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


class PortfolioPerformanceCachePublic(PortfolioPerformanceCacheBase):
    """Public portfolio performance cache model for API responses"""
    id: int
    created_at: datetime


# ============================================================================
# Portfolio Report Models
# ============================================================================

class PortfolioReportBase(SQLModel):
    """Base model for portfolio reports"""
    portfolio_id: UUID
    user_id: UUID
    report_type: str = Field(max_length=50)
    period: Optional[str] = Field(default=None, max_length=50)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    format: str = Field(max_length=10)
    status: str = Field(default="pending", max_length=20)
    file_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    error_message: Optional[str] = None


class PortfolioReport(PortfolioReportBase, table=True):
    """Portfolio report table model"""
    __tablename__ = "portfolio_reports"
    
    id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


class PortfolioReportPublic(PortfolioReportBase):
    """Public portfolio report model for API responses"""
    id: UUID
    created_at: datetime


class PortfolioReportCreate(SQLModel):
    """Model for creating a new portfolio report"""
    report_type: str
    period: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    format: str = "pdf"
    include_sections: Optional[List[str]] = None
    benchmark_id: Optional[str] = None


class PortfolioReportStatusResponse(SQLModel):
    """Response model for report status"""
    report_id: UUID
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None


# ============================================================================
# Portfolio Scheduled Report Models
# ============================================================================

class PortfolioScheduledReportBase(SQLModel):
    """Base model for scheduled portfolio reports"""
    portfolio_id: UUID
    user_id: UUID
    report_type: str = Field(max_length=50)
    frequency: str = Field(max_length=20)
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    format: str = Field(default="pdf", max_length=10)
    email_recipients: List[str] = Field(sa_column=Column(JSON))
    include_sections: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    is_active: bool = Field(default=True)
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None


class PortfolioScheduledReport(PortfolioScheduledReportBase, table=True):
    """Portfolio scheduled report table model"""
    __tablename__ = "portfolio_scheduled_reports"
    
    id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


class PortfolioScheduledReportPublic(PortfolioScheduledReportBase):
    """Public portfolio scheduled report model for API responses"""
    id: UUID
    created_at: datetime
    updated_at: datetime


class PortfolioScheduledReportCreate(SQLModel):
    """Model for creating a new scheduled report"""
    report_type: str
    frequency: str
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    format: str = "pdf"
    email_recipients: List[str]
    include_sections: Optional[List[str]] = None


class PortfolioScheduledReportUpdate(SQLModel):
    """Model for updating a scheduled report"""
    report_type: Optional[str] = None
    frequency: Optional[str] = None
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    format: Optional[str] = None
    email_recipients: Optional[List[str]] = None
    include_sections: Optional[List[str]] = None
    is_active: Optional[bool] = None


# ============================================================================
# Performance API Response Models
# ============================================================================

class PerformanceSummary(SQLModel):
    """Performance summary response model"""
    total_value: float
    total_cost: float
    cumulative_return: float
    cumulative_return_percent: float
    time_weighted_return: float
    money_weighted_return: float
    annualized_return: float
    sharpe_ratio: Optional[float] = None
    sortino_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None
    volatility: Optional[float] = None
    best_month: Optional[dict] = None
    worst_month: Optional[dict] = None
    best_quarter: Optional[dict] = None
    worst_quarter: Optional[dict] = None
    net_contributions: Optional[float] = None
    net_withdrawals: Optional[float] = None
    inception_date: Optional[str] = None
    days_since_inception: Optional[int] = None


class PerformanceSummaryResponse(SQLModel):
    """Complete performance summary API response"""
    portfolio_id: str
    portfolio_name: str
    period: str
    summary: PerformanceSummary


class ValueHistoryPoint(SQLModel):
    """Single point in portfolio value history"""
    date: str
    portfolio_value: float
    portfolio_return: Optional[float] = None
    portfolio_cumulative_return: Optional[float] = None
    benchmark_value: Optional[float] = None
    benchmark_return: Optional[float] = None
    benchmark_cumulative_return: Optional[float] = None
    relative_return: Optional[float] = None
    alpha: Optional[float] = None


class ValueHistoryResponse(SQLModel):
    """Portfolio value history API response"""
    portfolio_id: str
    benchmark_id: Optional[str] = None
    benchmark_name: Optional[str] = None
    frequency: str
    data: List[ValueHistoryPoint]


class BenchmarkComparisonPeriod(SQLModel):
    """Benchmark comparison for a single period"""
    period: str
    portfolio_return: float
    benchmark_return: float
    relative_return: float
    alpha: Optional[float] = None
    beta: Optional[float] = None
    tracking_error: Optional[float] = None
    information_ratio: Optional[float] = None


class BenchmarkComparisonResponse(SQLModel):
    """Benchmark comparison API response"""
    portfolio_id: str
    benchmark_id: str
    benchmark_name: str
    comparison: List[BenchmarkComparisonPeriod]


class BenchmarkListResponse(SQLModel):
    """List of available benchmarks"""
    benchmarks: List[BenchmarkPublic]


class MonthlyReturn(SQLModel):
    """Monthly return data"""
    month: str
    month_number: int
    return_value: float = Field(alias="return")
    portfolio_value_start: float
    portfolio_value_end: float
    benchmark_return: Optional[float] = None
    
    class Config:
        populate_by_name = True


class MonthlyReturnsResponse(SQLModel):
    """Monthly returns API response"""
    portfolio_id: str
    year: int
    monthly_returns: List[MonthlyReturn]
    ytd_return: float
    best_month: Optional[dict] = None
    worst_month: Optional[dict] = None
    positive_months: int
    negative_months: int


class RiskMetricsResponse(SQLModel):
    """Risk metrics API response"""
    portfolio_id: str
    period: str
    risk_metrics: dict


class AttributionResponse(SQLModel):
    """Attribution analysis API response"""
    portfolio_id: str
    period: str
    attribution: List[dict]
    total_attribution: Optional[dict] = None

