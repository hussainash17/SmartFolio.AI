import asyncio
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

import aiohttp
from bs4 import BeautifulSoup
from sqlmodel import Session, select

from app.core.db import get_session
from app.model.stock import (
    StockCompany,
    StockData,
    IntradayTick,
    DailyOHLC,
    MarketSummary,
)

logger = logging.getLogger(__name__)


class DSEScraper:
    """DSE (Dhaka Stock Exchange) Data Scraper"""
    
    def __init__(self):
        self.base_url = "https://www.dsebd.org"
        self.session: Optional[aiohttp.ClientSession] = None
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(headers=self.headers)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def get_market_summary(self) -> Optional[Dict]:
        """Fetch market summary from DSE homepage"""
        try:
            url = f"{self.base_url}/"
            async with self.session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Extract DSE index data
                    dse_index_elem = soup.find('span', {'class': 'dse-index'})
                    dse_change_elem = soup.find('span', {'class': 'dse-change'})
                    
                    dse_index = None
                    dse_change = None
                    dse_change_percent = None
                    
                    if dse_index_elem:
                        dse_index = Decimal(dse_index_elem.text.strip().replace(',', ''))
                    
                    if dse_change_elem:
                        change_text = dse_change_elem.text.strip()
                        if '(' in change_text and ')' in change_text:
                            change_parts = change_text.strip('()').split()
                            if len(change_parts) >= 2:
                                dse_change = Decimal(change_parts[0])
                                dse_change_percent = Decimal(change_parts[1].replace('%', ''))
                    
                    # Extract market statistics
                    stats_table = soup.find('table', {'class': 'market-stats'})
                    total_trades = 0
                    total_volume = 0
                    total_turnover = 0
                    advancers = 0
                    decliners = 0
                    unchanged = 0
                    
                    if stats_table:
                        rows = stats_table.find_all('tr')
                        for row in rows:
                            cells = row.find_all('td')
                            if len(cells) >= 2:
                                label = cells[0].text.strip().lower()
                                value = cells[1].text.strip().replace(',', '')
                                
                                if 'total trades' in label:
                                    total_trades = int(value)
                                elif 'total volume' in label:
                                    total_volume = int(value)
                                elif 'total turnover' in label:
                                    total_turnover = Decimal(value)
                                elif 'advancers' in label:
                                    advancers = int(value)
                                elif 'decliners' in label:
                                    decliners = int(value)
                                elif 'unchanged' in label:
                                    unchanged = int(value)
                    
                    return {
                        'dse_index': dse_index,
                        'dse_index_change': dse_change,
                        'dse_index_change_percent': dse_change_percent,
                        'total_trades': total_trades,
                        'total_volume': total_volume,
                        'total_turnover': total_turnover,
                        'advancers': advancers,
                        'decliners': decliners,
                        'unchanged': unchanged,
                    }
                    
        except Exception as e:
            logger.error(f"Error fetching market summary: {e}")
            return None
    
    async def get_stock_data(self, symbol: str) -> Optional[Dict]:
        """Fetch individual stock data"""
        try:
            url = f"{self.base_url}/displayCompany.php?name={symbol}"
            async with self.session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Extract stock price data
                    price_table = soup.find('table', {'class': 'price-table'})
                    if not price_table:
                        return None
                    
                    stock_data = {}
                    rows = price_table.find_all('tr')
                    
                    for row in rows:
                        cells = row.find_all('td')
                        if len(cells) >= 2:
                            label = cells[0].text.strip().lower()
                            value = cells[1].text.strip().replace(',', '')
                            
                            if 'last trade price' in label:
                                stock_data['last_trade_price'] = Decimal(value)
                            elif 'change' in label and 'percent' not in label:
                                stock_data['change'] = Decimal(value)
                            elif 'change percent' in label:
                                stock_data['change_percent'] = Decimal(value.replace('%', ''))
                            elif 'high' in label:
                                stock_data['high'] = Decimal(value)
                            elif 'low' in label:
                                stock_data['low'] = Decimal(value)
                            elif 'open' in label:
                                stock_data['open_price'] = Decimal(value)
                            elif 'previous close' in label:
                                stock_data['previous_close'] = Decimal(value)
                            elif 'volume' in label:
                                stock_data['volume'] = int(value)
                            elif 'turnover' in label:
                                stock_data['turnover'] = Decimal(value)
                            elif 'trades' in label:
                                stock_data['trades_count'] = int(value)
                    
                    return stock_data
                    
        except Exception as e:
            logger.error(f"Error fetching stock data for {symbol}: {e}")
            return None
    
    async def get_top_gainers_losers(self) -> Dict:
        """Fetch top gainers and losers"""
        try:
            url = f"{self.base_url}/top_gainers_losers.php"
            async with self.session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    gainers = []
                    losers = []
                    
                    # Extract top gainers
                    gainers_table = soup.find('table', {'id': 'top-gainers'})
                    if gainers_table:
                        rows = gainers_table.find_all('tr')[1:]  # Skip header
                        for row in rows:
                            cells = row.find_all('td')
                            if len(cells) >= 4:
                                gainers.append({
                                    'symbol': cells[0].text.strip(),
                                    'last_price': Decimal(cells[1].text.strip().replace(',', '')),
                                    'change': Decimal(cells[2].text.strip().replace(',', '')),
                                    'change_percent': Decimal(cells[3].text.strip().replace('%', ''))
                                })
                    
                    # Extract top losers
                    losers_table = soup.find('table', {'id': 'top-losers'})
                    if losers_table:
                        rows = losers_table.find_all('tr')[1:]  # Skip header
                        for row in rows:
                            cells = row.find_all('td')
                            if len(cells) >= 4:
                                losers.append({
                                    'symbol': cells[0].text.strip(),
                                    'last_price': Decimal(cells[1].text.strip().replace(',', '')),
                                    'change': Decimal(cells[2].text.strip().replace(',', '')),
                                    'change_percent': Decimal(cells[3].text.strip().replace('%', ''))
                                })
                    
                    return {'gainers': gainers, 'losers': losers}
                    
        except Exception as e:
            logger.error(f"Error fetching top gainers/losers: {e}")
            return {'gainers': [], 'losers': []}
    
    async def get_all_stocks_data(self) -> List[Dict]:
        """Fetch data for all active stocks"""
        try:
            url = f"{self.base_url}/market_summary.php"
            async with self.session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    stocks_data = []
                    table = soup.find('table', {'class': 'market-summary'})
                    
                    if table:
                        rows = table.find_all('tr')[1:]  # Skip header
                        for row in rows:
                            cells = row.find_all('td')
                            if len(cells) >= 8:
                                try:
                                    stock_data = {
                                        'symbol': cells[0].text.strip(),
                                        'last_trade_price': Decimal(cells[1].text.strip().replace(',', '')),
                                        'change': Decimal(cells[2].text.strip().replace(',', '')),
                                        'change_percent': Decimal(cells[3].text.strip().replace('%', '')),
                                        'high': Decimal(cells[4].text.strip().replace(',', '')),
                                        'low': Decimal(cells[5].text.strip().replace(',', '')),
                                        'volume': int(cells[6].text.strip().replace(',', '')),
                                        'turnover': Decimal(cells[7].text.strip().replace(',', ''))
                                    }
                                    stocks_data.append(stock_data)
                                except (ValueError, IndexError) as e:
                                    logger.warning(f"Error parsing stock row: {e}")
                                    continue
                    
                    return stocks_data
                    
        except Exception as e:
            logger.error(f"Error fetching all stocks data: {e}")
            return []
    
    async def save_market_summary(self, db: Session, summary_data: Dict):
        """Save market summary to database"""
        try:
            market_summary = MarketSummary(
                date=datetime.utcnow(),
                total_trades=summary_data.get('total_trades', 0),
                total_volume=summary_data.get('total_volume', 0),
                total_turnover=summary_data.get('total_turnover', 0),
                dse_index=summary_data.get('dse_index'),
                dse_index_change=summary_data.get('dse_index_change'),
                dse_index_change_percent=summary_data.get('dse_index_change_percent'),
                advancers=summary_data.get('advancers', 0),
                decliners=summary_data.get('decliners', 0),
                unchanged=summary_data.get('unchanged', 0)
            )
            
            db.add(market_summary)
            db.commit()
            db.refresh(market_summary)
            
            logger.info(f"Saved market summary: {market_summary.id}")
            
        except Exception as e:
            logger.error(f"Error saving market summary: {e}")
            db.rollback()
    
    async def save_stock_data(self, db: Session, symbol: str, stock_data: Dict):
        """Save stock data to database"""
        try:
            # Get or create stock company
            stmt = select(StockCompany).where(StockCompany.symbol == symbol)
            company = db.exec(stmt).first()
            
            if not company:
                logger.warning(f"Stock company not found for symbol: {symbol}")
                return
            
            # Save real-time stock data
            stock_data_record = StockData(
                company_id=company.id,
                last_trade_price=stock_data.get('last_trade_price', 0),
                change=stock_data.get('change', 0),
                change_percent=stock_data.get('change_percent', 0),
                high=stock_data.get('high', 0),
                low=stock_data.get('low', 0),
                open_price=stock_data.get('open_price', 0),
                previous_close=stock_data.get('previous_close', 0),
                volume=stock_data.get('volume', 0),
                turnover=stock_data.get('turnover', 0),
                trades_count=stock_data.get('trades_count', 0)
            )
            
            db.add(stock_data_record)
            
            # Save intraday tick data
            if stock_data.get('last_trade_price'):
                tick_data = IntradayTick(
                    company_id=company.id,
                    price=stock_data['last_trade_price'],
                    volume=stock_data.get('volume', 0)
                )
                db.add(tick_data)
            
            db.commit()
            logger.info(f"Saved stock data for {symbol}")
            
        except Exception as e:
            logger.error(f"Error saving stock data for {symbol}: {e}")
            db.rollback()
    
    async def aggregate_daily_data(self, db: Session, date: datetime):
        """Aggregate intraday ticks into daily OHLC data"""
        try:
            # Get all companies
            companies = db.exec(select(StockCompany)).all()
            
            for company in companies:
                # Get all ticks for the day
                start_time = date.replace(hour=0, minute=0, second=0, microsecond=0)
                end_time = start_time + timedelta(days=1)
                
                stmt = select(IntradayTick).where(
                    IntradayTick.company_id == company.id,
                    IntradayTick.timestamp >= start_time,
                    IntradayTick.timestamp < end_time
                ).order_by(IntradayTick.timestamp)
                
                ticks = db.exec(stmt).all()
                
                if ticks:
                    # Calculate OHLC
                    prices = [tick.price for tick in ticks]
                    volumes = [tick.volume for tick in ticks]
                    
                    open_price = prices[0]
                    high = max(prices)
                    low = min(prices)
                    close_price = prices[-1]
                    total_volume = sum(volumes)
                    
                    # Get previous day's close
                    prev_day = start_time - timedelta(days=1)
                    prev_stmt = select(DailyOHLC).where(
                        DailyOHLC.company_id == company.id,
                        DailyOHLC.date < start_time
                    ).order_by(DailyOHLC.date.desc()).limit(1)
                    
                    prev_data = db.exec(prev_stmt).first()
                    previous_close = prev_data.close_price if prev_data else open_price
                    
                    change = close_price - previous_close
                    change_percent = (change / previous_close * 100) if previous_close > 0 else 0
                    
                    # Save daily OHLC
                    daily_data = DailyOHLC(
                        company_id=company.id,
                        date=start_time,
                        open_price=open_price,
                        high=high,
                        low=low,
                        close_price=close_price,
                        volume=total_volume,
                        change=change,
                        change_percent=change_percent
                    )
                    
                    db.add(daily_data)
            
            db.commit()
            logger.info(f"Aggregated daily data for {date.date()}")
            
        except Exception as e:
            logger.error(f"Error aggregating daily data: {e}")
            db.rollback()


async def run_dse_scraper():
    """Main function to run DSE scraper"""
    async with DSEScraper() as scraper:
        db = next(get_session())
        
        try:
            # Fetch and save market summary
            summary = await scraper.get_market_summary()
            if summary:
                await scraper.save_market_summary(db, summary)
            
            # Fetch and save all stocks data
            stocks_data = await scraper.get_all_stocks_data()
            for stock_data in stocks_data:
                symbol = stock_data.get('symbol')
                if symbol:
                    await scraper.save_stock_data(db, symbol, stock_data)
            
            logger.info("DSE scraper completed successfully")
            
        except Exception as e:
            logger.error(f"Error in DSE scraper: {e}")
        finally:
            db.close()


if __name__ == "__main__":
    asyncio.run(run_dse_scraper()) 