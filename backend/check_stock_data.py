from sqlmodel import Session, select
from app.core.db import engine
from app.model.company import Company
from app.model.stock import StockData

def check_stock_data():
    with Session(engine) as session:
        # Get a few companies
        companies = session.exec(select(Company).limit(5)).all()
        print(f"Found {len(companies)} companies.")
        
        for company in companies:
            print(f"Checking data for {company.trading_code}...")
            stock_data = session.exec(
                select(StockData)
                .where(StockData.company_id == company.id)
                .order_by(StockData.timestamp.desc())
                .limit(1)
            ).first()
            
            if stock_data:
                print(f"  - Latest data: {stock_data.timestamp}, Price: {stock_data.last_trade_price}")
            else:
                print(f"  - No StockData found!")

if __name__ == "__main__":
    check_stock_data()
