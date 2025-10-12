import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from .stock import StockData, IntradayTick, DailyOHLC
    from .portfolio import PortfolioPosition, WatchlistItem
    from .alert import Alert, StockNews
    from .trade import Trade
    from .order import Order
    from .fundamental import (
        DividendInformation,
        FinancialPerformance,
        QuarterlyPerformance,
        ShareholdingPattern,
        LoanStatus
    )


class Company(SQLModel, table=True):
    """Company master table - consolidated from old company and stockcompany tables"""
    # Primary identifier (UUID for consistency with rest of system)
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    
    # Basic company information
    name: str = Field(max_length=255)
    trading_code: str = Field(max_length=50, unique=True, index=True)  # Also known as symbol
    company_name: Optional[str] = Field(default=None, max_length=255)  # Full company name
    scrip_code: Optional[int] = None
    
    # Classification
    type_of_instrument: Optional[str] = Field(default=None, max_length=50)
    market_category: Optional[str] = Field(default=None, max_length=1)
    electronic_share: Optional[str] = Field(default=None, max_length=1)
    sector: Optional[str] = Field(default=None, max_length=255, index=True)
    industry: Optional[str] = Field(default=None, max_length=100)
    
    # Capital structure
    authorized_capital: Optional[float] = None
    paid_up_capital: Optional[float] = None
    face_value: Optional[float] = None
    market_lot: Optional[int] = None
    total_outstanding_securities: Optional[int] = None
    total_shares: Optional[int] = None
    free_float: Optional[Decimal] = None
    
    # Market metrics
    market_cap: Optional[Decimal] = None
    pe_ratio: Optional[Decimal] = None
    pb_ratio: Optional[Decimal] = None
    eps: Optional[Decimal] = None
    nav: Optional[Decimal] = None
    dividend_yield: Optional[Decimal] = None
    reserve_and_surplus: Optional[float] = None
    
    # Contact and location
    address: Optional[str] = Field(default=None, max_length=2500)
    factory_address: Optional[str] = Field(default=None, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=255)
    fax: Optional[str] = Field(default=None, max_length=255)
    email: Optional[str] = Field(default=None, max_length=255)
    website: Optional[str] = Field(default=None, max_length=255)
    
    # Company secretary
    company_secretary_name: Optional[str] = Field(default=None, max_length=255)
    company_secretary_email: Optional[str] = Field(default=None, max_length=255)
    company_secretary_cell_no: Optional[str] = Field(default=None, max_length=255)
    
    # Dates and status
    debut_trading_date: Optional[str] = None  # Use str for date, parse as needed
    listing_year: Optional[int] = None
    year_end: Optional[str] = Field(default=None, max_length=25)
    last_agm_date: Optional[str] = None  # Use str for date, parse as needed
    fifty_two_weeks_moving_range: Optional[str] = Field(default=None, max_length=100)
    
    # Status and timestamps
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


# Pydantic models for API
class CompanyBase(SQLModel):
    """Base model for Company"""
    name: str
    trading_code: str
    company_name: Optional[str] = None
    scrip_code: Optional[int] = None
    type_of_instrument: Optional[str] = None
    market_category: Optional[str] = None
    electronic_share: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    authorized_capital: Optional[float] = None
    paid_up_capital: Optional[float] = None
    face_value: Optional[float] = None
    market_lot: Optional[int] = None
    total_outstanding_securities: Optional[int] = None
    total_shares: Optional[int] = None
    free_float: Optional[Decimal] = None
    market_cap: Optional[Decimal] = None
    pe_ratio: Optional[Decimal] = None
    pb_ratio: Optional[Decimal] = None
    eps: Optional[Decimal] = None
    nav: Optional[Decimal] = None
    dividend_yield: Optional[Decimal] = None
    is_active: bool = True


class CompanyCreate(CompanyBase):
    """Create model for Company"""
    pass


class CompanyUpdate(SQLModel):
    """Update model for Company"""
    name: Optional[str] = None
    company_name: Optional[str] = None
    scrip_code: Optional[int] = None
    type_of_instrument: Optional[str] = None
    market_category: Optional[str] = None
    electronic_share: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    authorized_capital: Optional[float] = None
    paid_up_capital: Optional[float] = None
    face_value: Optional[float] = None
    market_lot: Optional[int] = None
    total_outstanding_securities: Optional[int] = None
    total_shares: Optional[int] = None
    free_float: Optional[Decimal] = None
    market_cap: Optional[Decimal] = None
    pe_ratio: Optional[Decimal] = None
    pb_ratio: Optional[Decimal] = None
    eps: Optional[Decimal] = None
    nav: Optional[Decimal] = None
    dividend_yield: Optional[Decimal] = None
    is_active: Optional[bool] = None


class CompanyPublic(CompanyBase):
    """Public model for Company"""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
