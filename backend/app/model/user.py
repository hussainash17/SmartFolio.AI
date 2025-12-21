import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

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
    from .trading_idea import TradingIdea, IdeaComment, IdeaLike, UserFollow, SymbolFollow


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
    HOME_PURCHASE = "HOME_PURCHASE"
    VACATION = "VACATION"
    EMERGENCY_FUND = "EMERGENCY_FUND"
    WEDDING = "WEDDING"
    VEHICLE_PURCHASE = "VEHICLE_PURCHASE"
    BUSINESS_STARTUP = "BUSINESS_STARTUP"


class RiskAppetite(str, Enum):
    """Risk tolerance levels"""
    CONSERVATIVE = "CONSERVATIVE"
    MODERATE = "MODERATE"
    AGGRESSIVE = "AGGRESSIVE"


class GoalTrackingStatus(str, Enum):
    """Goal progress tracking status"""
    ON_TRACK = "ON_TRACK"
    BEHIND = "BEHIND"
    AHEAD = "AHEAD"
    AT_RISK = "AT_RISK"


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


# Investment Goals Model - Enhanced for comprehensive goal tracking
class UserInvestmentGoal(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    
    # Basic Goal Information
    goal_type: InvestmentGoal
    target_amount: float | None = Field(default=None, description="Target amount to achieve")
    target_date: datetime | None = Field(default=None, index=True, description="Target completion date")
    priority: int = Field(default=1, description="Priority level (1=highest)")
    description: str | None = Field(default=None, max_length=500)
    is_active: bool = Field(default=True)
    
    # Financial Planning Fields
    current_savings: float | None = Field(default=None, description="Current amount saved towards goal")
    risk_appetite: RiskAppetite | None = Field(default=None, index=True, description="Risk tolerance level")
    monthly_sip_required: float | None = Field(default=None, description="Calculated monthly SIP required")
    current_monthly_sip: float | None = Field(default=None, description="Actual current monthly SIP")
    
    # Asset Allocation (percentages)
    equity_allocation: float | None = Field(default=None, description="Recommended equity %")
    debt_allocation: float | None = Field(default=None, description="Recommended debt %")
    gold_allocation: float | None = Field(default=None, description="Recommended gold %")
    cash_allocation: float | None = Field(default=None, description="Recommended cash %")
    
    # Return Expectations (annual percentages)
    expected_return_min: float | None = Field(default=None, description="Expected minimum return % p.a.")
    expected_return_max: float | None = Field(default=None, description="Expected maximum return % p.a.")
    expected_return_avg: float | None = Field(default=None, description="Expected average return % p.a.")
    
    # Goal Achievement Metrics
    probability_achievement: float | None = Field(default=None, description="Probability of achieving goal (0-100%)")
    projected_final_value: float | None = Field(default=None, description="Projected value at target date")
    
    # Portfolio Linking
    linked_portfolio_id: uuid.UUID | None = Field(default=None, foreign_key="portfolio.id", index=True, description="Linked portfolio")
    
    # Auto-Rebalancing
    auto_rebalance_enabled: bool = Field(default=False, index=True, description="Enable auto-rebalancing")
    rebalance_threshold: float | None = Field(default=5.0, description="Rebalance threshold %")
    last_rebalance_date: datetime | None = Field(default=None)
    next_rebalance_date: datetime | None = Field(default=None)
    
    # Tracking Fields
    current_value: float | None = Field(default=None, description="Current total value")
    total_contributions: float | None = Field(default=None, description="Sum of all contributions")
    total_returns: float | None = Field(default=None, description="Total returns generated")
    last_reviewed_date: datetime | None = Field(default=None)
    
    # Progress Metrics
    progress_percentage: float | None = Field(default=None, description="Progress (0-100%)")
    on_track_status: GoalTrackingStatus | None = Field(default=None, index=True, description="Tracking status")
    shortfall_amount: float | None = Field(default=None, description="Amount short of target")
    
    # Milestone Tracking (JSON field)
    milestones: dict = Field(default_factory=dict, sa_column=Column(JSON), description="Achievement milestones")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="investment_goals")
    linked_portfolio: Optional["Portfolio"] = Relationship(sa_relationship_kwargs={"foreign_keys": "[UserInvestmentGoal.linked_portfolio_id]"})
    contributions: list["UserInvestmentGoalContribution"] = Relationship(back_populates="goal", sa_relationship_kwargs={"cascade": "all, delete"})
    linked_assets: list["GoalLinkedAsset"] = Relationship(back_populates="goal", sa_relationship_kwargs={"cascade": "all, delete"})


# Investment Goal Contributions Model
class UserInvestmentGoalContribution(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    goal_id: uuid.UUID = Field(foreign_key="userinvestmentgoal.id", index=True)
    
    amount: float = Field(description="Contribution amount")
    contributed_at: datetime = Field(default_factory=datetime.utcnow, description="Contribution date")
    notes: str | None = Field(default=None, max_length=500, description="Optional notes")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: "User" = Relationship(back_populates="goal_contributions")
    goal: "UserInvestmentGoal" = Relationship(back_populates="contributions")


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
    goal_contributions: list["UserInvestmentGoalContribution"] = Relationship(back_populates="user",
                                                                               sa_relationship_kwargs={"cascade": "all, delete"})
    accounts: list["UserAccount"] = Relationship(back_populates="user",
                                                 sa_relationship_kwargs={"cascade": "all, delete"})
    linked_assets: list["GoalLinkedAsset"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete"})

    # Trading Ideas relationships
    trading_ideas: list["TradingIdea"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete"})
    idea_comments: list["IdeaComment"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete"})
    idea_likes: list["IdeaLike"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete"})
    followers: list["UserFollow"] = Relationship(
        sa_relationship_kwargs={"primaryjoin": "UserFollow.followed_id == User.id", "cascade": "all, delete"},
        back_populates="followed"
    )
    following: list["UserFollow"] = Relationship(
        sa_relationship_kwargs={"primaryjoin": "UserFollow.follower_id == User.id", "cascade": "all, delete"},
        back_populates="follower"
    )
    symbol_follows: list["SymbolFollow"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete"})


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


# Investment Goals Pydantic models - Enhanced
class UserInvestmentGoalBase(SQLModel):
    goal_type: InvestmentGoal
    target_amount: float | None = None
    target_date: datetime | None = None
    priority: int = 1
    description: str | None = None
    is_active: bool = True
    
    # Financial planning fields
    current_savings: float | None = None
    risk_appetite: RiskAppetite | None = None
    current_monthly_sip: float | None = None
    
    # Portfolio linking
    linked_portfolio_id: uuid.UUID | None = None
    
    # Auto-rebalancing
    auto_rebalance_enabled: bool = False
    rebalance_threshold: float | None = 5.0


class UserInvestmentGoalCreate(UserInvestmentGoalBase):
    """Create a new investment goal"""
    pass


class UserInvestmentGoalUpdate(SQLModel):
    """Update an existing investment goal"""
    goal_type: InvestmentGoal | None = None
    target_amount: float | None = None
    target_date: datetime | None = None
    priority: int | None = None
    description: str | None = None
    is_active: bool | None = None
    current_savings: float | None = None
    risk_appetite: RiskAppetite | None = None
    current_monthly_sip: float | None = None
    linked_portfolio_id: uuid.UUID | None = None
    auto_rebalance_enabled: bool | None = None
    rebalance_threshold: float | None = None


class UserInvestmentGoalPublic(UserInvestmentGoalBase):
    """Public-facing investment goal data"""
    id: uuid.UUID
    user_id: uuid.UUID
    
    # Calculated fields
    monthly_sip_required: float | None = None
    equity_allocation: float | None = None
    debt_allocation: float | None = None
    gold_allocation: float | None = None
    cash_allocation: float | None = None
    expected_return_min: float | None = None
    expected_return_max: float | None = None
    expected_return_avg: float | None = None
    probability_achievement: float | None = None
    projected_final_value: float | None = None
    
    # Tracking fields
    current_value: float | None = None
    total_contributions: float | None = None
    total_returns: float | None = None
    progress_percentage: float | None = None
    on_track_status: GoalTrackingStatus | None = None
    shortfall_amount: float | None = None
    
    # Rebalancing
    last_rebalance_date: datetime | None = None
    next_rebalance_date: datetime | None = None
    last_reviewed_date: datetime | None = None
    
    # Milestones
    milestones: dict = {}
    
    # Linked Assets Summary
    linked_assets_value: float | None = None
    linked_assets_count: int | None = None
    
    created_at: datetime
    updated_at: datetime


# Contribution Pydantic models
class UserInvestmentGoalContributionBase(SQLModel):
    amount: float
    contributed_at: datetime | None = None
    notes: str | None = None


class UserInvestmentGoalContributionCreate(UserInvestmentGoalContributionBase):
    """Create a new goal contribution"""
    pass


class UserInvestmentGoalContributionPublic(UserInvestmentGoalContributionBase):
    """Public-facing contribution data"""
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


# Advanced Investment Goal Response Models

class AssetAllocationRecommendation(SQLModel):
    """Asset allocation recommendation for a goal"""
    equity_percent: float
    debt_percent: float
    gold_percent: float
    cash_percent: float
    rationale: str
    risk_level: RiskAppetite


class SIPCalculationResult(SQLModel):
    """SIP calculation response"""
    monthly_sip_required: float
    total_investment: float
    expected_final_value: float
    expected_returns: float
    time_period_months: int
    probability_of_success: float
    

class GoalProgressResponse(SQLModel):
    """Detailed goal progress information"""
    goal_id: uuid.UUID
    goal_name: str
    current_value: float
    target_amount: float
    progress_percentage: float
    on_track_status: GoalTrackingStatus
    shortfall_amount: float
    total_contributions: float
    total_returns: float
    months_remaining: int
    projected_final_value: float
    recommended_action: str | None = None


class WhatIfScenarioRequest(SQLModel):
    """What-if scenario input parameters"""
    additional_monthly_investment: float | None = None
    delay_months: int | None = None
    return_adjustment: float | None = None  # e.g., -1.0 for 1% lower returns


class WhatIfScenarioResponse(SQLModel):
    """What-if scenario calculation results"""
    scenario_description: str
    new_monthly_sip: float
    new_projected_value: float
    new_probability: float
    impact_on_goal: str
    recommendation: str


class ProductRecommendation(SQLModel):
    """Investment product recommendation"""
    product_type: str  # MUTUAL_FUND, ETF, STOCK, BOND, FD
    product_name: str
    ticker: str | None = None
    allocation_percent: float
    expected_return: float
    risk_level: str
    rationale: str
    

class ProductRecommendationResponse(SQLModel):
    """List of product recommendations for a goal"""
    goal_id: uuid.UUID
    recommendations: list[ProductRecommendation]
    total_allocation: float
    diversification_score: float


class GoalAlert(SQLModel):
    """Goal-related alert"""
    alert_type: str  # DRIFT, MILESTONE, REVIEW_DUE, REBALANCE_NEEDED
    severity: str  # INFO, WARNING, CRITICAL
    message: str
    action_required: str | None = None
    created_at: datetime


class GoalAlertResponse(SQLModel):
    """List of alerts for a goal"""
    goal_id: uuid.UUID
    alerts: list[GoalAlert]
    total_alerts: int


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


class AllocationType(str, Enum):
    """Type of asset allocation"""
    QUANTITY = "QUANTITY"
    PERCENTAGE = "PERCENTAGE"


class GoalLinkedAsset(SQLModel, table=True):
    """Asset linked to an investment goal (Soft Linking)"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    goal_id: uuid.UUID = Field(foreign_key="userinvestmentgoal.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    
    # Asset details
    symbol: str = Field(index=True)
    company_name: str | None = None
    
    # Allocation details
    allocation_type: AllocationType
    allocation_value: float = Field(description="Quantity or Percentage value")
    
    # Calculated values
    linked_quantity: float = Field(description="Actual number of shares linked")
    current_value: float = Field(default=0.0, description="Current market value of linked portion")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    goal: "UserInvestmentGoal" = Relationship(back_populates="linked_assets")
    user: "User" = Relationship(back_populates="linked_assets")


class GoalLinkedAssetCreate(SQLModel):
    symbol: str
    allocation_type: AllocationType
    allocation_value: float


class GoalLinkedAssetPublic(SQLModel):
    id: uuid.UUID
    goal_id: uuid.UUID
    symbol: str
    company_name: str | None = None
    allocation_type: AllocationType
    allocation_value: float
    linked_quantity: float
    current_value: float
    created_at: datetime

