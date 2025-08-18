import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from pydantic import EmailStr
from sqlalchemy import JSON, Column
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .item import Item
    from .portfolio import Portfolio, Watchlist
    from .subscription import UserSubscription, Payment
    from .alert import Alert, UserNewsPreference
    from .order import Order
    from .funds import AccountTransaction
    from .risk_management import UserRiskProfile, RiskAlert, StockScreener
    from .funds import AccountTransaction


class AccountType(str, Enum):
    """Types of investment accounts"""
    INDIVIDUAL = "INDIVIDUAL"
    JOINT = "JOINT"
    RETIREMENT_401K = "RETIREMENT_401K"
    RETIREMENT_IRA = "RETIREMENT_IRA"
    RETIREMENT_ROTH_IRA = "RETIREMENT_ROTH_IRA"
    TRUST = "TRUST"
    CORPORATE = "CORPORATE"


class KYCStatus(str, Enum):
    """KYC verification status"""
    PENDING = "PENDING"
    IN_REVIEW = "IN_REVIEW"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class InvestmentGoal(str, Enum):
    """Investment objectives"""
    RETIREMENT = "RETIREMENT"
    EDUCATION = "EDUCATION"
    WEALTH_BUILDING = "WEALTH_BUILDING"
    INCOME_GENERATION = "INCOME_GENERATION"
    CAPITAL_PRESERVATION = "CAPITAL_PRESERVATION"
    SHORT_TERM_GAINS = "SHORT_TERM_GAINS"


# KYC Information Model
class KYCInformation(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")

    # Personal Information
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    date_of_birth: datetime
    ssn_last_four: str = Field(max_length=4, description="Last 4 digits of SSN")
    phone_number: str = Field(max_length=20)

    # Address Information
    street_address: str = Field(max_length=200)
    city: str = Field(max_length=100)
    state: str = Field(max_length=50)
    zip_code: str = Field(max_length=10)
    country: str = Field(max_length=50, default="USA")

    # Employment Information
    employer_name: str | None = Field(default=None, max_length=200)
    occupation: str | None = Field(default=None, max_length=100)
    annual_income: int | None = Field(default=None)
    employment_status: str | None = Field(default=None, max_length=50)

    # Financial Information
    net_worth: int | None = Field(default=None)
    liquid_net_worth: int | None = Field(default=None)
    investment_experience: str | None = Field(default=None, max_length=50)  # BEGINNER, INTERMEDIATE, EXPERIENCED

    # KYC Status
    kyc_status: KYCStatus = Field(default=KYCStatus.PENDING)
    verification_date: datetime | None = Field(default=None)
    expiry_date: datetime | None = Field(default=None)
    rejection_reason: str | None = Field(default=None, max_length=500)

    # Document Information
    documents: dict = Field(default={}, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="kyc_information")


# Investment Goals Model
class UserInvestmentGoal(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    goal_type: InvestmentGoal
    target_amount: int | None = Field(default=None)
    target_date: datetime | None = Field(default=None)
    priority: int = Field(default=1)  # 1 = highest priority
    description: str | None = Field(default=None, max_length=500)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="investment_goals")
    contributions: list["UserInvestmentGoalContribution"] = Relationship(back_populates="goal")


# User Account Model for multiple account types
class UserAccount(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    account_type: AccountType
    account_name: str = Field(max_length=100)
    account_number: str | None = Field(default=None, max_length=50)

    # Joint account information
    joint_holder_name: str | None = Field(default=None, max_length=200)
    joint_holder_ssn: str | None = Field(default=None, max_length=11)

    # Retirement account information
    contribution_limit: int | None = Field(default=None)
    current_year_contributions: int | None = Field(default=None)

    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="accounts")


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=40)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    # Optional credit/margin line available to the user, added to buying power
    credit_limit: float | None = Field(default=0.0)
    items: list["Item"] = Relationship(back_populates="owner", sa_relationship_kwargs={"cascade": "all, delete"})

    # SmartStock relationships
    portfolios: list["Portfolio"] = Relationship(back_populates="user",
                                                 sa_relationship_kwargs={"cascade": "all, delete"})
    watchlists: list["Watchlist"] = Relationship(back_populates="user",
                                                 sa_relationship_kwargs={"cascade": "all, delete"})
    subscriptions: list["UserSubscription"] = Relationship(back_populates="user",
                                                           sa_relationship_kwargs={"cascade": "all, delete"})
    payments: list["Payment"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete"})
    alerts: list["Alert"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete"})
    news_preferences: list["UserNewsPreference"] = Relationship(back_populates="user",
                                                                sa_relationship_kwargs={"cascade": "all, delete"})
    orders: list["Order"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete"})
    risk_profile: "UserRiskProfile" = Relationship(back_populates="user",
                                                   sa_relationship_kwargs={"cascade": "all, delete"})
    risk_alerts: list["RiskAlert"] = Relationship(back_populates="user",
                                                  sa_relationship_kwargs={"cascade": "all, delete"})
    stock_screeners: list["StockScreener"] = Relationship(back_populates="user",
                                                          sa_relationship_kwargs={"cascade": "all, delete"})
    transactions: list["AccountTransaction"] = Relationship(back_populates="user",
                                                            sa_relationship_kwargs={"cascade": "all, delete"})

    # KYC and Account Management relationships
    kyc_information: "KYCInformation" = Relationship(back_populates="user",
                                                     sa_relationship_kwargs={"cascade": "all, delete"})
    investment_goals: list["UserInvestmentGoal"] = Relationship(back_populates="user",
                                                                sa_relationship_kwargs={"cascade": "all, delete"})
    accounts: list["UserAccount"] = Relationship(back_populates="user",
                                                 sa_relationship_kwargs={"cascade": "all, delete"})


# KYC Pydantic models for API
class KYCInformationBase(SQLModel):
    first_name: str
    last_name: str
    date_of_birth: datetime
    ssn_last_four: str
    phone_number: str
    street_address: str
    city: str
    state: str
    zip_code: str
    country: str = "USA"
    employer_name: str | None = None
    occupation: str | None = None
    annual_income: int | None = None
    employment_status: str | None = None
    net_worth: int | None = None
    liquid_net_worth: int | None = None
    investment_experience: str | None = None


class KYCInformationCreate(KYCInformationBase):
    pass


class KYCInformationUpdate(SQLModel):
    first_name: str | None = None
    last_name: str | None = None
    date_of_birth: datetime | None = None
    phone_number: str | None = None
    street_address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    country: str | None = None
    employer_name: str | None = None
    occupation: str | None = None
    annual_income: int | None = None
    employment_status: str | None = None
    net_worth: int | None = None
    liquid_net_worth: int | None = None
    investment_experience: str | None = None


class KYCInformationPublic(KYCInformationBase):
    id: uuid.UUID
    kyc_status: KYCStatus
    verification_date: datetime | None = None
    created_at: datetime
    updated_at: datetime


# Investment Goals Pydantic models
class UserInvestmentGoalBase(SQLModel):
    goal_type: InvestmentGoal
    target_amount: int | None = None
    target_date: datetime | None = None
    priority: int = 1
    description: str | None = None
    is_active: bool = True


class UserInvestmentGoalCreate(UserInvestmentGoalBase):
    pass


class UserInvestmentGoalUpdate(SQLModel):
    goal_type: InvestmentGoal | None = None
    target_amount: int | None = None
    target_date: datetime | None = None
    priority: int | None = None
    description: str | None = None
    is_active: bool | None = None


class UserInvestmentGoalPublic(UserInvestmentGoalBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# Contribution Pydantic models
class UserInvestmentGoalContributionBase(SQLModel):
    amount: int
    contributed_at: datetime | None = None
    notes: str | None = None


class UserInvestmentGoalContributionCreate(UserInvestmentGoalContributionBase):
    pass


class UserInvestmentGoalContributionPublic(UserInvestmentGoalContributionBase):
    id: uuid.UUID
    goal_id: uuid.UUID
    user_id: uuid.UUID
    contributed_at: datetime
    created_at: datetime


# User Account Pydantic models for API
class UserAccountBase(SQLModel):
    account_type: AccountType
    account_name: str
    account_number: str | None = None
    joint_holder_name: str | None = None
    joint_holder_ssn: str | None = None


class UserAccountCreate(UserAccountBase):
    pass


class UserAccountUpdate(SQLModel):
    account_name: str | None = None
    account_number: str | None = None
    is_active: bool | None = None


class UserAccountPublic(UserAccountBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)
