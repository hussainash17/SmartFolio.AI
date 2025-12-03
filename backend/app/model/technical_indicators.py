"""
Technical indicators cache models.

This module contains models for caching technical indicator calculations
to improve performance and reduce redundant computations.
"""
import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlmodel import Field, SQLModel, Relationship

if False:  # TYPE_CHECKING
    from .company import Company


class DonchianChannelCache(SQLModel, table=True):
    """
    Cache table for Donchian Channel calculations.
    
    Stores pre-calculated support and resistance levels for standard periods
    (5, 10, 20) per symbol per day. This avoids recalculating the same values
    multiple times throughout the day.
    """
    __tablename__ = "donchian_channel_cache"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    company_id: uuid.UUID = Field(foreign_key="company.id", index=True)
    calculation_date: date = Field(index=True, description="Date for which calculations are made")
    
    # Current price at time of calculation
    current_price: Decimal = Field(max_digits=10, decimal_places=2)
    data_points: int = Field(description="Number of data points used in calculation")
    includes_current_day: bool = Field(default=False)
    
    # Period 5 values
    period_5_resistance: Decimal = Field(max_digits=10, decimal_places=2)
    period_5_support: Decimal = Field(max_digits=10, decimal_places=2)
    period_5_middle: Decimal = Field(max_digits=10, decimal_places=2)
    period_5_range: Decimal = Field(max_digits=10, decimal_places=2)
    
    # Period 10 values
    period_10_resistance: Decimal = Field(max_digits=10, decimal_places=2)
    period_10_support: Decimal = Field(max_digits=10, decimal_places=2)
    period_10_middle: Decimal = Field(max_digits=10, decimal_places=2)
    period_10_range: Decimal = Field(max_digits=10, decimal_places=2)
    
    # Period 20 values
    period_20_resistance: Decimal = Field(max_digits=10, decimal_places=2)
    period_20_support: Decimal = Field(max_digits=10, decimal_places=2)
    period_20_middle: Decimal = Field(max_digits=10, decimal_places=2)
    period_20_range: Decimal = Field(max_digits=10, decimal_places=2)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Composite unique constraint to ensure one cache entry per symbol per day
    # This should be added via Alembic migration: 
    # __table_args__ = (UniqueConstraint('company_id', 'calculation_date', name='uix_company_date'),)
