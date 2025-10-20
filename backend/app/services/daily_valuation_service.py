"""
Daily Portfolio Valuation Service

This service calculates and stores daily portfolio valuations.
Should be run daily (via cron or Celery) to pre-calculate performance data.
"""

from datetime import date, timedelta
from decimal import Decimal
from sqlmodel import Session, select
from typing import Optional

from app.model.portfolio import Portfolio, PortfolioPosition
from app.model.performance import PortfolioDailyValuation
from app.services.performance_calculator import PerformanceCalculator


class DailyValuationService:
    """Service for calculating and storing daily portfolio valuations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.calc = PerformanceCalculator(db)
    
    def calculate_all_portfolios(self, target_date: Optional[date] = None):
        """
        Calculate valuations for all active portfolios.
        
        Args:
            target_date: Date to calculate for (default: today)
        """
        if target_date is None:
            target_date = date.today()
        
        print(f"Calculating valuations for {target_date}...")
        
        # Get all active portfolios
        statement = select(Portfolio).where(Portfolio.is_active == True)
        portfolios = self.db.exec(statement).all()
        
        total = len(portfolios)
        successful = 0
        skipped = 0
        failed = 0
        
        for i, portfolio in enumerate(portfolios, 1):
            print(f"[{i}/{total}] Processing portfolio: {portfolio.name} ({portfolio.id})")
            
            try:
                result = self.calculate_portfolio_valuation(portfolio.id, target_date)
                
                if result == "skipped":
                    print(f"  ⏭️  Skipped (already exists)")
                    skipped += 1
                else:
                    print(f"  ✅ Value: {result['total_value']:,.2f}, Daily Return: {result['daily_return']:.4f}%")
                    successful += 1
            
            except Exception as e:
                print(f"  ❌ Error: {str(e)}")
                failed += 1
        
        print(f"\nSummary: ✅ {successful} calculated, ⏭️  {skipped} skipped, ❌ {failed} failed")
        
        return {
            "total": total,
            "successful": successful,
            "skipped": skipped,
            "failed": failed
        }
    
    def calculate_portfolio_valuation(
        self,
        portfolio_id: str,
        target_date: date
    ) -> dict:
        """
        Calculate and store valuation for a single portfolio.
        
        Returns:
            Dictionary with valuation data or "skipped" if already exists
        """
        # Check if valuation already exists
        existing = self.db.exec(
            select(PortfolioDailyValuation).where(
                PortfolioDailyValuation.portfolio_id == portfolio_id,
                PortfolioDailyValuation.valuation_date == target_date
            )
        ).first()
        
        if existing:
            return "skipped"
        
        # Calculate portfolio value
        total_value = self.calc._get_portfolio_value_on_date(portfolio_id, target_date)
        
        if total_value == 0:
            # Portfolio has no value, skip
            return "skipped"
        
        # Get portfolio for cash balance
        portfolio = self.db.get(Portfolio, portfolio_id)
        cash_value = float(portfolio.cash_balance) if portfolio and portfolio.cash_balance else 0.0
        securities_value = total_value - cash_value
        
        # Get yesterday's valuation for daily return calculation
        yesterday = target_date - timedelta(days=1)
        yesterday_val = self.db.exec(
            select(PortfolioDailyValuation).where(
                PortfolioDailyValuation.portfolio_id == portfolio_id,
                PortfolioDailyValuation.valuation_date == yesterday
            )
        ).first()
        
        # Calculate daily return
        daily_return = Decimal(0)
        cumulative_return = Decimal(0)
        
        if yesterday_val and yesterday_val.total_value and yesterday_val.total_value > 0:
            daily_return = (Decimal(str(total_value)) - yesterday_val.total_value) / yesterday_val.total_value
        
        # Get inception valuation for cumulative return
        inception_val = self.db.exec(
            select(PortfolioDailyValuation).where(
                PortfolioDailyValuation.portfolio_id == portfolio_id
            ).order_by(PortfolioDailyValuation.valuation_date).limit(1)
        ).first()
        
        if inception_val and inception_val.total_value and inception_val.total_value > 0:
            cumulative_return = (Decimal(str(total_value)) - inception_val.total_value) / inception_val.total_value
        
        # Create valuation record
        valuation = PortfolioDailyValuation(
            portfolio_id=portfolio_id,
            valuation_date=target_date,
            total_value=Decimal(str(total_value)),
            cash_value=Decimal(str(cash_value)),
            securities_value=Decimal(str(securities_value)),
            daily_return=daily_return,
            cumulative_return=cumulative_return
        )
        
        self.db.add(valuation)
        self.db.commit()
        
        return {
            "total_value": float(total_value),
            "daily_return": float(daily_return) * 100,
            "cumulative_return": float(cumulative_return) * 100
        }
    
    def backfill_valuations(
        self,
        portfolio_id: str,
        start_date: date,
        end_date: Optional[date] = None
    ):
        """
        Backfill historical valuations for a portfolio.
        
        Useful for populating historical data when a portfolio is first set up.
        
        Args:
            portfolio_id: Portfolio UUID
            start_date: Start date for backfill
            end_date: End date (default: today)
        """
        if end_date is None:
            end_date = date.today()
        
        print(f"Backfilling valuations for portfolio {portfolio_id}")
        print(f"Date range: {start_date} to {end_date}")
        
        current_date = start_date
        count = 0
        
        while current_date <= end_date:
            try:
                result = self.calculate_portfolio_valuation(portfolio_id, current_date)
                if result != "skipped":
                    count += 1
                    if count % 10 == 0:
                        print(f"  Processed {count} days...")
            except Exception as e:
                print(f"  Error on {current_date}: {str(e)}")
            
            current_date += timedelta(days=1)
        
        print(f"✅ Backfill complete: {count} valuations calculated")
        return count

