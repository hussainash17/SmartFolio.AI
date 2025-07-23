#!/usr/bin/env python3
"""
Script to add initial demo data to the database.
This includes sample stock data for the demo companies.
"""

import asyncio
from decimal import Decimal
from datetime import datetime, timedelta
import uuid
from sqlmodel import Session, select
from app.core.db import get_session
from app.model.stock import StockCompany, StockData, DailyOHLC
from app.model.portfolio import Portfolio, PortfolioPosition
from app.model.user import User


async def add_sample_stock_data():
    """Add sample stock data for demo companies"""
    session = next(get_session())
    
    try:
        # Get all stock companies
        companies = session.exec(select(StockCompany)).all()
        
        if not companies:
            print("No stock companies found. Please run the Alembic migration first.")
            return
        
        print(f"Found {len(companies)} companies. Adding sample stock data...")
        
        # Sample stock data for each company
        sample_data = {
            'AAPL': {
                'last_trade_price': Decimal('175.50'),
                'change': Decimal('2.30'),
                'change_percent': Decimal('1.33'),
                'high': Decimal('176.80'),
                'low': Decimal('173.20'),
                'open_price': Decimal('174.20'),
                'previous_close': Decimal('173.20'),
                'volume': 45000000,
                'turnover': Decimal('7897500000'),
                'trades_count': 125000,
                'market_cap': Decimal('2500000000000')
            },
            'GOOGL': {
                'last_trade_price': Decimal('142.80'),
                'change': Decimal('-1.20'),
                'change_percent': Decimal('-0.83'),
                'high': Decimal('144.50'),
                'low': Decimal('141.80'),
                'open_price': Decimal('143.20'),
                'previous_close': Decimal('144.00'),
                'volume': 28000000,
                'turnover': Decimal('3998400000'),
                'trades_count': 95000,
                'market_cap': Decimal('1800000000000')
            },
            'MSFT': {
                'last_trade_price': Decimal('380.25'),
                'change': Decimal('5.75'),
                'change_percent': Decimal('1.54'),
                'high': Decimal('382.10'),
                'low': Decimal('375.80'),
                'open_price': Decimal('377.50'),
                'previous_close': Decimal('374.50'),
                'volume': 22000000,
                'turnover': Decimal('8365500000'),
                'trades_count': 75000,
                'market_cap': Decimal('2200000000000')
            },
            'TSLA': {
                'last_trade_price': Decimal('245.80'),
                'change': Decimal('12.30'),
                'change_percent': Decimal('5.27'),
                'high': Decimal('248.50'),
                'low': Decimal('235.20'),
                'open_price': Decimal('238.50'),
                'previous_close': Decimal('233.50'),
                'volume': 85000000,
                'turnover': Decimal('20893000000'),
                'trades_count': 180000,
                'market_cap': Decimal('800000000000')
            },
            'AMZN': {
                'last_trade_price': Decimal('155.40'),
                'change': Decimal('3.20'),
                'change_percent': Decimal('2.10'),
                'high': Decimal('156.80'),
                'low': Decimal('152.50'),
                'open_price': Decimal('153.20'),
                'previous_close': Decimal('152.20'),
                'volume': 35000000,
                'turnover': Decimal('5439000000'),
                'trades_count': 110000,
                'market_cap': Decimal('1600000000000')
            },
            'JPM': {
                'last_trade_price': Decimal('145.60'),
                'change': Decimal('-0.80'),
                'change_percent': Decimal('-0.55'),
                'high': Decimal('147.20'),
                'low': Decimal('144.80'),
                'open_price': Decimal('146.40'),
                'previous_close': Decimal('146.40'),
                'volume': 12000000,
                'turnover': Decimal('1747200000'),
                'trades_count': 45000,
                'market_cap': Decimal('450000000000')
            },
            'BAC': {
                'last_trade_price': Decimal('35.20'),
                'change': Decimal('0.40'),
                'change_percent': Decimal('1.15'),
                'high': Decimal('35.80'),
                'low': Decimal('34.90'),
                'open_price': Decimal('35.00'),
                'previous_close': Decimal('34.80'),
                'volume': 25000000,
                'turnover': Decimal('880000000'),
                'trades_count': 60000,
                'market_cap': Decimal('280000000000')
            },
            'JNJ': {
                'last_trade_price': Decimal('152.40'),
                'change': Decimal('1.20'),
                'change_percent': Decimal('0.79'),
                'high': Decimal('153.50'),
                'low': Decimal('151.20'),
                'open_price': Decimal('151.80'),
                'previous_close': Decimal('151.20'),
                'volume': 8000000,
                'turnover': Decimal('1219200000'),
                'trades_count': 30000,
                'market_cap': Decimal('380000000000')
            },
            'PFE': {
                'last_trade_price': Decimal('28.50'),
                'change': Decimal('-0.30'),
                'change_percent': Decimal('-1.04'),
                'high': Decimal('29.20'),
                'low': Decimal('28.40'),
                'open_price': Decimal('28.80'),
                'previous_close': Decimal('28.80'),
                'volume': 15000000,
                'turnover': Decimal('427500000'),
                'trades_count': 40000,
                'market_cap': Decimal('180000000000')
            },
            'XOM': {
                'last_trade_price': Decimal('105.20'),
                'change': Decimal('2.10'),
                'change_percent': Decimal('2.04'),
                'high': Decimal('106.50'),
                'low': Decimal('103.80'),
                'open_price': Decimal('104.20'),
                'previous_close': Decimal('103.10'),
                'volume': 18000000,
                'turnover': Decimal('1893600000'),
                'trades_count': 55000,
                'market_cap': Decimal('420000000000')
            },
            'KO': {
                'last_trade_price': Decimal('58.40'),
                'change': Decimal('0.60'),
                'change_percent': Decimal('1.04'),
                'high': Decimal('58.80'),
                'low': Decimal('57.90'),
                'open_price': Decimal('58.20'),
                'previous_close': Decimal('57.80'),
                'volume': 12000000,
                'turnover': Decimal('700800000'),
                'trades_count': 35000,
                'market_cap': Decimal('250000000000')
            },
            'PG': {
                'last_trade_price': Decimal('133.80'),
                'change': Decimal('1.20'),
                'change_percent': Decimal('0.90'),
                'high': Decimal('134.50'),
                'low': Decimal('132.80'),
                'open_price': Decimal('133.20'),
                'previous_close': Decimal('132.60'),
                'volume': 7000000,
                'turnover': Decimal('936600000'),
                'trades_count': 25000,
                'market_cap': Decimal('320000000000')
            },
            'META': {
                'last_trade_price': Decimal('360.20'),
                'change': Decimal('8.40'),
                'change_percent': Decimal('2.39'),
                'high': Decimal('362.50'),
                'low': Decimal('355.80'),
                'open_price': Decimal('357.20'),
                'previous_close': Decimal('351.80'),
                'volume': 15000000,
                'turnover': Decimal('5403000000'),
                'trades_count': 65000,
                'market_cap': Decimal('900000000000')
            },
            'NFLX': {
                'last_trade_price': Decimal('485.60'),
                'change': Decimal('15.20'),
                'change_percent': Decimal('3.23'),
                'high': Decimal('488.50'),
                'low': Decimal('475.20'),
                'open_price': Decimal('478.40'),
                'previous_close': Decimal('470.40'),
                'volume': 8000000,
                'turnover': Decimal('3884800000'),
                'trades_count': 35000,
                'market_cap': Decimal('220000000000')
            },
            'BA': {
                'last_trade_price': Decimal('200.40'),
                'change': Decimal('-2.10'),
                'change_percent': Decimal('-1.04'),
                'high': Decimal('203.50'),
                'low': Decimal('199.80'),
                'open_price': Decimal('202.20'),
                'previous_close': Decimal('202.50'),
                'volume': 5000000,
                'turnover': Decimal('1002000000'),
                'trades_count': 20000,
                'market_cap': Decimal('120000000000')
            },
            'SPG': {
                'last_trade_price': Decimal('138.50'),
                'change': Decimal('1.80'),
                'change_percent': Decimal('1.32'),
                'high': Decimal('139.20'),
                'low': Decimal('137.20'),
                'open_price': Decimal('137.80'),
                'previous_close': Decimal('136.70'),
                'volume': 2000000,
                'turnover': Decimal('277000000'),
                'trades_count': 8000,
                'market_cap': Decimal('45000000000')
            }
        }
        
        # Add stock data for each company
        for company in companies:
            if company.symbol in sample_data:
                data = sample_data[company.symbol]
                
                # Check if stock data already exists
                existing_data = session.exec(
                    select(StockData).where(StockData.company_id == company.id)
                ).first()
                
                if not existing_data:
                    stock_data = StockData(
                        id=uuid.uuid4(),
                        company_id=company.id,
                        **data,
                        timestamp=datetime.utcnow()
                    )
                    session.add(stock_data)
                    print(f"Added stock data for {company.symbol}")
                else:
                    print(f"Stock data already exists for {company.symbol}")
        
        # Add some sample daily OHLC data for the last 30 days
        print("Adding sample daily OHLC data...")
        for company in companies[:5]:  # Add for first 5 companies
            base_price = float(sample_data.get(company.symbol, {}).get('last_trade_price', 100))
            
            for i in range(30):
                date = datetime.utcnow() - timedelta(days=i)
                
                # Generate realistic OHLC data
                open_price = base_price + (i * 0.1) + (i % 3 - 1) * 2
                high = open_price + 3 + (i % 5) * 0.5
                low = open_price - 2 - (i % 4) * 0.3
                close_price = open_price + (i % 7 - 3) * 1.5
                
                # Check if daily data already exists
                existing_daily = session.exec(
                    select(DailyOHLC).where(
                        DailyOHLC.company_id == company.id,
                        DailyOHLC.date == date.date()
                    )
                ).first()
                
                if not existing_daily:
                    daily_data = DailyOHLC(
                        id=uuid.uuid4(),
                        company_id=company.id,
                        date=date,
                        open_price=Decimal(str(round(open_price, 2))),
                        high=Decimal(str(round(high, 2))),
                        low=Decimal(str(round(low, 2))),
                        close_price=Decimal(str(round(close_price, 2))),
                        volume=1000000 + (i % 10) * 100000,
                        turnover=Decimal(str(round((1000000 + (i % 10) * 100000) * close_price, 2))),
                        trades_count=5000 + (i % 5) * 1000,
                        change=Decimal(str(round(close_price - open_price, 2))),
                        change_percent=Decimal(str(round(((close_price - open_price) / open_price) * 100, 2)))
                    )
                    session.add(daily_data)
        
        session.commit()
        print("Sample stock data added successfully!")
        
    except Exception as e:
        print(f"Error adding sample stock data: {e}")
        session.rollback()
    finally:
        session.close()


async def add_sample_portfolios():
    """Add sample portfolios for testing"""
    session = next(get_session())
    
    try:
        # Get first user (assuming there's at least one user)
        user = session.exec(select(User)).first()
        
        if not user:
            print("No users found. Please create a user first.")
            return
        
        # Check if user already has portfolios
        existing_portfolios = session.exec(
            select(Portfolio).where(Portfolio.user_id == user.id)
        ).all()
        
        if existing_portfolios:
            print("User already has portfolios.")
            return
        
        # Create sample portfolios
        portfolios = [
            Portfolio(
                id=uuid.uuid4(),
                user_id=user.id,
                name="Growth Portfolio",
                description="High-growth technology stocks",
                is_default=True,
                is_active=True
            ),
            Portfolio(
                id=uuid.uuid4(),
                user_id=user.id,
                name="Dividend Portfolio",
                description="Stable dividend-paying stocks",
                is_default=False,
                is_active=True
            ),
            Portfolio(
                id=uuid.uuid4(),
                user_id=user.id,
                name="Balanced Portfolio",
                description="Mix of growth and value stocks",
                is_default=False,
                is_active=True
            )
        ]
        
        for portfolio in portfolios:
            session.add(portfolio)
        
        session.commit()
        print("Sample portfolios created successfully!")
        
    except Exception as e:
        print(f"Error creating sample portfolios: {e}")
        session.rollback()
    finally:
        session.close()


async def main():
    """Main function to run all initialization tasks"""
    print("Starting database initialization...")
    
    await add_sample_stock_data()
    await add_sample_portfolios()
    
    print("Database initialization completed!")


if __name__ == "__main__":
    asyncio.run(main())
