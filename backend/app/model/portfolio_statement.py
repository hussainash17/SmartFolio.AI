"""Models for Portfolio Statement PDF Parsing"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


class ClientInfo(BaseModel):
    """Client information from portfolio statement"""
    client_code: str = Field(..., description="Client code from the statement")
    bo_id: Optional[str] = Field(None, description="Beneficiary Owner ID")
    name: str = Field(..., description="Account name or type")
    statement_date: date = Field(..., description="Statement date")
    account_type: str = Field(default="CASH", description="Account type (CASH, MARGIN, etc.)")


class HoldingItem(BaseModel):
    """Individual holding/position from statement"""
    symbol: str = Field(..., description="Stock trading code/symbol from database")
    company_name: str = Field(..., description="Company name")
    quantity: int = Field(..., ge=0, description="Number of shares")
    cost_price: Decimal = Field(..., ge=0, description="Average cost price per share")
    market_price: Decimal = Field(..., ge=0, description="Current market price per share")
    market_value: Decimal = Field(..., description="Current market value of position")
    unrealized_gain_loss: Decimal = Field(..., description="Unrealized profit/loss")
    unrealized_gain_loss_percent: Decimal = Field(..., description="Unrealized profit/loss percentage")


class PortfolioStatementResponse(BaseModel):
    """Response model for parsed portfolio statement"""
    client_info: ClientInfo
    holdings: List[HoldingItem] = Field(default_factory=list)
    total_portfolio_value: Decimal = Field(..., description="Total portfolio value")
    total_unrealized_gain_loss: Decimal = Field(..., description="Total unrealized gain/loss")


class BulkHoldingsSaveRequest(BaseModel):
    """Request model for bulk saving holdings"""
    client_info: ClientInfo
    holdings: List[HoldingItem]
    total_portfolio_value: Decimal
    total_unrealized_gain_loss: Decimal


class BulkHoldingsSaveResponse(BaseModel):
    """Response model after saving holdings"""
    success: bool
    message: str
    added_count: int = Field(default=0, description="Number of holdings added")
    updated_count: int = Field(default=0, description="Number of holdings updated")
    portfolio_id: UUID
    warnings: List[str] = Field(default_factory=list, description="Any warnings during save")


class ParsedStatementData(BaseModel):
    """Internal model for parsed statement data before validation"""
    raw_text: str
    client_info: Optional[ClientInfo] = None
    holdings: List[dict] = Field(default_factory=list)
    parsing_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    parsing_warnings: List[str] = Field(default_factory=list)

