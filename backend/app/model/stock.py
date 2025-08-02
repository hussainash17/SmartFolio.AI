import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import BigInteger, Column

if TYPE_CHECKING:
    from .portfolio import Portfolio, PortfolioPosition, Watchlist, WatchlistItem
    from .alert import Alert, StockNews
    from .trade import Trade
    from .order import Order


# Stock Company Information
class StockCompany(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    symbol: str = Field(unique=True, index=True, max_length=50)
    company_name: str = Field(max_length=255)
    sector: str = Field(max_length=100)
    industry: str = Field(max_length=100)
    market_cap: Optional[Decimal] = Field(default=None)
    authorized_capital: Optional[Decimal] = Field(default=None)
    paid_up_capital: Optional[Decimal] = Field(default=None)
    face_value: Optional[Decimal] = Field(default=None)
    total_shares: Optional[int] = Field(default=None)
    free_float: Optional[Decimal] = Field(default=None)
    pe_ratio: Optional[Decimal] = Field(default=None)
    pb_ratio: Optional[Decimal] = Field(default=None)
    eps: Optional[Decimal] = Field(default=None)
    nav: Optional[Decimal] = Field(default=None)
    dividend_yield: Optional[Decimal] = Field(default=None)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    stock_data: list["StockData"] = Relationship(back_populates="company")
    intraday_ticks: list["IntradayTick"] = Relationship(back_populates="company")
    daily_data: list["DailyOHLC"] = Relationship(back_populates="company")
    positions: list["PortfolioPosition"] = Relationship(back_populates="stock")
    watchlist_items: list["WatchlistItem"] = Relationship(back_populates="stock")
    trades: list["Trade"] = Relationship(back_populates="stock")
    alerts: list["Alert"] = Relationship(back_populates="stock")
    news_relations: list["StockNews"] = Relationship(back_populates="stock")
    orders: list["Order"] = Relationship(back_populates="stock")


# Real-time Stock Data
class StockData(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    company_id: uuid.UUID = Field(foreign_key="stockcompany.id")
    last_trade_price: Decimal = Field(max_digits=10, decimal_places=2)
    change: Decimal = Field(max_digits=10, decimal_places=2)
    change_percent: Decimal = Field(max_digits=5, decimal_places=2)
    high: Decimal = Field(max_digits=10, decimal_places=2)
    low: Decimal = Field(max_digits=10, decimal_places=2)
    open_price: Decimal = Field(max_digits=10, decimal_places=2)
    previous_close: Decimal = Field(max_digits=10, decimal_places=2)
    volume: int = Field(default=0, sa_column=Column(BigInteger))
    turnover: Decimal = Field(max_digits=15, decimal_places=2, default=0)
    trades_count: int = Field(default=0)
    market_cap: Optional[Decimal] = Field(default=None)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    company: StockCompany = Relationship(back_populates="stock_data")


# Intraday Tick Data (for real-time charting)
class IntradayTick(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    company_id: uuid.UUID = Field(foreign_key="stockcompany.id")
    price: Decimal = Field(max_digits=10, decimal_places=2)
    volume: int = Field(default=0, sa_column=Column(BigInteger))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    company: StockCompany = Relationship(back_populates="intraday_ticks")


# Daily OHLC Data (aggregated from intraday ticks)
class DailyOHLC(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    company_id: uuid.UUID = Field(foreign_key="stockcompany.id")
    date: datetime = Field(index=True)
    open_price: Decimal = Field(max_digits=10, decimal_places=2)
    high: Decimal = Field(max_digits=10, decimal_places=2)
    low: Decimal = Field(max_digits=10, decimal_places=2)
    close_price: Decimal = Field(max_digits=10, decimal_places=2)
    volume: int = Field(default=0, sa_column=Column(BigInteger))
    turnover: Decimal = Field(max_digits=15, decimal_places=2, default=0)
    trades_count: int = Field(default=0)
    change: Decimal = Field(max_digits=10, decimal_places=2)
    change_percent: Decimal = Field(max_digits=5, decimal_places=2)
    
    # Relationships
    company: StockCompany = Relationship(back_populates="daily_data")


# Market Summary
class MarketSummary(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    date: datetime = Field(index=True)
    total_trades: int = Field(default=0)
    total_volume: int = Field(default=0, sa_column=Column(BigInteger))
    total_turnover: Decimal = Field(max_digits=20, decimal_places=2, default=0)
    dse_index: Optional[Decimal] = Field(default=None)
    dse_index_change: Optional[Decimal] = Field(default=None)
    dse_index_change_percent: Optional[Decimal] = Field(default=None)
    cse_index: Optional[Decimal] = Field(default=None)
    cse_index_change: Optional[Decimal] = Field(default=None)
    cse_index_change_percent: Optional[Decimal] = Field(default=None)
    advancers: int = Field(default=0)
    decliners: int = Field(default=0)
    unchanged: int = Field(default=0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Pydantic models for API
class StockCompanyBase(SQLModel):
    symbol: str
    company_name: str
    sector: str
    industry: str
    market_cap: Optional[Decimal] = None
    authorized_capital: Optional[Decimal] = None
    paid_up_capital: Optional[Decimal] = None
    face_value: Optional[Decimal] = None
    total_shares: Optional[int] = None
    free_float: Optional[Decimal] = None
    pe_ratio: Optional[Decimal] = None
    pb_ratio: Optional[Decimal] = None
    eps: Optional[Decimal] = None
    nav: Optional[Decimal] = None
    dividend_yield: Optional[Decimal] = None
    is_active: bool = True


class StockCompanyCreate(StockCompanyBase):
    pass


class StockCompanyUpdate(SQLModel):
    company_name: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_cap: Optional[Decimal] = None
    authorized_capital: Optional[Decimal] = None
    paid_up_capital: Optional[Decimal] = None
    face_value: Optional[Decimal] = None
    total_shares: Optional[int] = None
    free_float: Optional[Decimal] = None
    pe_ratio: Optional[Decimal] = None
    pb_ratio: Optional[Decimal] = None
    eps: Optional[Decimal] = None
    nav: Optional[Decimal] = None
    dividend_yield: Optional[Decimal] = None
    is_active: Optional[bool] = None


class StockCompanyPublic(StockCompanyBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class StockDataBase(SQLModel):
    last_trade_price: Decimal
    change: Decimal
    change_percent: Decimal
    high: Decimal
    low: Decimal
    open_price: Decimal
    previous_close: Decimal
    volume: int
    turnover: Decimal
    trades_count: int
    market_cap: Optional[Decimal] = None


class StockDataPublic(StockDataBase):
    id: uuid.UUID
    company_id: uuid.UUID
    timestamp: datetime


class IntradayTickBase(SQLModel):
    price: Decimal
    volume: int


class IntradayTickPublic(IntradayTickBase):
    id: uuid.UUID
    company_id: uuid.UUID
    timestamp: datetime


class DailyOHLCBase(SQLModel):
    date: datetime
    open_price: Decimal
    high: Decimal
    low: Decimal
    close_price: Decimal
    volume: int
    turnover: Decimal
    trades_count: int
    change: Decimal
    change_percent: Decimal


class DailyOHLCPublic(DailyOHLCBase):
    id: uuid.UUID
    company_id: uuid.UUID


class MarketSummaryBase(SQLModel):
    date: datetime
    total_trades: int
    total_volume: int
    total_turnover: Decimal
    dse_index: Optional[Decimal] = None
    dse_index_change: Optional[Decimal] = None
    dse_index_change_percent: Optional[Decimal] = None
    cse_index: Optional[Decimal] = None
    cse_index_change: Optional[Decimal] = None
    cse_index_change_percent: Optional[Decimal] = None
    advancers: int
    decliners: int
    unchanged: int


class MarketSummaryPublic(MarketSummaryBase):
    id: uuid.UUID
    timestamp: datetime 