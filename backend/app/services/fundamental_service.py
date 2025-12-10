"""
Fundamental Analysis Service

Provides comprehensive fundamental analysis data for stocks including
company information, financial metrics, shareholding patterns, dividends, and more.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from sqlmodel import Session, select, func, and_, or_, desc
import logging

from app.services.base import BaseService, ServiceException
from app.model.company import Company
from app.model.fundamental import (
    DividendInformation, FinancialPerformance, 
    QuarterlyPerformance, ShareholdingPattern, LoanStatus
)
from app.model.stock import StockData, DailyOHLC
from app.model.fundamental_schemas import (
    CompanyBasicInfo, ContactInfo, Week52Range, MarketSummary,
    ShareholdingPattern as ShareholdingPatternResponse,
    ShareholdingChange, EarningsProfitResponse, QuarterlyEarnings,
    AnnualEarnings, FinancialHealth, DividendHistory,
    HistoricalRatios, CompanyComparison, CompanySearchResult,
    FundamentalDataAvailability
)

logger = logging.getLogger(__name__)


class FundamentalAnalysisService(BaseService[Company, Any, Any]):
    """Service for fundamental analysis operations"""
    
    def __init__(self, session: Optional[Session] = None):
        super().__init__(Company, session)
    
    def _get_company_by_trading_code(self, trading_code: str) -> Company:
        """Get company by trading code"""
        company = self.session.exec(
            select(Company).where(
                func.upper(Company.trading_code) == trading_code.upper()
            )
        ).first()
        
        if not company:
            raise ServiceException(
                f"Company with trading code '{trading_code}' not found", 
                status_code=404
            )
        
        return company
    
    def _get_latest_stock_data(self, company_id: UUID) -> Optional[StockData]:
        """Get the latest stock data for a company"""
        return self.session.exec(
            select(StockData)
            .where(StockData.company_id == company_id)
            .order_by(desc(StockData.timestamp))
        ).first()
    
    def _parse_52_week_range(self, range_str: Optional[str]) -> Week52Range:
        """Parse 52-week moving range string"""
        if not range_str:
            return Week52Range(low=None, high=None)
        
        try:
            # Expected format: "247.20 - 387.60" or similar
            parts = range_str.split('-')
            if len(parts) == 2:
                low = Decimal(parts[0].strip())
                high = Decimal(parts[1].strip())
                return Week52Range(low=low, high=high)
        except Exception as e:
            logger.warning(f"Failed to parse 52-week range '{range_str}': {e}")
        
        return Week52Range(low=None, high=None)
    
    # ========================================================================
    # API 1: Company Basic Info
    # ========================================================================
    def get_company_basic_info(self, trading_code: str) -> CompanyBasicInfo:
        """
        Get basic company information for fundamental analysis
        
        Args:
            trading_code: Company trading code (e.g., 'BATBC')
            
        Returns:
            CompanyBasicInfo with company details
        """
        company = self._get_company_by_trading_code(trading_code)
        
        contact = ContactInfo(
            company_secretary=company.company_secretary_name,
            email=company.company_secretary_email,
            cell=company.company_secretary_cell_no
        )
        
        return CompanyBasicInfo(
            trading_code=company.trading_code,
            company_name=company.company_name or company.name,
            category=company.market_category,
            sector=company.sector,
            listing_year=company.listing_year,
            head_office=company.address,
            factory=company.factory_address,
            contact=contact,
            website=company.website
        )
    
    # ========================================================================
    # API 2: Market Summary
    # ========================================================================
    def get_market_summary(self, trading_code: str) -> MarketSummary:
        """
        Get market summary and valuation metrics
        
        Args:
            trading_code: Company trading code
            
        Returns:
            MarketSummary with key market indicators
        """
        company = self._get_company_by_trading_code(trading_code)
        stock_data = self._get_latest_stock_data(company.id)
        
        # Get latest financial performance for audited PE and EPS
        latest_financial = self.session.exec(
            select(FinancialPerformance)
            .where(FinancialPerformance.company_id == company.id)
            .order_by(desc(FinancialPerformance.year))
        ).first()
        
        # Get latest dividend information for dividend yield
        latest_dividend = self.session.exec(
            select(DividendInformation)
            .where(DividendInformation.company_id == company.id)
            .order_by(desc(DividendInformation.year))
        ).first()
        
        ltp = stock_data.last_trade_price if stock_data else None
        ycp = stock_data.previous_close if stock_data else None
        ltp_change = stock_data.change if stock_data else None
        
        # Calculate current_pe using LTP and EPS from latest financial performance
        current_pe = None
        if ltp and latest_financial and latest_financial.eps_basic and latest_financial.eps_basic > 0:
            current_pe = Decimal(str(ltp)) / latest_financial.eps_basic
        
        # Calculate audited_pe using LTP and EPS_basic from latest financial performance
        audited_pe = None
        if ltp and latest_financial and latest_financial.eps_basic and latest_financial.eps_basic > 0:
            audited_pe = Decimal(str(ltp)) / latest_financial.eps_basic
        
        # Get dividend_yield from latest dividend information
        dividend_yield = None
        if latest_dividend and latest_dividend.yield_percentage is not None:
            dividend_yield = latest_dividend.yield_percentage
        
        # Calculate market_cap using LTP and total_outstanding_securities
        # Market cap = LTP × total_outstanding_securities (convert to millions)
        market_cap = None
        if ltp and company.total_outstanding_securities:
            try:
                # Calculate in base units, then convert to millions
                market_cap_base = Decimal(str(ltp)) * Decimal(str(company.total_outstanding_securities))
                # Convert to millions (divide by 1,000,000)
                market_cap = market_cap_base / Decimal('1000000')
            except (ValueError, TypeError) as e:
                logger.warning(f"Failed to calculate market cap for {trading_code}: {e}")
                market_cap = None
        
        week_52_range = self._parse_52_week_range(company.fifty_two_weeks_moving_range)
        
        return MarketSummary(
            ltp=ltp,
            ltp_change=ltp_change,
            ycp=ycp,
            current_pe=current_pe,
            audited_pe=audited_pe,
            dividend_yield=dividend_yield,
            nav=company.nav,
            face_value=Decimal(str(company.face_value)) if company.face_value else None,
            market_cap=market_cap,
            paid_up_capital=Decimal(str(company.paid_up_capital)) if company.paid_up_capital else None,
            authorized_capital=Decimal(str(company.authorized_capital)) if company.authorized_capital else None,
            reserve_and_surplus=Decimal(str(company.reserve_and_surplus)) if company.reserve_and_surplus else None,
            year_end=company.year_end,
            last_agm=company.last_agm_date,
            week_52_range=week_52_range
        )
    
    # ========================================================================
    # API 3: Shareholding Pattern
    # ========================================================================
    def get_shareholding_pattern(self, trading_code: str) -> ShareholdingPatternResponse:
        """
        Get latest shareholding pattern with changes
        
        Args:
            trading_code: Company trading code
            
        Returns:
            ShareholdingPatternResponse with distribution and changes
        """
        company = self._get_company_by_trading_code(trading_code)
        
        # Get latest two shareholding records to calculate change
        shareholdings = self.session.exec(
            select(ShareholdingPattern)
            .where(ShareholdingPattern.company_id == company.id)
            .order_by(desc(ShareholdingPattern.date))
            .limit(2)
        ).all()
        
        if not shareholdings:
            raise ServiceException(
                f"No shareholding data found for '{trading_code}'",
                status_code=404
            )
        
        latest = shareholdings[0]
        previous = shareholdings[1] if len(shareholdings) > 1 else None
        
        # Calculate changes
        change = None
        if previous:
            foreign_change = (latest.foreign_holder or 0) - (previous.foreign_holder or 0)
            public_change = (latest.public_holder or 0) - (previous.public_holder or 0)
            
            if foreign_change != 0 or public_change != 0:
                change = ShareholdingChange(
                    foreign=foreign_change,
                    public=public_change
                )
        
        return ShareholdingPatternResponse(
            date=latest.date,
            director=latest.sponsor_director,
            govt=latest.government,
            institute=latest.institute,
            foreign=latest.foreign_holder,
            public=latest.public_holder,
            change=change
        )
    
    # ========================================================================
    # API 4: Earnings & Profit
    # ========================================================================
    def get_earnings_profit(self, trading_code: str) -> EarningsProfitResponse:
        """
        Get quarterly and annual earnings data
        
        Args:
            trading_code: Company trading code
            
        Returns:
            EarningsProfitResponse with quarterly and annual data
        """
        company = self._get_company_by_trading_code(trading_code)
        
        # Get quarterly data for current and previous year
        current_year = datetime.now().year
        quarterly_data = self.session.exec(
            select(QuarterlyPerformance)
            .where(QuarterlyPerformance.company_id == company.id)
            .order_by(desc(QuarterlyPerformance.date))
            .limit(8)  # Get last 8 quarters to compare
        ).all()
        
        # Get annual financial performance
        annual_data = self.session.exec(
            select(FinancialPerformance)
            .where(FinancialPerformance.company_id == company.id)
            .order_by(desc(FinancialPerformance.year))
            .limit(2)
        ).all()
        
        # Process quarterly data
        quarters = []
        if quarterly_data:
            # Group by quarter to compare years
            quarter_map: Dict[str, List[QuarterlyPerformance]] = {}
            for qp in quarterly_data:
                if qp.quarter not in quarter_map:
                    quarter_map[qp.quarter] = []
                quarter_map[qp.quarter].append(qp)
            
            for quarter_name in ['Q1', 'Q2', 'Q3', 'Q4']:
                if quarter_name in quarter_map and quarter_map[quarter_name]:
                    quarter_list = sorted(quarter_map[quarter_name], key=lambda x: x.date, reverse=True)
                    current = quarter_list[0]
                    previous = quarter_list[1] if len(quarter_list) > 1 else None
                    
                    current_eps = current.eps_basic or Decimal(0)
                    prev_eps = previous.eps_basic if previous else None
                    
                    growth = None
                    if prev_eps and prev_eps != 0:
                        growth = ((current_eps - prev_eps) / prev_eps) * 100
                    
                    quarters.append(QuarterlyEarnings(
                        quarter=quarter_name,
                        prev_year_eps=prev_eps,
                        current_year_eps=current_eps,
                        growth_percent=growth,
                        period=current.date.strftime("%b %Y")
                    ))
        
        # Process annual data
        annual = None
        if annual_data:
            current_annual = annual_data[0]
            prev_annual = annual_data[1] if len(annual_data) > 1 else None
            
            current_eps = current_annual.eps_basic or Decimal(0)
            prev_eps = prev_annual.eps_basic if prev_annual else None
            
            growth = None
            if prev_eps and prev_eps != 0:
                growth = ((current_eps - prev_eps) / prev_eps) * 100
            
            annual = AnnualEarnings(
                prev_year_eps=prev_eps,
                current_year_eps=current_eps,
                growth_percent=growth,
                profit_million=current_annual.profit
            )
        
        return EarningsProfitResponse(
            quarters=quarters,
            annual=annual
        )
    
    # ========================================================================
    # API 5: Financial Health
    # ========================================================================
    def get_financial_health(self, trading_code: str) -> FinancialHealth:
        """
        Get financial health and loan status
        
        Args:
            trading_code: Company trading code
            
        Returns:
            FinancialHealth with loan and reserve information
        """
        company = self._get_company_by_trading_code(trading_code)
        
        # Get loan status
        loan_status = self.session.exec(
            select(LoanStatus).where(LoanStatus.company_id == company.id)
        ).first()
        
        short_term = loan_status.short_term_loan if loan_status else Decimal(0)
        long_term = loan_status.long_term_loan if loan_status else Decimal(0)
        total = (short_term or Decimal(0)) + (long_term or Decimal(0))
        
        # Determine debt status
        if total == 0:
            debt_status = "Debt-free"
            remarks = "Strong reserves and no outstanding loans"
        elif total < 100:
            debt_status = "Minimal debt"
            remarks = "Low debt levels, healthy balance sheet"
        else:
            debt_status = "Has debt obligations"
            remarks = f"Total debt: {total} million"
        
        reserve = Decimal(str(company.reserve_and_surplus)) if company.reserve_and_surplus else None
        
        if reserve and total > 0 and reserve > total * 5:
            remarks = f"{remarks}. Strong reserves cover debt comfortably"
        
        return FinancialHealth(
            short_term_loan=short_term,
            long_term_loan=long_term,
            total_loan=total,
            reserve_and_surplus=reserve,
            debt_status=debt_status,
            remarks=remarks
        )
    
    # ========================================================================
    # API 6: Dividend History
    # ========================================================================
    def get_dividend_history(self, trading_code: str, limit: int = 10) -> List[DividendHistory]:
        """
        Get dividend history
        
        Args:
            trading_code: Company trading code
            limit: Maximum number of years to return
            
        Returns:
            List of DividendHistory records
        """
        company = self._get_company_by_trading_code(trading_code)
        
        dividends = self.session.exec(
            select(DividendInformation)
            .where(DividendInformation.company_id == company.id)
            .order_by(desc(DividendInformation.year))
            .limit(limit)
        ).all()
        
        result = []
        for div in dividends:
            # Format cash dividend as percentage string
            cash_div = None
            if div.cash_dividend:
                cash_div = f"{div.cash_dividend}%"
            
            # Stock dividend
            stock_div = div.stock_dividend or "0%"
            
            result.append(DividendHistory(
                year=div.year,
                cash_dividend=cash_div,
                stock_dividend=stock_div,
                dividend_yield=div.yield_percentage
            ))
        
        return result
    
    # ========================================================================
    # API 7: Historical Ratios
    # ========================================================================
    def get_historical_ratios(self, trading_code: str, years: int = 5) -> HistoricalRatios:
        """
        Get historical financial ratios for charting
        
        Args:
            trading_code: Company trading code
            years: Number of years of history to return
            
        Returns:
            HistoricalRatios with time series data
        """
        company = self._get_company_by_trading_code(trading_code)
        
        # Get financial performance history
        financials = self.session.exec(
            select(FinancialPerformance)
            .where(FinancialPerformance.company_id == company.id)
            .order_by(desc(FinancialPerformance.year))
            .limit(years)
        ).all()
        
        # Reverse to get chronological order
        financials = list(reversed(financials))
        
        eps_history = []
        pe_history = []
        nav_history = []
        profit_history = []
        years_list = []
        
        for fp in financials:
            years_list.append(fp.year)
            eps_history.append(fp.eps_basic)
            pe_history.append(fp.pe_ratio)
            nav_history.append(fp.nav_per_share)
            profit_history.append(fp.profit)
        
        return HistoricalRatios(
            eps_history=eps_history,
            pe_history=pe_history,
            nav_history=nav_history,
            profit_history=profit_history,
            years=years_list
        )
    
    # ========================================================================
    # API 8: Company Comparison
    # ========================================================================
    def compare_companies(self, trading_codes: List[str]) -> List[CompanyComparison]:
        """
        Compare multiple companies
        
        Args:
            trading_codes: List of company trading codes
            
        Returns:
            List of CompanyComparison objects
        """
        if len(trading_codes) > 10:
            raise ServiceException(
                "Maximum 10 companies can be compared at once",
                status_code=400
            )
        
        result = []
        
        for code in trading_codes:
            try:
                company = self._get_company_by_trading_code(code)
                stock_data = self._get_latest_stock_data(company.id)
                
                ltp = stock_data.last_trade_price if stock_data else None
                
                result.append(CompanyComparison(
                    trading_code=company.trading_code,
                    company_name=company.company_name or company.name,
                    ltp=ltp,
                    pe=company.pe_ratio,
                    dividend_yield=company.dividend_yield,
                    nav=company.nav,
                    market_cap=company.market_cap,
                    eps=company.eps,
                    sector=company.sector
                ))
            except ServiceException:
                # Skip companies not found
                logger.warning(f"Company '{code}' not found for comparison")
                continue
        
        return result
    
    # ========================================================================
    # API 9: Search & Filter
    # ========================================================================
    def search_companies(
        self,
        sector: Optional[str] = None,
        category: Optional[str] = None,
        min_pe: Optional[Decimal] = None,
        max_pe: Optional[Decimal] = None,
        min_dividend_yield: Optional[Decimal] = None,
        limit: int = 50
    ) -> List[CompanySearchResult]:
        """
        Search and filter companies
        
        Args:
            sector: Filter by sector
            category: Filter by market category (A, B, G, N, Z)
            min_pe: Minimum P/E ratio
            max_pe: Maximum P/E ratio
            min_dividend_yield: Minimum dividend yield
            limit: Maximum results to return
            
        Returns:
            List of CompanySearchResult objects
        """
        # Build query
        query = select(Company).where(Company.is_active == True)
        
        if sector:
            query = query.where(func.upper(Company.sector) == sector.upper())
        
        if category:
            query = query.where(func.upper(Company.market_category) == category.upper())
        
        if min_pe is not None:
            query = query.where(Company.pe_ratio >= min_pe)
        
        if max_pe is not None:
            query = query.where(Company.pe_ratio <= max_pe)
        
        if min_dividend_yield is not None:
            query = query.where(Company.dividend_yield >= min_dividend_yield)
        
        query = query.limit(limit)
        
        companies = self.session.exec(query).all()
        
        result = []
        for company in companies:
            stock_data = self._get_latest_stock_data(company.id)
            ltp = stock_data.last_trade_price if stock_data else None
            
            result.append(CompanySearchResult(
                trading_code=company.trading_code,
                company_name=company.company_name or company.name,
                sector=company.sector,
                category=company.market_category,
                ltp=ltp,
                pe_ratio=company.pe_ratio,
                market_cap=company.market_cap
            ))
        
        return result
    
    # ========================================================================
    # Helper: Data Availability Check
    # ========================================================================
    def check_data_availability(self, trading_code: str) -> FundamentalDataAvailability:
        """
        Check what fundamental data is available for a company
        
        Args:
            trading_code: Company trading code
            
        Returns:
            FundamentalDataAvailability status
        """
        company = self._get_company_by_trading_code(trading_code)
        
        # Check various data types
        has_financial = self.session.exec(
            select(FinancialPerformance)
            .where(FinancialPerformance.company_id == company.id)
            .limit(1)
        ).first() is not None
        
        has_dividend = self.session.exec(
            select(DividendInformation)
            .where(DividendInformation.company_id == company.id)
            .limit(1)
        ).first() is not None
        
        has_shareholding = self.session.exec(
            select(ShareholdingPattern)
            .where(ShareholdingPattern.company_id == company.id)
            .limit(1)
        ).first() is not None
        
        has_loan = self.session.exec(
            select(LoanStatus)
            .where(LoanStatus.company_id == company.id)
            .limit(1)
        ).first() is not None
        
        has_quarterly = self.session.exec(
            select(QuarterlyPerformance)
            .where(QuarterlyPerformance.company_id == company.id)
            .limit(1)
        ).first() is not None
        
        # Get latest data year
        latest_financial = self.session.exec(
            select(FinancialPerformance)
            .where(FinancialPerformance.company_id == company.id)
            .order_by(desc(FinancialPerformance.year))
        ).first()
        
        latest_quarterly = self.session.exec(
            select(QuarterlyPerformance)
            .where(QuarterlyPerformance.company_id == company.id)
            .order_by(desc(QuarterlyPerformance.date))
        ).first()
        
        return FundamentalDataAvailability(
            has_basic_info=True,  # Always true if company exists
            has_financial_data=has_financial,
            has_dividend_data=has_dividend,
            has_shareholding_data=has_shareholding,
            has_loan_data=has_loan,
            has_quarterly_data=has_quarterly,
            latest_data_year=latest_financial.year if latest_financial else None,
            latest_quarter_date=latest_quarterly.date if latest_quarterly else None
        )

