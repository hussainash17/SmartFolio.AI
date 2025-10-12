"""
Fundamental data models for company financial information
"""
import uuid
import datetime as dt
from decimal import Decimal
from typing import Optional
from sqlmodel import Field, SQLModel, Relationship


# Dividend Information
class DividendInformation(SQLModel, table=True):
    """Dividend information for companies"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    company_id: uuid.UUID = Field(foreign_key="company.id", index=True)
    year: int = Field(index=True)
    
    cash_dividend: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    stock_dividend: Optional[str] = Field(default=None, max_length=50)
    right_issue: Optional[str] = Field(default=None, max_length=250)
    nav: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    yield_percentage: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=4)
    
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)
    updated_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)


class DividendInformationBase(SQLModel):
    """Base model for dividend information"""
    company_id: uuid.UUID
    year: int
    cash_dividend: Optional[Decimal] = None
    stock_dividend: Optional[str] = None
    right_issue: Optional[str] = None
    nav: Optional[Decimal] = None
    yield_percentage: Optional[Decimal] = None


class DividendInformationCreate(DividendInformationBase):
    """Create model for dividend information"""
    pass


class DividendInformationUpdate(SQLModel):
    """Update model for dividend information"""
    year: Optional[int] = None
    cash_dividend: Optional[Decimal] = None
    stock_dividend: Optional[str] = None
    right_issue: Optional[str] = None
    nav: Optional[Decimal] = None
    yield_percentage: Optional[Decimal] = None


class DividendInformationPublic(DividendInformationBase):
    """Public model for dividend information"""
    id: uuid.UUID
    created_at: dt.datetime
    updated_at: dt.datetime


# Financial Performance
class FinancialPerformance(SQLModel, table=True):
    """Annual financial performance metrics"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    company_id: uuid.UUID = Field(foreign_key="company.id", index=True)
    year: int = Field(index=True)
    
    eps_basic: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    eps_diluted: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    nav_per_share: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    profit: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    total_comprehensive_income: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    pe_ratio: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=4)
    pb_ratio: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=4)
    
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)
    updated_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)


class FinancialPerformanceBase(SQLModel):
    """Base model for financial performance"""
    company_id: uuid.UUID
    year: int
    eps_basic: Optional[Decimal] = None
    eps_diluted: Optional[Decimal] = None
    nav_per_share: Optional[Decimal] = None
    profit: Optional[Decimal] = None
    total_comprehensive_income: Optional[Decimal] = None
    pe_ratio: Optional[Decimal] = None
    pb_ratio: Optional[Decimal] = None


class FinancialPerformanceCreate(FinancialPerformanceBase):
    """Create model for financial performance"""
    pass


class FinancialPerformanceUpdate(SQLModel):
    """Update model for financial performance"""
    year: Optional[int] = None
    eps_basic: Optional[Decimal] = None
    eps_diluted: Optional[Decimal] = None
    nav_per_share: Optional[Decimal] = None
    profit: Optional[Decimal] = None
    total_comprehensive_income: Optional[Decimal] = None
    pe_ratio: Optional[Decimal] = None
    pb_ratio: Optional[Decimal] = None


class FinancialPerformancePublic(FinancialPerformanceBase):
    """Public model for financial performance"""
    id: uuid.UUID
    created_at: dt.datetime
    updated_at: dt.datetime


# Quarterly Performance
class QuarterlyPerformance(SQLModel, table=True):
    """Quarterly performance metrics"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    company_id: uuid.UUID = Field(foreign_key="company.id", index=True)
    quarter: str = Field(max_length=20)  # 'Q1', 'Q2', 'Q3', 'Half Yearly', '9 Months', 'Annual'
    date: dt.date = Field(index=True)
    
    eps_basic: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    eps_diluted: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    market_price_end_period: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)
    updated_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)


class QuarterlyPerformanceBase(SQLModel):
    """Base model for quarterly performance"""
    company_id: uuid.UUID
    quarter: str
    date: dt.date
    eps_basic: Optional[Decimal] = None
    eps_diluted: Optional[Decimal] = None
    market_price_end_period: Optional[Decimal] = None


class QuarterlyPerformanceCreate(QuarterlyPerformanceBase):
    """Create model for quarterly performance"""
    pass


class QuarterlyPerformanceUpdate(SQLModel):
    """Update model for quarterly performance"""
    quarter: Optional[str] = None
    date: Optional[dt.date] = None
    eps_basic: Optional[Decimal] = None
    eps_diluted: Optional[Decimal] = None
    market_price_end_period: Optional[Decimal] = None


class QuarterlyPerformancePublic(QuarterlyPerformanceBase):
    """Public model for quarterly performance"""
    id: uuid.UUID
    created_at: dt.datetime
    updated_at: dt.datetime


# Shareholding Pattern
class ShareholdingPattern(SQLModel, table=True):
    """Shareholding pattern information"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    company_id: uuid.UUID = Field(foreign_key="company.id", index=True)
    date: dt.date = Field(index=True)
    
    sponsor_director: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=4)
    government: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=4)
    institute: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=4)
    foreign_holder: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=4)
    public_holder: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=4)
    
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)
    updated_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)


class ShareholdingPatternBase(SQLModel):
    """Base model for shareholding pattern"""
    company_id: uuid.UUID
    date: dt.date
    sponsor_director: Optional[Decimal] = None
    government: Optional[Decimal] = None
    institute: Optional[Decimal] = None
    foreign_holder: Optional[Decimal] = None
    public_holder: Optional[Decimal] = None


class ShareholdingPatternCreate(ShareholdingPatternBase):
    """Create model for shareholding pattern"""
    pass


class ShareholdingPatternUpdate(SQLModel):
    """Update model for shareholding pattern"""
    date: Optional[dt.date] = None
    sponsor_director: Optional[Decimal] = None
    government: Optional[Decimal] = None
    institute: Optional[Decimal] = None
    foreign_holder: Optional[Decimal] = None
    public_holder: Optional[Decimal] = None


class ShareholdingPatternPublic(ShareholdingPatternBase):
    """Public model for shareholding pattern"""
    id: uuid.UUID
    created_at: dt.datetime
    updated_at: dt.datetime


# Loan Status
class LoanStatus(SQLModel, table=True):
    """Company loan status information"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    company_id: uuid.UUID = Field(foreign_key="company.id", index=True, unique=True)
    
    short_term_loan: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    long_term_loan: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    # Note: total_loan is a generated column in the database
    total_loan: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)
    updated_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)


class LoanStatusBase(SQLModel):
    """Base model for loan status"""
    company_id: uuid.UUID
    short_term_loan: Optional[Decimal] = None
    long_term_loan: Optional[Decimal] = None


class LoanStatusCreate(LoanStatusBase):
    """Create model for loan status"""
    pass


class LoanStatusUpdate(SQLModel):
    """Update model for loan status"""
    short_term_loan: Optional[Decimal] = None
    long_term_loan: Optional[Decimal] = None


class LoanStatusPublic(LoanStatusBase):
    """Public model for loan status"""
    id: uuid.UUID
    total_loan: Optional[Decimal] = None
    created_at: dt.datetime
    updated_at: dt.datetime


# Scraper Log
class ScraperLog(SQLModel, table=True):
    """Log for scraper operations"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    scraper_type: str = Field(max_length=50, index=True)  # 'REALTIME', 'FUNDAMENTAL', 'COMPANY_LIST'
    status: str = Field(max_length=20)  # 'SUCCESS', 'FAILED', 'PARTIAL'
    companies_processed: Optional[int] = None
    companies_failed: Optional[int] = None
    error_message: Optional[str] = None
    host_ip: Optional[str] = Field(default=None, max_length=50)
    started_at: dt.datetime = Field(index=True)
    completed_at: Optional[dt.datetime] = None
    duration_seconds: Optional[int] = None


class ScraperLogBase(SQLModel):
    """Base model for scraper log"""
    scraper_type: str
    status: str
    companies_processed: Optional[int] = None
    companies_failed: Optional[int] = None
    error_message: Optional[str] = None
    host_ip: Optional[str] = None
    started_at: dt.datetime
    completed_at: Optional[dt.datetime] = None
    duration_seconds: Optional[int] = None


class ScraperLogCreate(ScraperLogBase):
    """Create model for scraper log"""
    pass


class ScraperLogUpdate(SQLModel):
    """Update model for scraper log"""
    status: Optional[str] = None
    companies_processed: Optional[int] = None
    companies_failed: Optional[int] = None
    error_message: Optional[str] = None
    completed_at: Optional[dt.datetime] = None
    duration_seconds: Optional[int] = None


class ScraperLogPublic(ScraperLogBase):
    """Public model for scraper log"""
    id: uuid.UUID

