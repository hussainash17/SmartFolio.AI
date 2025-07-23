import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import Column

if TYPE_CHECKING:
    from .user import User


# Subscription Plans
class SubscriptionPlan(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=50)  # Free, Premium
    description: str = Field(max_length=500)
    price: Decimal = Field(max_digits=10, decimal_places=2)
    currency: str = Field(default="BDT", max_length=3)
    duration_days: int = Field(default=30)
    features: dict = Field(default={}, sa_column=Column(JSON))  # JSON field for feature list
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    subscriptions: list["UserSubscription"] = Relationship(back_populates="plan")


# User Subscription
class UserSubscription(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    plan_id: uuid.UUID = Field(foreign_key="subscriptionplan.id")
    status: str = Field(max_length=20)  # active, expired, cancelled, pending
    start_date: datetime = Field(default_factory=datetime.utcnow)
    end_date: datetime
    auto_renew: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: "User" = Relationship(back_populates="subscriptions")
    plan: SubscriptionPlan = Relationship(back_populates="subscriptions")
    payments: list["Payment"] = Relationship(back_populates="subscription")


# Payment Model
class Payment(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    subscription_id: Optional[uuid.UUID] = Field(default=None, foreign_key="usersubscription.id")
    amount: Decimal = Field(max_digits=10, decimal_places=2)
    currency: str = Field(default="BDT", max_length=3)
    payment_method: str = Field(max_length=20)  # bkash, nagad, rocket, etc.
    transaction_id: str = Field(max_length=100, unique=True)
    status: str = Field(max_length=20)  # pending, completed, failed, refunded
    payment_date: datetime = Field(default_factory=datetime.utcnow)
    gateway_response: Optional[dict] = Field(default=None, sa_column=Column(JSON))  # JSON field for gateway response
    notes: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: "User" = Relationship(back_populates="payments")
    subscription: Optional[UserSubscription] = Relationship(back_populates="payments")


# Payment Gateway Configuration
class PaymentGateway(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=50)  # bkash, nagad, rocket
    display_name: str = Field(max_length=100)
    is_active: bool = Field(default=True)
    config: dict = Field(default={}, sa_column=Column(JSON))  # JSON field for gateway configuration
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Pydantic models for API
class SubscriptionPlanBase(SQLModel):
    name: str
    description: str
    price: Decimal
    currency: str = "BDT"
    duration_days: int = 30
    features: dict = {}
    is_active: bool = True


class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass


class SubscriptionPlanUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    currency: Optional[str] = None
    duration_days: Optional[int] = None
    features: Optional[dict] = None
    is_active: Optional[bool] = None


class SubscriptionPlanPublic(SubscriptionPlanBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class UserSubscriptionBase(SQLModel):
    status: str
    start_date: datetime
    end_date: datetime
    auto_renew: bool = False


class UserSubscriptionCreate(UserSubscriptionBase):
    plan_id: uuid.UUID


class UserSubscriptionUpdate(SQLModel):
    status: Optional[str] = None
    end_date: Optional[datetime] = None
    auto_renew: Optional[bool] = None


class UserSubscriptionPublic(UserSubscriptionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    plan_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PaymentBase(SQLModel):
    amount: Decimal
    currency: str = "BDT"
    payment_method: str
    transaction_id: str
    status: str
    payment_date: datetime
    gateway_response: Optional[dict] = None
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    subscription_id: Optional[uuid.UUID] = None


class PaymentUpdate(SQLModel):
    status: Optional[str] = None
    gateway_response: Optional[dict] = None
    notes: Optional[str] = None


class PaymentPublic(PaymentBase):
    id: uuid.UUID
    user_id: uuid.UUID
    subscription_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime


class PaymentGatewayBase(SQLModel):
    name: str
    display_name: str
    is_active: bool = True
    config: dict = {}


class PaymentGatewayCreate(PaymentGatewayBase):
    pass


class PaymentGatewayUpdate(SQLModel):
    display_name: Optional[str] = None
    is_active: Optional[bool] = None
    config: Optional[dict] = None


class PaymentGatewayPublic(PaymentGatewayBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# Subscription Status Check
class SubscriptionStatus(SQLModel):
    user_id: uuid.UUID
    current_plan: Optional[str] = None
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool
    features: dict = {}


# Payment Request
class PaymentRequest(SQLModel):
    plan_id: uuid.UUID
    payment_method: str
    amount: Decimal
    currency: str = "BDT"


# Payment Response
class PaymentResponse(SQLModel):
    payment_id: uuid.UUID
    transaction_id: str
    status: str
    gateway_url: Optional[str] = None
    gateway_data: Optional[dict] = None 