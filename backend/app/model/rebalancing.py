import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .user import User
    from .portfolio import Portfolio
    from .company import Company


# Rebalancing Settings Model
class RebalancingSettings(SQLModel, table=True):
    """Auto-rebalancing configuration per portfolio"""
    __tablename__ = "rebalancing_settings"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    portfolio_id: uuid.UUID = Field(foreign_key="portfolio.id", index=True)
    enabled: bool = Field(default=False)
    threshold_pct: Decimal = Field(default=Decimal("5.0"), max_digits=5, decimal_places=2)
    frequency: str = Field(default="quarterly", max_length=20)  # daily, weekly, monthly, quarterly, semiannual, annual
    min_trade_value: Decimal = Field(default=Decimal("100.0"), max_digits=12, decimal_places=2)
    last_rebalance_at: Optional[datetime] = Field(default=None)
    next_rebalance_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Rebalancing Run Model
class RebalancingRun(SQLModel, table=True):
    """Record of a rebalancing execution"""
    __tablename__ = "rebalancing_run"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    portfolio_id: uuid.UUID = Field(foreign_key="portfolio.id", index=True)
    type: str = Field(max_length=20)  # 'manual' or 'auto'
    drift_before: Decimal = Field(max_digits=6, decimal_places=2)
    drift_after: Decimal = Field(max_digits=6, decimal_places=2)
    trades_count: int = Field(default=0)
    buy_value: Decimal = Field(default=Decimal("0"), max_digits=14, decimal_places=2)
    sell_value: Decimal = Field(default=Decimal("0"), max_digits=14, decimal_places=2)
    transaction_cost: Decimal = Field(default=Decimal("0"), max_digits=14, decimal_places=2)
    notes: Optional[str] = Field(default=None)
    executed_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    # Relationships
    trades: list["RebalancingTrade"] = Relationship(back_populates="run")


# Rebalancing Trade Model
class RebalancingTrade(SQLModel, table=True):
    """Individual trade executed as part of a rebalancing run"""
    __tablename__ = "rebalancing_trade"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    run_id: uuid.UUID = Field(foreign_key="rebalancing_run.id", index=True)
    stock_id: uuid.UUID = Field(foreign_key="company.id")
    symbol: str = Field(max_length=20)
    action: str = Field(max_length=4)  # 'BUY' or 'SELL'
    quantity: int
    price: Decimal = Field(max_digits=12, decimal_places=4)
    value: Decimal = Field(max_digits=14, decimal_places=2)
    
    # Relationships
    run: RebalancingRun = Relationship(back_populates="trades")


# Pydantic models for API
class RebalancingSettingsBase(SQLModel):
    enabled: bool = False
    threshold_pct: Decimal = Decimal("5.0")
    frequency: str = "quarterly"
    min_trade_value: Decimal = Decimal("100.0")


class RebalancingSettingsCreate(RebalancingSettingsBase):
    pass


class RebalancingSettingsUpdate(SQLModel):
    enabled: Optional[bool] = None
    threshold_pct: Optional[Decimal] = None
    frequency: Optional[str] = None
    min_trade_value: Optional[Decimal] = None


class RebalancingSettingsPublic(RebalancingSettingsBase):
    id: uuid.UUID
    user_id: uuid.UUID
    portfolio_id: uuid.UUID
    last_rebalance_at: Optional[datetime] = None
    next_rebalance_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class RebalancingSuggestion(SQLModel):
    """Single rebalancing suggestion"""
    symbol: str
    company_name: str
    sector: str
    action: str  # 'BUY' or 'SELL'
    current_allocation: Decimal
    target_allocation: Decimal
    deviation: Decimal
    suggested_shares: int
    suggested_value: Decimal
    current_value: Decimal
    priority: str  # 'high', 'medium', 'low'


class RebalancingSuggestionsResponse(SQLModel):
    """Response for suggestions endpoint"""
    portfolio_id: uuid.UUID
    threshold_pct: Decimal
    min_trade_value: Decimal
    suggestions: list[RebalancingSuggestion]
    totals: dict  # {"buyValue": 0, "sellValue": 0, "estimatedCost": 0}


class RebalancingExecuteRequest(SQLModel):
    """Request to execute rebalancing"""
    suggestions: list[dict]  # [{symbol, action, quantity, limit_price?}]
    simulate: bool = True


class RebalancingTradePublic(SQLModel):
    """Public trade info"""
    symbol: str
    action: str
    quantity: int
    price: Decimal
    value: Decimal


class RebalancingExecuteResponse(SQLModel):
    """Response after executing rebalancing"""
    run_id: uuid.UUID
    executed_at: datetime
    trades: list[RebalancingTradePublic]
    buy_value: Decimal
    sell_value: Decimal
    transaction_cost: Decimal
    drift_before: Decimal
    drift_after: Decimal


class RebalancingRunPublic(SQLModel):
    """Public rebalancing run info"""
    id: uuid.UUID
    portfolio_id: uuid.UUID
    type: str
    drift_before: Decimal
    drift_after: Decimal
    trades_count: int
    buy_value: Decimal
    sell_value: Decimal
    transaction_cost: Decimal
    notes: Optional[str]
    executed_at: datetime
    trades: list[RebalancingTradePublic] = []


class RebalancingHistoryResponse(SQLModel):
    """Response for history endpoint"""
    portfolio_id: uuid.UUID
    runs: list[RebalancingRunPublic]
    total_runs: int

