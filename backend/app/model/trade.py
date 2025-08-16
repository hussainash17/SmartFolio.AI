import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .portfolio import Portfolio
    from .stock import StockCompany


# Trade Model (all market trades)
class Trade(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    portfolio_id: Optional[uuid.UUID] = Field(default=None, foreign_key="portfolio.id")
    stock_id: uuid.UUID = Field(foreign_key="stockcompany.id")
    trade_type: str = Field(max_length=10)  # BUY, SELL
    quantity: int = Field(default=0)
    price: Decimal = Field(max_digits=10, decimal_places=2)
    total_amount: Decimal = Field(max_digits=15, decimal_places=2)
    commission: Decimal = Field(max_digits=10, decimal_places=2, default=0)
    net_amount: Decimal = Field(max_digits=15, decimal_places=2)
    trade_date: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = Field(default=None, max_length=500)
    is_simulated: bool = Field(default=False)  # For paper trading
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    portfolio: Optional["Portfolio"] = Relationship(back_populates="trades")
    stock: "StockCompany" = Relationship(back_populates="trades")


# Pydantic models for API
class TradeBase(SQLModel):
    trade_type: str
    quantity: int
    price: Decimal
    total_amount: Decimal
    commission: Decimal
    net_amount: Decimal
    trade_date: datetime
    notes: Optional[str] = None
    is_simulated: bool = False


class TradeCreate(TradeBase):
    stock_id: uuid.UUID
    portfolio_id: Optional[uuid.UUID] = None


class TradeUpdate(SQLModel):
    trade_type: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    commission: Optional[Decimal] = None
    net_amount: Optional[Decimal] = None
    trade_date: Optional[datetime] = None
    notes: Optional[str] = None
    is_simulated: Optional[bool] = None


class TradePublic(TradeBase):
    id: uuid.UUID
    portfolio_id: Optional[uuid.UUID]
    stock_id: uuid.UUID
    created_at: datetime


class TradeWithDetails(TradePublic):
    """Public trade payload with stock details for UI convenience"""
    symbol: str
    company_name: str


# Trade Summary
class TradeSummary(SQLModel):
    total_trades: int
    buy_trades: int
    sell_trades: int
    total_volume: int
    total_amount: Decimal
    total_commission: Decimal
    net_amount: Decimal
    trades: list[TradePublic]
