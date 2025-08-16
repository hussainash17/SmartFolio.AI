from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from .user import User
if TYPE_CHECKING:
	from .portfolio import Portfolio
	from .order import Order
	from .trade import Trade


class TransactionType(str, Enum):
	DEPOSIT = "DEPOSIT"
	WITHDRAWAL = "WITHDRAWAL"
	BUY = "BUY"
	SELL = "SELL"
	ORDER_PLACED = "ORDER_PLACED"
	ORDER_CANCELLED = "ORDER_CANCELLED"
	DIVIDEND = "DIVIDEND"
	FEE = "FEE"
	ADJUSTMENT = "ADJUSTMENT"


class AccountTransaction(SQLModel, table=True):
	id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
	user_id: uuid.UUID = Field(foreign_key="user.id")
	portfolio_id: Optional[uuid.UUID] = Field(default=None, foreign_key="portfolio.id")
	order_id: Optional[uuid.UUID] = Field(default=None, foreign_key="order.id")
	trade_id: Optional[uuid.UUID] = Field(default=None, foreign_key="trade.id")
	type: TransactionType = Field(max_length=30)
	amount: Decimal = Field(max_digits=15, decimal_places=2)
	currency: str = Field(default="USD", max_length=10)
	description: Optional[str] = Field(default=None, max_length=500)
	created_at: datetime = Field(default_factory=datetime.utcnow)

	# Relationships (optional backrefs)
	user: "User" = Relationship(back_populates="transactions")
	portfolio: Optional["Portfolio"] = Relationship()
	order: Optional["Order"] = Relationship()
	trade: Optional["Trade"] = Relationship()


# Public API schemas if needed later
class AccountTransactionPublic(SQLModel):
	id: uuid.UUID
	type: TransactionType
	amount: Decimal
	currency: str
	description: Optional[str]
	created_at: datetime
	portfolio_id: Optional[uuid.UUID]
	order_id: Optional[uuid.UUID]
	trade_id: Optional[uuid.UUID]