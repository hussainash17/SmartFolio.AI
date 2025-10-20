"""
Benchmark Data Service

This module handles fetching and caching benchmark data.
Supports both DSE (Dhaka Stock Exchange) indices and external sources.
"""

from typing import List, Dict, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlmodel import Session, select, and_, func

try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False

from app.model.performance import Benchmark, BenchmarkData
from app.model.stock import MarketSummary


class BenchmarkService:
    """Service for fetching and caching benchmark data"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_benchmark_returns(
        self,
        benchmark_id: str,
        start_date: date,
        end_date: date,
        frequency: str = 'daily'
    ) -> List[Dict]:
        """
        Get benchmark returns for a date range.
        
        First tries to get from cache, then fetches from external source if needed.
        """
        # Check if data exists in cache
        statement = select(BenchmarkData).where(
            and_(
                BenchmarkData.benchmark_id == benchmark_id,
                BenchmarkData.date >= start_date,
                BenchmarkData.date <= end_date
            )
        ).order_by(BenchmarkData.date)
        
        cached_data = self.db.exec(statement).all()
        
        # Calculate number of expected trading days (roughly)
        expected_days = (end_date - start_date).days
        
        # If cache is incomplete, fetch fresh data
        if len(cached_data) < expected_days * 0.6:  # If less than 60% of days have data
            self._fetch_and_cache_benchmark_data(benchmark_id, start_date, end_date)
            # Re-query after fetching
            cached_data = self.db.exec(statement).all()
        
        # Convert to return format
        results = []
        initial_value = None
        
        for i, data in enumerate(cached_data):
            if i == 0:
                initial_value = float(data.close_value)
            
            cumulative_return = 0.0
            if initial_value and initial_value > 0:
                cumulative_return = (float(data.close_value) - initial_value) / initial_value * 100
            
            results.append({
                'date': data.date.isoformat(),
                'value': float(data.close_value),
                'return_1d': float(data.return_1d) if data.return_1d else 0.0,
                'cumulative_return': cumulative_return
            })
        
        return results
    
    def sync_benchmark_data(self, benchmark_id: str, days: int = 365):
        """
        Fetch and cache latest benchmark data.
        
        Args:
            benchmark_id: Benchmark identifier (e.g., 'sp500')
            days: Number of days of historical data to fetch
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        self._fetch_and_cache_benchmark_data(benchmark_id, start_date, end_date)
    
    def _fetch_and_cache_benchmark_data(
        self,
        benchmark_id: str,
        start_date: date,
        end_date: date
    ):
        """
        Fetch benchmark data from appropriate source and cache it.
        Supports both DSE indices (from marketsummary) and external sources.
        """
        # Get benchmark details
        benchmark = self.db.get(Benchmark, benchmark_id)
        if not benchmark:
            raise ValueError(f"Benchmark {benchmark_id} not found")
        
        # Check data source
        if benchmark.data_source == 'dse':
            # Fetch from local DSE data
            self._fetch_dse_index_data(benchmark_id, benchmark.ticker, start_date, end_date)
        else:
            # Fetch from external source (Yahoo Finance)
            self._fetch_external_benchmark_data(benchmark_id, benchmark.ticker, start_date, end_date)
    
    def _fetch_dse_index_data(
        self,
        benchmark_id: str,
        ticker: str,
        start_date: date,
        end_date: date
    ):
        """
        Fetch DSE index data from marketsummary table.
        
        Supports: DSEX, DS30, DSES
        """
        try:
            # Map ticker to marketsummary column
            index_column_map = {
                'DSEX': 'dse_index',
                'DS30': 'dse_index',  # Placeholder - use DSEX if DS30 not available
                'DSES': 'dse_index',  # Placeholder - use DSEX if DSES not available
            }
            
            if ticker not in index_column_map:
                print(f"Unknown DSE ticker: {ticker}")
                return
            
            # Query marketsummary for index data
            statement = select(MarketSummary).where(
                and_(
                    func.date(MarketSummary.date) >= start_date,
                    func.date(MarketSummary.date) <= end_date
                )
            ).order_by(MarketSummary.date)
            
            market_data = self.db.exec(statement).all()
            
            if not market_data:
                print(f"No market data found for {ticker}")
                return
            
            # Process and store data
            prev_close = None
            initial_value = None
            
            for data in market_data:
                data_date = data.date.date() if hasattr(data.date, 'date') else data.date
                close_value = float(data.dse_index) if data.dse_index else None
                
                if close_value is None:
                    continue
                
                if initial_value is None:
                    initial_value = close_value
                
                # Calculate daily return
                return_1d = None
                if prev_close is not None and prev_close > 0:
                    return_1d = (close_value - prev_close) / prev_close
                
                # Calculate cumulative return
                return_cumulative = None
                if initial_value and initial_value > 0:
                    return_cumulative = (close_value - initial_value) / initial_value
                
                # Check if data already exists
                existing = self.db.exec(
                    select(BenchmarkData).where(
                        and_(
                            BenchmarkData.benchmark_id == benchmark_id,
                            BenchmarkData.date == data_date
                        )
                    )
                ).first()
                
                if existing:
                    # Update existing record
                    existing.close_value = Decimal(str(close_value))
                    existing.return_1d = Decimal(str(return_1d)) if return_1d is not None else None
                    existing.return_cumulative = Decimal(str(return_cumulative)) if return_cumulative is not None else None
                    existing.volume = data.total_volume if data.total_volume else None
                else:
                    # Create new record
                    benchmark_data = BenchmarkData(
                        benchmark_id=benchmark_id,
                        date=data_date,
                        close_value=Decimal(str(close_value)),
                        return_1d=Decimal(str(return_1d)) if return_1d is not None else None,
                        return_cumulative=Decimal(str(return_cumulative)) if return_cumulative is not None else None,
                        volume=data.total_volume if data.total_volume else None
                    )
                    self.db.add(benchmark_data)
                
                prev_close = close_value
            
            # Commit all changes
            self.db.commit()
            print(f"Successfully synced DSE index data for {benchmark_id}")
            
        except Exception as e:
            print(f"Error fetching DSE index data for {benchmark_id}: {str(e)}")
            self.db.rollback()
    
    def _fetch_external_benchmark_data(
        self,
        benchmark_id: str,
        ticker: str,
        start_date: date,
        end_date: date
    ):
        """
        Fetch benchmark data from external source (Yahoo Finance).
        """
        if not YFINANCE_AVAILABLE:
            print("yfinance not installed. Skipping external benchmark sync.")
            return
        
        if not ticker:
            return  # Can't fetch without ticker
        
        try:
            # Fetch data from Yahoo Finance
            ticker_data = yf.download(
                ticker,
                start=start_date,
                end=end_date,
                progress=False
            )
            
            if ticker_data.empty:
                print(f"No data returned for {benchmark.ticker}")
                return
            
            # Reset index to get date as column
            ticker_data = ticker_data.reset_index()
            
            # Process and store data
            prev_close = None
            initial_value = None
            
            for _, row in ticker_data.iterrows():
                data_date = row['Date'].date() if hasattr(row['Date'], 'date') else row['Date']
                close_value = float(row['Close'])
                
                if initial_value is None:
                    initial_value = close_value
                
                # Calculate daily return
                return_1d = None
                if prev_close is not None and prev_close > 0:
                    return_1d = (close_value - prev_close) / prev_close
                
                # Calculate cumulative return
                return_cumulative = None
                if initial_value and initial_value > 0:
                    return_cumulative = (close_value - initial_value) / initial_value
                
                # Check if data already exists
                existing = self.db.exec(
                    select(BenchmarkData).where(
                        and_(
                            BenchmarkData.benchmark_id == benchmark_id,
                            BenchmarkData.date == data_date
                        )
                    )
                ).first()
                
                if existing:
                    # Update existing record
                    existing.close_value = Decimal(str(close_value))
                    existing.return_1d = Decimal(str(return_1d)) if return_1d is not None else None
                    existing.return_cumulative = Decimal(str(return_cumulative)) if return_cumulative is not None else None
                    existing.volume = int(row.get('Volume', 0))
                else:
                    # Create new record
                    benchmark_data = BenchmarkData(
                        benchmark_id=benchmark_id,
                        date=data_date,
                        close_value=Decimal(str(close_value)),
                        return_1d=Decimal(str(return_1d)) if return_1d is not None else None,
                        return_cumulative=Decimal(str(return_cumulative)) if return_cumulative is not None else None,
                        volume=int(row.get('Volume', 0))
                    )
                    self.db.add(benchmark_data)
                
                prev_close = close_value
            
            # Commit all changes
            self.db.commit()
            print(f"Successfully synced benchmark data for {benchmark_id}")
            
        except Exception as e:
            print(f"Error fetching benchmark data for {benchmark_id}: {str(e)}")
            self.db.rollback()
    
    def get_all_benchmarks(self) -> List[Benchmark]:
        """Get list of all active benchmarks."""
        statement = select(Benchmark).where(Benchmark.is_active == True)
        return self.db.exec(statement).all()
    
    def create_benchmark(
        self,
        benchmark_id: str,
        name: str,
        ticker: str,
        description: Optional[str] = None,
        asset_class: Optional[str] = None,
        region: Optional[str] = None
    ) -> Benchmark:
        """Create a new benchmark."""
        benchmark = Benchmark(
            id=benchmark_id,
            name=name,
            ticker=ticker,
            description=description,
            asset_class=asset_class,
            region=region,
            data_source='yahoo_finance',
            is_active=True
        )
        self.db.add(benchmark)
        self.db.commit()
        self.db.refresh(benchmark)
        
        # Fetch initial data
        self.sync_benchmark_data(benchmark_id, days=365)
        
        return benchmark

