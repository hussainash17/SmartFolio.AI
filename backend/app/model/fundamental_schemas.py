"""
Pydantic schemas for Fundamental Analysis API responses
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID


# ============================================================================
# 1. Company Basic Info API Response
# ============================================================================
class ContactInfo(BaseModel):
    """Company contact information"""
    company_secretary: Optional[str] = None
    email: Optional[str] = None
    cell: Optional[str] = None


class Week52Range(BaseModel):
    """52-week price range"""
    low: Optional[Decimal] = None
    high: Optional[Decimal] = None


class CompanyBasicInfo(BaseModel):
    """Company basic information for fundamental analysis"""
    trading_code: str
    company_name: Optional[str] = None
    category: Optional[str] = None
    sector: Optional[str] = None
    listing_year: Optional[int] = None
    head_office: Optional[str] = None
    factory: Optional[str] = None
    contact: ContactInfo
    website: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================================
# 2. Market Summary API Response
# ============================================================================
class MarketSummary(BaseModel):
    """Market summary and valuation metrics"""
    ltp: Optional[Decimal] = Field(None, description="Last Trading Price")
    ltp_change: Optional[Decimal] = Field(None, description="Price change")
    ycp: Optional[Decimal] = Field(None, description="Yesterday's Closing Price")
    current_pe: Optional[Decimal] = Field(None, description="Current P/E ratio")
    audited_pe: Optional[Decimal] = Field(None, description="Audited P/E ratio")
    dividend_yield: Optional[Decimal] = Field(None, description="Dividend yield %")
    nav: Optional[Decimal] = Field(None, description="Net Asset Value per share")
    face_value: Optional[Decimal] = Field(None, description="Face value per share")
    market_cap: Optional[Decimal] = Field(None, description="Market capitalization in millions")
    paid_up_capital: Optional[Decimal] = Field(None, description="Paid-up capital in millions")
    authorized_capital: Optional[Decimal] = Field(None, description="Authorized capital in millions")
    reserve_and_surplus: Optional[Decimal] = Field(None, description="Reserve and surplus in millions")
    year_end: Optional[str] = Field(None, description="Financial year end date")
    last_agm: Optional[str] = Field(None, description="Last AGM date")
    week_52_range: Week52Range

    class Config:
        from_attributes = True


# ============================================================================
# 3. Shareholding Pattern API Response
# ============================================================================
class ShareholdingChange(BaseModel):
    """Shareholding pattern changes"""
    foreign: Optional[Decimal] = None
    public: Optional[Decimal] = None


class ShareholdingPattern(BaseModel):
    """Shareholding distribution"""
    date: date
    director: Optional[Decimal] = Field(None, description="Sponsor/Director %")
    govt: Optional[Decimal] = Field(None, description="Government %")
    institute: Optional[Decimal] = Field(None, description="Institute %")
    foreign: Optional[Decimal] = Field(None, description="Foreign %")
    public: Optional[Decimal] = Field(None, description="Public %")
    change: Optional[ShareholdingChange] = None

    class Config:
        from_attributes = True


# ============================================================================
# 4. Earnings & Profit API Response
# ============================================================================
class QuarterlyEarnings(BaseModel):
    """Quarterly earnings data"""
    quarter: str
    prev_year_eps: Optional[Decimal] = None
    current_year_eps: Optional[Decimal] = None
    growth_percent: Optional[Decimal] = None
    period: str


class AnnualEarnings(BaseModel):
    """Annual earnings summary"""
    prev_year_eps: Optional[Decimal] = None
    current_year_eps: Optional[Decimal] = None
    growth_percent: Optional[Decimal] = None
    profit_million: Optional[Decimal] = None


class EarningsProfitResponse(BaseModel):
    """Complete earnings and profit response"""
    quarters: List[QuarterlyEarnings] = []
    annual: Optional[AnnualEarnings] = None

    class Config:
        from_attributes = True


# ============================================================================
# 5. Financial Health API Response
# ============================================================================
class FinancialHealth(BaseModel):
    """Financial health and loan status"""
    short_term_loan: Optional[Decimal] = Field(None, description="Short-term loan in millions")
    long_term_loan: Optional[Decimal] = Field(None, description="Long-term loan in millions")
    total_loan: Optional[Decimal] = Field(None, description="Total loan in millions")
    reserve_and_surplus: Optional[Decimal] = Field(None, description="Reserve and surplus in millions")
    debt_status: str = Field(default="Unknown", description="Debt status description")
    remarks: str = Field(default="", description="Additional remarks")

    class Config:
        from_attributes = True


# ============================================================================
# 6. Dividend History API Response
# ============================================================================
class DividendHistory(BaseModel):
    """Annual dividend information"""
    year: int
    cash_dividend: Optional[str] = Field(None, description="Cash dividend %")
    stock_dividend: Optional[str] = Field(None, description="Stock dividend %")
    dividend_yield: Optional[Decimal] = Field(None, description="Dividend yield %")

    class Config:
        from_attributes = True


# ============================================================================
# 7. Historical Ratios API Response
# ============================================================================
class HistoricalRatios(BaseModel):
    """Historical financial ratios for charting"""
    eps_history: List[Optional[Decimal]] = Field(default_factory=list, description="Historical EPS values")
    pe_history: List[Optional[Decimal]] = Field(default_factory=list, description="Historical P/E ratios")
    nav_history: List[Optional[Decimal]] = Field(default_factory=list, description="Historical NAV values")
    profit_history: List[Optional[Decimal]] = Field(default_factory=list, description="Historical profit in millions")
    years: List[int] = Field(default_factory=list, description="Years for the data points")

    class Config:
        from_attributes = True


# ============================================================================
# 8. Company Comparison API Response
# ============================================================================
class CompanyComparison(BaseModel):
    """Company comparison metrics"""
    trading_code: str
    company_name: Optional[str] = None
    ltp: Optional[Decimal] = Field(None, description="Last Trading Price")
    pe: Optional[Decimal] = Field(None, description="P/E ratio")
    dividend_yield: Optional[Decimal] = Field(None, description="Dividend yield %")
    nav: Optional[Decimal] = Field(None, description="Net Asset Value")
    market_cap: Optional[Decimal] = Field(None, description="Market cap in millions")
    eps: Optional[Decimal] = Field(None, description="Earnings per share")
    sector: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================================
# 9. Search & Filter API Response
# ============================================================================
class CompanySearchResult(BaseModel):
    """Search result item"""
    trading_code: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    category: Optional[str] = None
    ltp: Optional[Decimal] = Field(None, description="Last Trading Price")
    pe_ratio: Optional[Decimal] = None
    market_cap: Optional[Decimal] = None

    class Config:
        from_attributes = True


# ============================================================================
# Additional Helper Schemas
# ============================================================================
class FundamentalDataAvailability(BaseModel):
    """Data availability status for a company"""
    has_basic_info: bool = False
    has_financial_data: bool = False
    has_dividend_data: bool = False
    has_shareholding_data: bool = False
    has_loan_data: bool = False
    has_quarterly_data: bool = False
    latest_data_year: Optional[int] = None
    latest_quarter_date: Optional[date] = None

