"""
Calculate Portfolio Daily Valuations Script

Run this script to calculate and store daily portfolio valuations.
This should be run daily (e.g., via cron) for optimal API performance.

Usage:
    # Calculate for today
    uv run python calculate_valuations.py
    
    # Calculate for a specific date
    uv run python calculate_valuations.py 2024-10-20
    
    # Backfill historical data for a portfolio
    uv run python calculate_valuations.py --backfill {portfolio_id} 2024-01-01 2024-10-20
"""

from app.core.db import engine
from sqlmodel import Session
from app.services.daily_valuation_service import DailyValuationService
from datetime import date, datetime
import sys


def calculate_today():
    """Calculate valuations for today."""
    with Session(engine) as db:
        service = DailyValuationService(db)
        result = service.calculate_all_portfolios()
        return result


def calculate_for_date(target_date: date):
    """Calculate valuations for a specific date."""
    with Session(engine) as db:
        service = DailyValuationService(db)
        result = service.calculate_all_portfolios(target_date)
        return result


def backfill_portfolio(portfolio_id: str, start_date: date, end_date: date):
    """Backfill historical valuations for a portfolio."""
    with Session(engine) as db:
        service = DailyValuationService(db)
        count = service.backfill_valuations(portfolio_id, start_date, end_date)
        return count


def main():
    """Main entry point for the script."""
    
    if len(sys.argv) == 1:
        # No arguments - calculate for today
        print("Calculating valuations for today...")
        result = calculate_today()
        print(f"\n✅ Complete! {result['successful']} portfolios processed.")
    
    elif sys.argv[1] == "--backfill":
        # Backfill mode
        if len(sys.argv) < 5:
            print("Usage: python calculate_valuations.py --backfill {portfolio_id} {start_date} {end_date}")
            print("Example: python calculate_valuations.py --backfill abc-123 2024-01-01 2024-10-20")
            sys.exit(1)
        
        portfolio_id = sys.argv[2]
        start_date = datetime.strptime(sys.argv[3], "%Y-%m-%d").date()
        end_date = datetime.strptime(sys.argv[4], "%Y-%m-%d").date()
        
        count = backfill_portfolio(portfolio_id, start_date, end_date)
        print(f"\n✅ Backfill complete! {count} valuations calculated.")
    
    else:
        # Calculate for specific date
        try:
            target_date = datetime.strptime(sys.argv[1], "%Y-%m-%d").date()
            print(f"Calculating valuations for {target_date}...")
            result = calculate_for_date(target_date)
            print(f"\n✅ Complete! {result['successful']} portfolios processed.")
        except ValueError:
            print("Invalid date format. Use YYYY-MM-DD")
            print("Example: python calculate_valuations.py 2024-10-20")
            sys.exit(1)


if __name__ == "__main__":
    main()

