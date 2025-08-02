import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .user import User
    from .stock import StockCompany
    from .trade import Trade
    from .order import Order
    from .risk_management import PortfolioRiskMetrics


# Portfolio Model
class Portfolio(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    name: str = Field(max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    is_default: bool = Field(default=False)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="portfolios")
    positions: list["PortfolioPosition"] = Relationship(back_populates="portfolio")
    trades: list["Trade"] = Relationship(back_populates="portfolio")
    orders: list["Order"] = Relationship(back_populates="portfolio")
    risk_metrics: list["PortfolioRiskMetrics"] = Relationship(back_populates="portfolio")


# Portfolio Position (current holdings)
class PortfolioPosition(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    portfolio_id: uuid.UUID = Field(foreign_key="portfolio.id")
    stock_id: uuid.UUID = Field(foreign_key="stockcompany.id")
    quantity: int = Field(default=0)
    average_price: Decimal = Field(max_digits=10, decimal_places=2)
    total_investment: Decimal = Field(max_digits=15, decimal_places=2)
    current_value: Decimal = Field(max_digits=15, decimal_places=2, default=0)
    unrealized_pnl: Decimal = Field(max_digits=15, decimal_places=2, default=0)
    unrealized_pnl_percent: Decimal = Field(max_digits=5, decimal_places=2, default=0)
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    portfolio: Portfolio = Relationship(back_populates="positions")
    stock: "StockCompany" = Relationship(back_populates="positions")


# Watchlist Model
class Watchlist(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    name: str = Field(max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    is_default: bool = Field(default=False)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="watchlists")
    items: list["WatchlistItem"] = Relationship(back_populates="watchlist")


# Watchlist Item
class WatchlistItem(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    watchlist_id: uuid.UUID = Field(foreign_key="watchlist.id")
    stock_id: uuid.UUID = Field(foreign_key="stockcompany.id")
    added_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = Field(default=None, max_length=500)

    # Relationships
    watchlist: Watchlist = Relationship(back_populates="items")
    stock: "StockCompany" = Relationship(back_populates="watchlist_items")


# Pydantic models for API
class PortfolioBase(SQLModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False
    is_active: bool = True


class PortfolioCreate(PortfolioBase):
    pass


class PortfolioUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class PortfolioPublic(PortfolioBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PortfolioPositionBase(SQLModel):
    quantity: int
    average_price: Decimal
    total_investment: Decimal
    current_value: Decimal
    unrealized_pnl: Decimal
    unrealized_pnl_percent: Decimal


class PortfolioPositionPublic(PortfolioPositionBase):
    id: uuid.UUID
    portfolio_id: uuid.UUID
    stock_id: uuid.UUID
    last_updated: datetime


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


class WatchlistBase(SQLModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False
    is_active: bool = True


class WatchlistCreate(WatchlistBase):
    pass


class WatchlistUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class WatchlistPublic(WatchlistBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class WatchlistItemBase(SQLModel):
    notes: Optional[str] = None


class WatchlistItemCreate(WatchlistItemBase):
    stock_id: uuid.UUID


class WatchlistItemPublic(WatchlistItemBase):
    id: uuid.UUID
    watchlist_id: uuid.UUID
    stock_id: uuid.UUID
    added_at: datetime


# Portfolio Summary
class PortfolioSummary(SQLModel):
    portfolio_id: uuid.UUID
    portfolio_name: str
    total_investment: Decimal
    current_value: Decimal
    unrealized_pnl: Decimal
    unrealized_pnl_percent: Decimal
    total_positions: int
    positions: list[PortfolioPositionPublic]
