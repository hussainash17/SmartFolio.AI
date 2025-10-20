# Portfolio Performance API - Step-by-Step Implementation Guide

This guide will walk you through implementing the Portfolio Performance APIs in your existing FastAPI backend.

## Prerequisites

- ✅ Existing FastAPI backend with SQLAlchemy
- ✅ Portfolio and Trade models already implemented
- ✅ User authentication working
- ✅ Stock price data available

---

## Phase 1: Database Setup (Day 1-2)

### Step 1: Create Database Migration

Create a new Alembic migration for performance-related tables:

```bash
cd backend
alembic revision -m "add_portfolio_performance_tables"
```

### Step 2: Add Migration Code

Edit the generated migration file in `backend/app/alembic/versions/`:

```python
"""add_portfolio_performance_tables

Revision ID: xxxxx
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

def upgrade():
    # Portfolio Daily Valuations
    op.create_table(
        'portfolio_daily_valuations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('portfolio_id', UUID(as_uuid=True), sa.ForeignKey('portfolios.id'), nullable=False),
        sa.Column('valuation_date', sa.Date(), nullable=False),
        sa.Column('total_value', sa.Numeric(15, 2), nullable=False),
        sa.Column('cash_value', sa.Numeric(15, 2)),
        sa.Column('securities_value', sa.Numeric(15, 2)),
        sa.Column('daily_return', sa.Numeric(10, 6)),
        sa.Column('cumulative_return', sa.Numeric(10, 6)),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('portfolio_id', 'valuation_date', name='uq_portfolio_date')
    )
    op.create_index('idx_portfolio_valuations_date', 'portfolio_daily_valuations', 
                    ['portfolio_id', 'valuation_date'])
    
    # Benchmark Data
    op.create_table(
        'benchmark_data',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('benchmark_id', sa.String(50), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('close_value', sa.Numeric(15, 4), nullable=False),
        sa.Column('return_1d', sa.Numeric(10, 6)),
        sa.Column('return_cumulative', sa.Numeric(10, 6)),
        sa.Column('volume', sa.BigInteger()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('benchmark_id', 'date', name='uq_benchmark_date')
    )
    op.create_index('idx_benchmark_data_date', 'benchmark_data', 
                    ['benchmark_id', 'date'])
    
    # Performance Cache
    op.create_table(
        'portfolio_performance_cache',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('portfolio_id', UUID(as_uuid=True), sa.ForeignKey('portfolios.id'), nullable=False),
        sa.Column('period', sa.String(10), nullable=False),
        sa.Column('benchmark_id', sa.String(50)),
        sa.Column('calculation_date', sa.Date(), nullable=False),
        sa.Column('metrics', JSONB, nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('portfolio_id', 'period', 'benchmark_id', 'calculation_date',
                          name='uq_perf_cache')
    )
    op.create_index('idx_performance_cache_lookup', 'portfolio_performance_cache',
                    ['portfolio_id', 'period', 'benchmark_id', 'calculation_date'])
    
    # Benchmarks Definition
    op.create_table(
        'benchmarks',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('ticker', sa.String(20)),
        sa.Column('description', sa.Text()),
        sa.Column('asset_class', sa.String(50)),
        sa.Column('region', sa.String(50)),
        sa.Column('data_source', sa.String(50)),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )
    
    # Insert default benchmarks
    op.execute("""
        INSERT INTO benchmarks (id, name, ticker, asset_class, region, data_source) VALUES
        ('sp500', 'S&P 500', '^GSPC', 'equity', 'US', 'yahoo_finance'),
        ('nasdaq', 'NASDAQ Composite', '^IXIC', 'equity', 'US', 'yahoo_finance'),
        ('dow', 'Dow Jones Industrial Average', '^DJI', 'equity', 'US', 'yahoo_finance'),
        ('msci_world', 'MSCI World', 'URTH', 'equity', 'Global', 'yahoo_finance'),
        ('russell2000', 'Russell 2000', '^RUT', 'equity', 'US', 'yahoo_finance'),
        ('us_bonds', 'US Aggregate Bonds', 'AGG', 'fixed_income', 'US', 'yahoo_finance')
    """)

def downgrade():
    op.drop_table('portfolio_performance_cache')
    op.drop_table('portfolio_daily_valuations')
    op.drop_table('benchmark_data')
    op.drop_table('benchmarks')
```

### Step 3: Run Migration

```bash
alembic upgrade head
```

---

## Phase 2: Create SQLAlchemy Models (Day 2)

### Step 4: Add Models

Create `backend/app/model/performance.py`:

```python
from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, Boolean, Text, BigInteger, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.db import Base
import uuid

class PortfolioDailyValuation(Base):
    __tablename__ = 'portfolio_daily_valuations'
    
    id = Column(Integer, primary_key=True)
    portfolio_id = Column(UUID(as_uuid=True), ForeignKey('portfolios.id'), nullable=False)
    valuation_date = Column(Date, nullable=False)
    total_value = Column(Numeric(15, 2), nullable=False)
    cash_value = Column(Numeric(15, 2))
    securities_value = Column(Numeric(15, 2))
    daily_return = Column(Numeric(10, 6))
    cumulative_return = Column(Numeric(10, 6))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('portfolio_id', 'valuation_date', name='uq_portfolio_date'),
        Index('idx_portfolio_valuations_date', 'portfolio_id', 'valuation_date'),
    )

class BenchmarkData(Base):
    __tablename__ = 'benchmark_data'
    
    id = Column(Integer, primary_key=True)
    benchmark_id = Column(String(50), nullable=False)
    date = Column(Date, nullable=False)
    close_value = Column(Numeric(15, 4), nullable=False)
    return_1d = Column(Numeric(10, 6))
    return_cumulative = Column(Numeric(10, 6))
    volume = Column(BigInteger)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('benchmark_id', 'date', name='uq_benchmark_date'),
        Index('idx_benchmark_data_date', 'benchmark_id', 'date'),
    )

class Benchmark(Base):
    __tablename__ = 'benchmarks'
    
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    ticker = Column(String(20))
    description = Column(Text)
    asset_class = Column(String(50))
    region = Column(String(50))
    data_source = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PortfolioPerformanceCache(Base):
    __tablename__ = 'portfolio_performance_cache'
    
    id = Column(Integer, primary_key=True)
    portfolio_id = Column(UUID(as_uuid=True), ForeignKey('portfolios.id'), nullable=False)
    period = Column(String(10), nullable=False)
    benchmark_id = Column(String(50))
    calculation_date = Column(Date, nullable=False)
    metrics = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('portfolio_id', 'period', 'benchmark_id', 'calculation_date', 
                        name='uq_perf_cache'),
        Index('idx_performance_cache_lookup', 'portfolio_id', 'period', 
              'benchmark_id', 'calculation_date'),
    )
```

---

## Phase 3: Install Dependencies (Day 2)

### Step 5: Add Required Packages

Add to your `pyproject.toml` or `requirements.txt`:

```toml
# pyproject.toml
[project.dependencies]
numpy = ">=1.24.0"
pandas = ">=2.0.0"
scipy = ">=1.10.0"
yfinance = ">=0.2.28"
```

Or if using requirements.txt:
```bash
uv pip install numpy pandas scipy yfinance
```

---

## Phase 4: Implement Core Service (Day 3-4)

### Step 6: Copy Performance Calculator

The `performance_calculator.py` file has been created at:
- `backend/app/services/performance_calculator.py`

### Step 7: Implement Helper Methods

Update the `_get_*` helper methods in `performance_calculator.py` based on your schema:

```python
# Example implementation for _get_daily_valuations
def _get_daily_valuations(
    self,
    portfolio_id: str,
    start_date: date,
    end_date: date
) -> List[Dict]:
    """Get daily portfolio valuations from database."""
    from app.model.performance import PortfolioDailyValuation
    
    valuations = self.db.query(PortfolioDailyValuation).filter(
        PortfolioDailyValuation.portfolio_id == portfolio_id,
        PortfolioDailyValuation.valuation_date >= start_date,
        PortfolioDailyValuation.valuation_date <= end_date
    ).order_by(PortfolioDailyValuation.valuation_date).all()
    
    return [
        {
            'date': v.valuation_date,
            'value': float(v.total_value),
            'daily_return': float(v.daily_return) if v.daily_return else 0.0
        }
        for v in valuations
    ]

# Example for _get_portfolio_value_on_date
def _get_portfolio_value_on_date(
    self,
    portfolio_id: str,
    target_date: date
) -> float:
    """Calculate portfolio total value on a specific date."""
    from app.model.portfolio import Portfolio
    from app.model.stock import Stock  # Your stock model
    
    portfolio = self.db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        return 0.0
    
    total_value = 0.0
    for holding in portfolio.stocks:
        # Get stock price on target_date
        price = self._get_stock_price(holding.symbol, target_date)
        if price:
            total_value += holding.quantity * price
    
    # Add cash if tracked separately
    total_value += float(portfolio.cash_balance or 0)
    
    return total_value
```

---

## Phase 5: Create API Endpoints (Day 5-6)

### Step 8: Create Performance Router

Create `backend/app/api/routes/performance.py`:

```python
from typing import Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_db
from app.model.user import User
from app.services.performance_calculator import PerformanceCalculator
from pydantic import BaseModel

router = APIRouter()

# Response Models
class PerformanceSummaryResponse(BaseModel):
    portfolio_id: str
    portfolio_name: str
    period: str
    summary: dict

class ValueHistoryPoint(BaseModel):
    date: date
    portfolio_value: float
    portfolio_return: float
    portfolio_cumulative_return: float
    benchmark_value: Optional[float] = None
    benchmark_return: Optional[float] = None
    benchmark_cumulative_return: Optional[float] = None

class ValueHistoryResponse(BaseModel):
    portfolio_id: str
    benchmark_id: Optional[str]
    benchmark_name: Optional[str]
    frequency: str
    data: list[ValueHistoryPoint]


# Helper function to parse period
def get_date_range_from_period(period: str) -> tuple[date, date]:
    """Convert period string to start_date and end_date."""
    end_date = date.today()
    
    if period == "1W":
        start_date = end_date - timedelta(weeks=1)
    elif period == "1M":
        start_date = end_date - timedelta(days=30)
    elif period == "3M":
        start_date = end_date - timedelta(days=90)
    elif period == "6M":
        start_date = end_date - timedelta(days=180)
    elif period == "YTD":
        start_date = date(end_date.year, 1, 1)
    elif period == "1Y":
        start_date = end_date - timedelta(days=365)
    elif period == "3Y":
        start_date = end_date - timedelta(days=365*3)
    elif period == "5Y":
        start_date = end_date - timedelta(days=365*5)
    elif period == "ALL":
        start_date = date(2020, 1, 1)  # Or use portfolio inception date
    else:
        start_date = end_date - timedelta(days=365)  # Default to 1Y
    
    return start_date, end_date


# API Endpoints
@router.get("/portfolios/{portfolio_id}/performance/summary", response_model=PerformanceSummaryResponse)
def get_portfolio_performance_summary(
    portfolio_id: str,
    period: str = Query("YTD", regex="^(1W|1M|3M|6M|YTD|1Y|3Y|5Y|ALL)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get portfolio performance summary including TWR, MWR, and key metrics.
    """
    from app.model.portfolio import Portfolio
    
    # Verify portfolio belongs to user
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Calculate date range
    start_date, end_date = get_date_range_from_period(period)
    
    # Initialize calculator
    calc = PerformanceCalculator(db)
    
    # Calculate returns
    twr = calc.calculate_time_weighted_return(portfolio_id, start_date, end_date)
    mwr = calc.calculate_money_weighted_return(portfolio_id, start_date, end_date)
    
    # Get valuations for additional metrics
    valuations = calc._get_daily_valuations(portfolio_id, start_date, end_date)
    
    if not valuations:
        raise HTTPException(status_code=400, detail="Insufficient data for performance calculation")
    
    returns = [v['daily_return'] for v in valuations if v['daily_return']]
    
    # Calculate risk metrics
    volatility = calc.calculate_volatility(returns, annualize=True)
    sharpe = calc.calculate_sharpe_ratio(twr, volatility)
    sortino = calc.calculate_sortino_ratio(twr, returns)
    max_dd = calc.calculate_max_drawdown(valuations)
    
    # Calculate days since inception
    days = (end_date - start_date).days
    annualized_return = calc.annualize_return(twr, days)
    
    # Build response
    return {
        "portfolio_id": portfolio_id,
        "portfolio_name": portfolio.name,
        "period": period,
        "summary": {
            "total_value": float(valuations[-1]['value']),
            "total_cost": float(valuations[0]['value']),
            "cumulative_return": float(valuations[-1]['value'] - valuations[0]['value']),
            "cumulative_return_percent": twr * 100,
            "time_weighted_return": twr * 100,
            "money_weighted_return": mwr * 100,
            "annualized_return": annualized_return * 100,
            "sharpe_ratio": sharpe,
            "sortino_ratio": sortino,
            "volatility": volatility * 100,
            "max_drawdown": max_dd['max_drawdown_percent'],
            "inception_date": str(start_date),
            "days_since_inception": days
        }
    }


@router.get("/portfolios/{portfolio_id}/performance/value-history", response_model=ValueHistoryResponse)
def get_portfolio_value_history(
    portfolio_id: str,
    period: str = Query("YTD", regex="^(1W|1M|3M|6M|YTD|1Y|3Y|5Y|ALL)$"),
    benchmark_id: Optional[str] = Query(None),
    frequency: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get portfolio value over time with optional benchmark comparison.
    """
    from app.model.portfolio import Portfolio
    
    # Verify portfolio
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Calculate date range
    start_date, end_date = get_date_range_from_period(period)
    
    # Get portfolio data
    calc = PerformanceCalculator(db)
    portfolio_data = calc.calculate_cumulative_returns(
        portfolio_id, start_date, end_date, frequency
    )
    
    # TODO: Get benchmark data if requested
    # benchmark_data = calc.get_benchmark_returns(benchmark_id, start_date, end_date)
    
    return {
        "portfolio_id": portfolio_id,
        "benchmark_id": benchmark_id,
        "benchmark_name": None,  # TODO: Get from benchmarks table
        "frequency": frequency,
        "data": portfolio_data
    }


@router.get("/portfolios/{portfolio_id}/performance/monthly-returns")
def get_monthly_returns(
    portfolio_id: str,
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get month-by-month returns for a portfolio.
    """
    from app.model.portfolio import Portfolio
    
    # Verify portfolio
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Use current year if not specified
    if not year:
        year = datetime.now().year
    
    # Get data for the year
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)
    
    calc = PerformanceCalculator(db)
    monthly_data = calc.calculate_cumulative_returns(
        portfolio_id, start_date, end_date, frequency='monthly'
    )
    
    # TODO: Process into monthly returns format
    
    return {
        "portfolio_id": portfolio_id,
        "year": year,
        "monthly_returns": monthly_data
    }


@router.get("/benchmarks")
def get_available_benchmarks(
    db: Session = Depends(get_db)
):
    """
    Get list of available benchmarks for comparison.
    """
    from app.model.performance import Benchmark
    
    benchmarks = db.query(Benchmark).filter(Benchmark.is_active == True).all()
    
    return {
        "benchmarks": [
            {
                "id": b.id,
                "name": b.name,
                "ticker": b.ticker,
                "description": b.description,
                "asset_class": b.asset_class,
                "region": b.region
            }
            for b in benchmarks
        ]
    }
```

### Step 9: Register Router

Update `backend/app/api/main.py`:

```python
from app.api.routes import performance

api_router.include_router(
    performance.router,
    prefix="/api",
    tags=["performance"]
)
```

---

## Phase 6: Create Background Tasks (Day 7)

### Step 10: Daily Valuation Calculator

Create `backend/app/services/daily_valuation.py`:

```python
from datetime import date, datetime
from sqlalchemy.orm import Session
from app.model.portfolio import Portfolio
from app.model.performance import PortfolioDailyValuation

def calculate_and_store_daily_valuations(db: Session):
    """
    Calculate portfolio valuations for all portfolios and store them.
    Should be run daily (e.g., via cron or Celery beat).
    """
    today = date.today()
    
    # Get all active portfolios
    portfolios = db.query(Portfolio).filter(Portfolio.is_active == True).all()
    
    for portfolio in portfolios:
        # Check if valuation already exists for today
        existing = db.query(PortfolioDailyValuation).filter(
            PortfolioDailyValuation.portfolio_id == portfolio.id,
            PortfolioDailyValuation.valuation_date == today
        ).first()
        
        if existing:
            continue  # Already calculated
        
        # Calculate portfolio value
        total_value = 0.0
        securities_value = 0.0
        
        for holding in portfolio.stocks:
            # Get current price
            price = get_current_stock_price(holding.symbol)
            if price:
                value = holding.quantity * price
                securities_value += value
                total_value += value
        
        cash_value = float(portfolio.cash_balance or 0)
        total_value += cash_value
        
        # Get yesterday's valuation for return calculation
        yesterday = db.query(PortfolioDailyValuation).filter(
            PortfolioDailyValuation.portfolio_id == portfolio.id
        ).order_by(PortfolioDailyValuation.valuation_date.desc()).first()
        
        daily_return = 0.0
        if yesterday and yesterday.total_value:
            daily_return = (total_value - float(yesterday.total_value)) / float(yesterday.total_value)
        
        # Store valuation
        valuation = PortfolioDailyValuation(
            portfolio_id=portfolio.id,
            valuation_date=today,
            total_value=total_value,
            cash_value=cash_value,
            securities_value=securities_value,
            daily_return=daily_return
        )
        
        db.add(valuation)
    
    db.commit()
```

---

## Phase 7: Frontend Integration (Day 8-9)

### Step 11: Create Performance Service

Create `pms-frontend/services/PerformanceService.ts`:

```typescript
import { ApiClient } from '../client';

export interface PerformanceSummary {
  portfolio_id: string;
  portfolio_name: string;
  period: string;
  summary: {
    total_value: number;
    cumulative_return_percent: number;
    time_weighted_return: number;
    money_weighted_return: number;
    annualized_return: number;
    sharpe_ratio: number;
    volatility: number;
    max_drawdown: number;
  };
}

export class PerformanceService {
  static async getSummary(params: {
    portfolioId: string;
    period: string;
  }): Promise<PerformanceSummary> {
    const response = await ApiClient.get(
      `/portfolios/${params.portfolioId}/performance/summary`,
      { params: { period: params.period } }
    );
    return response.data;
  }

  static async getValueHistory(params: {
    portfolioId: string;
    period?: string;
    benchmarkId?: string;
    frequency?: string;
  }) {
    const response = await ApiClient.get(
      `/portfolios/${params.portfolioId}/performance/value-history`,
      { params }
    );
    return response.data;
  }

  static async getMonthlyReturns(params: {
    portfolioId: string;
    year?: number;
  }) {
    const response = await ApiClient.get(
      `/portfolios/${params.portfolioId}/performance/monthly-returns`,
      { params }
    );
    return response.data;
  }

  static async getBenchmarks() {
    const response = await ApiClient.get('/benchmarks');
    return response.data;
  }
}
```

### Step 12: Create Performance Hook

Create `pms-frontend/hooks/usePerformance.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { PerformanceService } from '../services/PerformanceService';

export function usePerformanceSummary(
  portfolioId: string | undefined,
  period: string = 'YTD'
) {
  return useQuery({
    queryKey: ['performance', 'summary', portfolioId, period],
    queryFn: () => 
      PerformanceService.getSummary({ 
        portfolioId: portfolioId!, 
        period 
      }),
    enabled: !!portfolioId,
  });
}

export function useValueHistory(
  portfolioId: string | undefined,
  period: string = 'YTD',
  benchmarkId?: string
) {
  return useQuery({
    queryKey: ['performance', 'value-history', portfolioId, period, benchmarkId],
    queryFn: () =>
      PerformanceService.getValueHistory({
        portfolioId: portfolioId!,
        period,
        benchmarkId,
      }),
    enabled: !!portfolioId,
  });
}

export function useBenchmarks() {
  return useQuery({
    queryKey: ['benchmarks'],
    queryFn: () => PerformanceService.getBenchmarks(),
  });
}
```

### Step 13: Update PortfolioPerformance Component

Update `pms-frontend/components/PortfolioPerformance.tsx`:

```typescript
// Replace dummy data with actual API calls
import { usePerformanceSummary, useValueHistory, useBenchmarks } from '../hooks/usePerformance';

export function PortfolioPerformance({ portfolioId, portfolioName }: PortfolioPerformanceProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("YTD");
  const [selectedBenchmark, setSelectedBenchmark] = useState("sp500");
  
  // Fetch data from API
  const { data: summary, isLoading: summaryLoading } = usePerformanceSummary(
    portfolioId,
    selectedPeriod
  );
  
  const { data: valueHistory, isLoading: historyLoading } = useValueHistory(
    portfolioId,
    selectedPeriod,
    selectedBenchmark
  );
  
  const { data: benchmarks } = useBenchmarks();
  
  // Use real data instead of PERFORMANCE_DATA
  if (summaryLoading || historyLoading) {
    return <LoadingSpinner />;
  }
  
  // Render with actual data
  // ...
}
```

---

## Phase 8: Testing (Day 10)

### Step 14: Test APIs

```bash
# Test summary endpoint
curl -X GET "http://localhost:8000/api/portfolios/{portfolio_id}/performance/summary?period=YTD" \
  -H "Authorization: Bearer {token}"

# Test value history
curl -X GET "http://localhost:8000/api/portfolios/{portfolio_id}/performance/value-history?period=1Y" \
  -H "Authorization: Bearer {token}"

# Test benchmarks
curl -X GET "http://localhost:8000/api/benchmarks" \
  -H "Authorization: Bearer {token}"
```

### Step 15: Write Unit Tests

Create `backend/app/tests/test_performance.py`:

```python
import pytest
from datetime import date, timedelta
from app.services.performance_calculator import PerformanceCalculator

def test_time_weighted_return():
    # Test TWR calculation
    calc = PerformanceCalculator(db_session)
    twr = calc.calculate_time_weighted_return(portfolio_id, start_date, end_date)
    assert twr > 0  # Expecting positive return

def test_volatility_calculation():
    returns = [0.01, -0.02, 0.03, -0.01, 0.02]
    calc = PerformanceCalculator(db_session)
    vol = calc.calculate_volatility(returns, annualize=False)
    assert vol > 0
```

---

## Checklist Summary

- [ ] Phase 1: Database migration completed
- [ ] Phase 2: SQLAlchemy models created
- [ ] Phase 3: Dependencies installed
- [ ] Phase 4: Performance calculator implemented
- [ ] Phase 5: API endpoints created
- [ ] Phase 6: Daily valuation background task
- [ ] Phase 7: Frontend integration
- [ ] Phase 8: Testing completed

---

## Next Steps After Basic Implementation

1. **Add Benchmark Data Fetching**: Implement yfinance integration
2. **Add Caching**: Implement performance caching for faster responses
3. **Add Attribution**: Implement sector and security attribution
4. **Add Report Generation**: Implement PDF/Excel reports
5. **Add Scheduled Tasks**: Setup Celery for daily calculations

---

## Common Issues & Solutions

### Issue: "Insufficient data for calculation"
**Solution**: Ensure portfolio_daily_valuations table has data. Run the daily valuation calculator manually first.

### Issue: "ImportError: No module named 'numpy'"
**Solution**: Install dependencies: `uv pip install numpy pandas scipy`

### Issue: "Division by zero in TWR calculation"
**Solution**: Add validation for zero values in denominator, handle edge cases

### Issue: "Performance very slow for large portfolios"
**Solution**: Implement caching, pre-calculate common periods, use database indexes

---

## Support

For questions or issues during implementation:
1. Check the API specification document
2. Review the calculation formulas in performance_calculator.py
3. Test individual functions in isolation
4. Check database queries with EXPLAIN ANALYZE

Good luck with the implementation! 🚀

