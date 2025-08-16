import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .portfolio import Portfolio
    from .stock import StockCompany
    from .user import User


class OrderType(str, Enum):
    """Types of orders"""
    MARKET = "MARKET"  # Market order - execute at current market price
    LIMIT = "LIMIT"    # Limit order - execute at specified price or better
    STOP = "STOP"      # Stop order - becomes market order when price hits stop level
    STOP_LIMIT = "STOP_LIMIT"  # Stop limit order - becomes limit order when price hits stop level


class OrderSide(str, Enum):
    """Order side (buy/sell)"""
    BUY = "BUY"
    SELL = "SELL"


class OrderStatus(str, Enum):
    """Order status"""
    PENDING = "PENDING"           # Order is pending execution
    PARTIAL = "PARTIAL"           # Order partially filled
    FILLED = "FILLED"            # Order completely filled
    CANCELLED = "CANCELLED"       # Order cancelled by user
    REJECTED = "REJECTED"         # Order rejected by exchange
    EXPIRED = "EXPIRED"           # Order expired
    PENDING_CANCEL = "PENDING_CANCEL"  # Cancellation request pending


class OrderValidity(str, Enum):
    """Order validity period"""
    DAY = "DAY"           # Valid for current trading day
    GTC = "GTC"           # Good Till Cancelled
    IOC = "IOC"           # Immediate or Cancel
    FOK = "FOK"           # Fill or Kill


# Main Order Model
class Order(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    portfolio_id: Optional[uuid.UUID] = Field(default=None, foreign_key="portfolio.id")
    stock_id: uuid.UUID = Field(foreign_key="stockcompany.id")
    
    # Order details
    order_type: OrderType = Field(max_length=20)
    side: OrderSide = Field(max_length=10)
    quantity: int = Field(gt=0)
    price: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    stop_price: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    
    # Order status
    status: OrderStatus = Field(default=OrderStatus.PENDING, max_length=20)
    validity: OrderValidity = Field(default=OrderValidity.DAY, max_length=10)
    
    # Execution details
    filled_quantity: int = Field(default=0)
    average_price: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    total_amount: Optional[Decimal] = Field(default=None, max_digits=15, decimal_places=2)
    commission: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    net_amount: Optional[Decimal] = Field(default=None, max_digits=15, decimal_places=2)
    
    # Timestamps
    placed_at: datetime = Field(default_factory=datetime.utcnow)
    filled_at: Optional[datetime] = Field(default=None)
    cancelled_at: Optional[datetime] = Field(default=None)
    expires_at: Optional[datetime] = Field(default=None)
    
    # Additional info
    exchange_order_id: Optional[str] = Field(default=None, max_length=100)
    rejection_reason: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = Field(default=None, max_length=500)
    is_simulated: bool = Field(default=False)  # For paper trading
    
    # Relationships
    user: "User" = Relationship(back_populates="orders")
    portfolio: Optional["Portfolio"] = Relationship(back_populates="orders")
    stock: "StockCompany" = Relationship(back_populates="orders")
    executions: list["OrderExecution"] = Relationship(back_populates="order")


# Order Execution Model (for partial fills)
class OrderExecution(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    order_id: uuid.UUID = Field(foreign_key="order.id")
    
    # Execution details
    quantity: int = Field(gt=0)
    price: Decimal = Field(max_digits=10, decimal_places=2)
    amount: Decimal = Field(max_digits=15, decimal_places=2)
    commission: Decimal = Field(max_digits=10, decimal_places=2, default=0)
    net_amount: Decimal = Field(max_digits=15, decimal_places=2)
    
    # Timestamps
    executed_at: datetime = Field(default_factory=datetime.utcnow)
    exchange_trade_id: Optional[str] = Field(default=None, max_length=100)
    
    # Relationships
    order: Order = Relationship(back_populates="executions")


# Pydantic models for API
class OrderBase(SQLModel):
    order_type: OrderType
    side: OrderSide
    quantity: int
    price: Optional[Decimal] = None
    stop_price: Optional[Decimal] = None
    validity: OrderValidity = OrderValidity.DAY
    notes: Optional[str] = None
    is_simulated: bool = False


class OrderCreate(OrderBase):
    stock_id: uuid.UUID
    portfolio_id: Optional[uuid.UUID] = None


class OrderUpdate(SQLModel):
    price: Optional[Decimal] = None
    stop_price: Optional[Decimal] = None
    quantity: Optional[int] = None
    validity: Optional[OrderValidity] = None
    notes: Optional[str] = None


class OrderPublic(OrderBase):
    id: uuid.UUID
    user_id: uuid.UUID
    portfolio_id: Optional[uuid.UUID]
    stock_id: uuid.UUID
    status: OrderStatus
    filled_quantity: int
    average_price: Optional[Decimal]
    total_amount: Optional[Decimal]
    commission: Optional[Decimal]
    net_amount: Optional[Decimal]
    placed_at: datetime
    filled_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    expires_at: Optional[datetime]
    exchange_order_id: Optional[str]
    rejection_reason: Optional[str]


class OrderExecutionBase(SQLModel):
    quantity: int
    price: Decimal
    amount: Decimal
    commission: Decimal
    net_amount: Decimal
    executed_at: datetime
    exchange_trade_id: Optional[str]


class OrderExecutionPublic(OrderExecutionBase):
    id: uuid.UUID
    order_id: uuid.UUID


# Order Summary
class OrderSummary(SQLModel):
    total_orders: int
    pending_orders: int
    filled_orders: int
    cancelled_orders: int
    rejected_orders: int
    total_volume: int
    total_amount: Decimal
    orders: list[OrderPublic]


# Order Book Entry (for market depth)
class OrderBookEntry(SQLModel):
    price: Decimal
    quantity: int
    orders_count: int


# Market Depth
class MarketDepth(SQLModel):
    stock_id: uuid.UUID
    stock_symbol: str
    bids: list[OrderBookEntry]  # Buy orders
    asks: list[OrderBookEntry]  # Sell orders
    timestamp: datetime 


class OrderWithDetails(OrderPublic):
    """Public order payload with stock details for UI convenience"""
    symbol: str
    company_name: str 