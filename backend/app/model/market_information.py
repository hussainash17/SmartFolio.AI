import uuid
from datetime import date
from typing import Optional
from decimal import Decimal

from sqlmodel import SQLModel, Field


class MarketInformation(SQLModel, table=True):
    market_info_id: int | None = Field(default=None, primary_key=True)
    company_id: uuid.UUID = Field(foreign_key="company.id", index=True)
    date: date
    last_trading_price: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    closing_price: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    opening_price: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    adjusted_opening_price: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    days_range: Optional[str] = Field(default=None, max_length=50)
    change: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    days_value: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    days_volume: Optional[int] = None
    days_trade: Optional[int] = None
    market_capitalization: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    yesterday_closing_price: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)

    class Config:
        table_name = "market_information"
