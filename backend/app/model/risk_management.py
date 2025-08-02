import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import JSON, Column

if TYPE_CHECKING:
    from .user import User
    from .portfolio import Portfolio


class RiskMetricType(str, Enum):
    """Types of risk metrics"""
    VOLATILITY = "VOLATILITY"
    BETA = "BETA"
    SHARPE_RATIO = "SHARPE_RATIO"
    MAX_DRAWDOWN = "MAX_DRAWDOWN"
    VAR = "VAR"  # Value at Risk
    CVAR = "CVAR"  # Conditional Value at Risk
    CORRELATION = "CORRELATION"
    CONCENTRATION = "CONCENTRATION"


class RiskProfile(str, Enum):
    """User risk profiles"""
    CONSERVATIVE = "CONSERVATIVE"
    MODERATE = "MODERATE"
    AGGRESSIVE = "AGGRESSIVE"


# Risk Profile Model
class UserRiskProfile(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    risk_profile: RiskProfile = Field(default=RiskProfile.MODERATE)
    max_portfolio_volatility: Decimal = Field(max_digits=5, decimal_places=2, default=15.0)
    max_single_position: Decimal = Field(max_digits=5, decimal_places=2, default=20.0)
    max_sector_concentration: Decimal = Field(max_digits=5, decimal_places=2, default=30.0)
    target_sharpe_ratio: Decimal = Field(max_digits=5, decimal_places=2, default=1.0)
    max_drawdown_tolerance: Decimal = Field(max_digits=5, decimal_places=2, default=20.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="risk_profile")


# Portfolio Risk Metrics
class PortfolioRiskMetrics(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    portfolio_id: uuid.UUID = Field(foreign_key="portfolio.id")
    calculation_date: datetime = Field(default_factory=datetime.utcnow)
    
    # Risk metrics
    volatility: Decimal = Field(max_digits=5, decimal_places=2)
    beta: Decimal = Field(max_digits=5, decimal_places=2)
    sharpe_ratio: Decimal = Field(max_digits=5, decimal_places=2)
    max_drawdown: Decimal = Field(max_digits=5, decimal_places=2)
    var_95: Decimal = Field(max_digits=10, decimal_places=2)  # 95% VaR
    cvar_95: Decimal = Field(max_digits=10, decimal_places=2)  # 95% CVaR
    
    # Concentration metrics
    top_5_concentration: Decimal = Field(max_digits=5, decimal_places=2)
    sector_concentration: dict = Field(default={}, sa_column=Column(JSON))
    
    # Correlation metrics
    avg_correlation: Decimal = Field(max_digits=5, decimal_places=2)
    correlation_matrix: dict = Field(default={}, sa_column=Column(JSON))
    
    # Risk alerts
    risk_alerts: list[str] = Field(default=[], sa_column=Column(JSON))
    
    # Relationships
    portfolio: "Portfolio" = Relationship(back_populates="risk_metrics")


# Risk Alerts
class RiskAlert(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    portfolio_id: Optional[uuid.UUID] = Field(default=None, foreign_key="portfolio.id")
    alert_type: str = Field(max_length=100)
    severity: str = Field(max_length=20)  # LOW, MEDIUM, HIGH, CRITICAL
    message: str = Field(max_length=500)
    metric_value: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    threshold_value: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = Field(default=None)

    # Relationships
    user: "User" = Relationship(back_populates="risk_alerts")


# Stock Screener Criteria
class StockScreener(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    name: str = Field(max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    criteria: dict = Field(default={}, sa_column=Column(JSON))  # JSON field with screening criteria
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="stock_screeners")


# Pydantic models for API
class UserRiskProfileBase(SQLModel):
    risk_profile: RiskProfile = RiskProfile.MODERATE
    max_portfolio_volatility: Decimal = Decimal("15.0")
    max_single_position: Decimal = Decimal("20.0")
    max_sector_concentration: Decimal = Decimal("30.0")
    target_sharpe_ratio: Decimal = Decimal("1.0")
    max_drawdown_tolerance: Decimal = Decimal("20.0")


class UserRiskProfileCreate(UserRiskProfileBase):
    pass


class UserRiskProfileUpdate(SQLModel):
    risk_profile: Optional[RiskProfile] = None
    max_portfolio_volatility: Optional[Decimal] = None
    max_single_position: Optional[Decimal] = None
    max_sector_concentration: Optional[Decimal] = None
    target_sharpe_ratio: Optional[Decimal] = None
    max_drawdown_tolerance: Optional[Decimal] = None


class UserRiskProfilePublic(UserRiskProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PortfolioRiskMetricsBase(SQLModel):
    volatility: Decimal
    beta: Decimal
    sharpe_ratio: Decimal
    max_drawdown: Decimal
    var_95: Decimal
    cvar_95: Decimal
    top_5_concentration: Decimal
    sector_concentration: dict
    avg_correlation: Decimal
    correlation_matrix: dict
    risk_alerts: list[str]


class PortfolioRiskMetricsPublic(PortfolioRiskMetricsBase):
    id: uuid.UUID
    portfolio_id: uuid.UUID
    calculation_date: datetime


class RiskAlertBase(SQLModel):
    alert_type: str
    severity: str
    message: str
    metric_value: Optional[Decimal] = None
    threshold_value: Optional[Decimal] = None
    is_active: bool = True


class RiskAlertCreate(RiskAlertBase):
    portfolio_id: Optional[uuid.UUID] = None


class RiskAlertPublic(RiskAlertBase):
    id: uuid.UUID
    user_id: uuid.UUID
    portfolio_id: Optional[uuid.UUID]
    created_at: datetime
    resolved_at: Optional[datetime]


class StockScreenerBase(SQLModel):
    name: str
    description: Optional[str] = None
    criteria: dict
    is_active: bool = True


class StockScreenerCreate(StockScreenerBase):
    pass


class StockScreenerUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    criteria: Optional[dict] = None
    is_active: Optional[bool] = None


class StockScreenerPublic(StockScreenerBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# Risk Summary
class RiskSummary(SQLModel):
    portfolio_id: uuid.UUID
    portfolio_name: str
    current_risk_metrics: PortfolioRiskMetricsPublic
    risk_alerts: list[RiskAlertPublic]
    risk_score: Decimal  # 0-100 risk score
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL 