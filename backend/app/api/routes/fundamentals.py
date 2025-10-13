"""
Fundamental Analysis API Routes

This module provides comprehensive fundamental analysis endpoints for stocks.
All endpoints follow RESTful conventions and return normalized JSON responses.
"""

from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.api.deps import get_session_dep, get_current_user
from app.model.user import User
from app.services.fundamental_service import FundamentalAnalysisService
from app.services.base import ServiceException
from app.model.fundamental_schemas import (
    CompanyBasicInfo,
    MarketSummary,
    ShareholdingPattern,
    EarningsProfitResponse,
    FinancialHealth,
    DividendHistory,
    HistoricalRatios,
    CompanyComparison,
    CompanySearchResult,
    FundamentalDataAvailability
)

router = APIRouter(prefix="/fundamentals", tags=["fundamentals"])


def get_fundamental_service(session: Session = Depends(get_session_dep)) -> FundamentalAnalysisService:
    """Dependency to get fundamental analysis service"""
    return FundamentalAnalysisService(session=session)


# ============================================================================
# API 1: Company Basic Info
# ============================================================================
@router.get(
    "/company/{trading_code}",
    response_model=CompanyBasicInfo,
    summary="Get Company Basic Information",
    description="Fetch all basic company information for the fundamental analysis tab"
)
def get_company_info(
    trading_code: str,
    current_user: User = Depends(get_current_user),
    service: FundamentalAnalysisService = Depends(get_fundamental_service)
) -> CompanyBasicInfo:
    """
    Get basic company information including:
    - Trading code and company name
    - Sector and category
    - Listing year
    - Contact information
    - Head office and factory addresses
    - Website
    
    **Example:** `/api/v1/fundamentals/company/BATBC`
    """
    try:
        return service.get_company_basic_info(trading_code)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# ============================================================================
# API 2: Market Summary
# ============================================================================
@router.get(
    "/market-summary/{trading_code}",
    response_model=MarketSummary,
    summary="Get Market Summary and Valuation Metrics",
    description="Provide key market indicators, valuation metrics, and financial highlights"
)
def get_market_summary(
    trading_code: str,
    current_user: User = Depends(get_current_user),
    service: FundamentalAnalysisService = Depends(get_fundamental_service)
) -> MarketSummary:
    """
    Get market summary including:
    - Last trading price (LTP) and changes
    - P/E ratio (current and audited)
    - Dividend yield
    - NAV and face value
    - Market capitalization
    - Capital structure
    - 52-week price range
    - Financial year end and last AGM date
    
    **Example:** `/api/v1/fundamentals/market-summary/BATBC`
    """
    try:
        return service.get_market_summary(trading_code)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# ============================================================================
# API 3: Shareholding Pattern
# ============================================================================
@router.get(
    "/shareholding/{trading_code}",
    response_model=ShareholdingPattern,
    summary="Get Shareholding Pattern",
    description="Show detailed shareholding distribution and recent changes"
)
def get_shareholding_pattern(
    trading_code: str,
    current_user: User = Depends(get_current_user),
    service: FundamentalAnalysisService = Depends(get_fundamental_service)
) -> ShareholdingPattern:
    """
    Get shareholding pattern including:
    - Sponsor/Director holdings
    - Government holdings
    - Institutional holdings
    - Foreign holdings
    - Public holdings
    - Recent changes in shareholding
    
    **Example:** `/api/v1/fundamentals/shareholding/BATBC`
    """
    try:
        return service.get_shareholding_pattern(trading_code)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# ============================================================================
# API 4: Earnings & Profit
# ============================================================================
@router.get(
    "/earnings/{trading_code}",
    response_model=EarningsProfitResponse,
    summary="Get Earnings and Profit Data",
    description="Retrieve EPS and profit trends by quarter and year"
)
def get_earnings_profit(
    trading_code: str,
    current_user: User = Depends(get_current_user),
    service: FundamentalAnalysisService = Depends(get_fundamental_service)
) -> EarningsProfitResponse:
    """
    Get earnings and profit data including:
    - Quarterly EPS trends
    - Year-over-year EPS comparison
    - Growth percentages
    - Annual profit figures
    
    **Example:** `/api/v1/fundamentals/earnings/BATBC`
    """
    try:
        return service.get_earnings_profit(trading_code)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# ============================================================================
# API 5: Financial Health
# ============================================================================
@router.get(
    "/financial-health/{trading_code}",
    response_model=FinancialHealth,
    summary="Get Financial Health Status",
    description="Display loan status, reserves, and balance sheet stability indicators"
)
def get_financial_health(
    trading_code: str,
    current_user: User = Depends(get_current_user),
    service: FundamentalAnalysisService = Depends(get_fundamental_service)
) -> FinancialHealth:
    """
    Get financial health including:
    - Short-term loan
    - Long-term loan
    - Total debt
    - Reserve and surplus
    - Debt status assessment
    - Financial remarks
    
    **Example:** `/api/v1/fundamentals/financial-health/BATBC`
    """
    try:
        return service.get_financial_health(trading_code)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# ============================================================================
# API 6: Dividend History
# ============================================================================
@router.get(
    "/dividends/{trading_code}",
    response_model=List[DividendHistory],
    summary="Get Dividend History",
    description="Provide annual dividend information (cash, stock, yield)"
)
def get_dividend_history(
    trading_code: str,
    limit: int = Query(10, ge=1, le=20, description="Number of years to retrieve"),
    current_user: User = Depends(get_current_user),
    service: FundamentalAnalysisService = Depends(get_fundamental_service)
) -> List[DividendHistory]:
    """
    Get dividend history including:
    - Year
    - Cash dividend percentage
    - Stock dividend percentage
    - Dividend yield
    
    **Example:** `/api/v1/fundamentals/dividends/BATBC?limit=5`
    """
    try:
        return service.get_dividend_history(trading_code, limit=limit)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# ============================================================================
# API 7: Historical Ratios
# ============================================================================
@router.get(
    "/ratios/{trading_code}",
    response_model=HistoricalRatios,
    summary="Get Historical Financial Ratios",
    description="Return historical P/E, EPS, NAV, and profit data for charts"
)
def get_historical_ratios(
    trading_code: str,
    years: int = Query(5, ge=1, le=10, description="Number of years of history"),
    current_user: User = Depends(get_current_user),
    service: FundamentalAnalysisService = Depends(get_fundamental_service)
) -> HistoricalRatios:
    """
    Get historical ratios including:
    - EPS history
    - P/E ratio history
    - NAV history
    - Profit history
    - Corresponding years
    
    **Example:** `/api/v1/fundamentals/ratios/BATBC?years=5`
    """
    try:
        return service.get_historical_ratios(trading_code, years=years)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# ============================================================================
# API 8: Company Comparison
# ============================================================================
@router.get(
    "/compare",
    response_model=List[CompanyComparison],
    summary="Compare Multiple Companies",
    description="Compare key financial indicators among multiple companies"
)
def compare_companies(
    codes: str = Query(
        ..., 
        description="Comma-separated trading codes (e.g., 'BATBC,SQURPHARMA,OLYMPIC')",
        example="BATBC,SQURPHARMA,OLYMPIC"
    ),
    current_user: User = Depends(get_current_user),
    service: FundamentalAnalysisService = Depends(get_fundamental_service)
) -> List[CompanyComparison]:
    """
    Compare companies on:
    - Last trading price
    - P/E ratio
    - Dividend yield
    - NAV
    - Market cap
    - EPS
    - Sector
    
    **Example:** `/api/v1/fundamentals/compare?codes=BATBC,SQURPHARMA,OLYMPIC`
    """
    try:
        # Parse comma-separated codes
        trading_codes = [code.strip().upper() for code in codes.split(',') if code.strip()]
        
        if not trading_codes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one trading code must be provided"
            )
        
        if len(trading_codes) > 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 10 companies can be compared at once"
            )
        
        return service.compare_companies(trading_codes)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# ============================================================================
# API 9: Search & Filter
# ============================================================================
@router.get(
    "/search",
    response_model=List[CompanySearchResult],
    summary="Search and Filter Companies",
    description="Filter companies based on category, sector, or performance range"
)
def search_companies(
    sector: Optional[str] = Query(None, description="Filter by sector (e.g., 'Food & Allied')"),
    category: Optional[str] = Query(None, description="Filter by category (A, B, G, N, Z)"),
    min_pe: Optional[Decimal] = Query(None, ge=0, description="Minimum P/E ratio"),
    max_pe: Optional[Decimal] = Query(None, ge=0, description="Maximum P/E ratio"),
    min_dividend_yield: Optional[Decimal] = Query(None, ge=0, description="Minimum dividend yield %"),
    limit: int = Query(50, ge=1, le=100, description="Maximum results to return"),
    current_user: User = Depends(get_current_user),
    service: FundamentalAnalysisService = Depends(get_fundamental_service)
) -> List[CompanySearchResult]:
    """
    Search companies with filters:
    - Sector
    - Category (A, B, G, N, Z)
    - P/E ratio range
    - Minimum dividend yield
    
    Returns matching companies with basic info and current price.
    
    **Examples:**
    - `/api/v1/fundamentals/search?sector=Food%20%26%20Allied&category=A`
    - `/api/v1/fundamentals/search?min_pe=5&max_pe=15`
    - `/api/v1/fundamentals/search?min_dividend_yield=5&limit=20`
    """
    try:
        return service.search_companies(
            sector=sector,
            category=category,
            min_pe=min_pe,
            max_pe=max_pe,
            min_dividend_yield=min_dividend_yield,
            limit=limit
        )
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# ============================================================================
# Bonus API: Data Availability Check
# ============================================================================
@router.get(
    "/data-availability/{trading_code}",
    response_model=FundamentalDataAvailability,
    summary="Check Data Availability",
    description="Check what fundamental data is available for a company"
)
def check_data_availability(
    trading_code: str,
    current_user: User = Depends(get_current_user),
    service: FundamentalAnalysisService = Depends(get_fundamental_service)
) -> FundamentalDataAvailability:
    """
    Check data availability for a company:
    - Basic info availability
    - Financial data availability
    - Dividend data availability
    - Shareholding data availability
    - Loan data availability
    - Quarterly data availability
    - Latest data year
    - Latest quarter date
    
    **Example:** `/api/v1/fundamentals/data-availability/BATBC`
    """
    try:
        return service.check_data_availability(trading_code)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))

