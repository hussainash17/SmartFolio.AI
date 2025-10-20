# Portfolio Performance API - Quick Reference

## API Endpoints Summary

### Core Performance APIs (20 Total)

| # | Endpoint | Method | Purpose | Priority |
|---|----------|--------|---------|----------|
| 1 | `/api/portfolios/{id}/performance/summary` | GET | Key performance metrics and statistics | P1 |
| 2 | `/api/portfolios/{id}/performance/value-history` | GET | Portfolio value over time with benchmark | P1 |
| 3 | `/api/portfolios/{id}/performance/benchmark-comparison` | GET | Detailed benchmark comparison | P1 |
| 4 | `/api/benchmarks` | GET | List available benchmarks | P1 |
| 5 | `/api/portfolios/{id}/performance/attribution/asset-class` | GET | Asset class performance attribution | P2 |
| 6 | `/api/portfolios/{id}/performance/attribution/sector` | GET | Sector performance attribution | P2 |
| 7 | `/api/portfolios/{id}/performance/attribution/securities` | GET | Top contributors/detractors | P1 |
| 8 | `/api/portfolios/{id}/performance/decomposition` | GET | Return decomposition by source | P2 |
| 9 | `/api/portfolios/{id}/performance/monthly-returns` | GET | Month-by-month returns | P1 |
| 10 | `/api/portfolios/{id}/performance/rolling-returns` | GET | Rolling return analysis | P3 |
| 11 | `/api/portfolios/{id}/performance/periods` | GET | Performance across all time periods | P2 |
| 12 | `/api/portfolios/{id}/performance/custom-period` | POST | Custom date range analysis | P3 |
| 13 | `/api/portfolios/{id}/performance/cash-flows` | GET | Contributions and withdrawals | P2 |
| 14 | `/api/portfolios/{id}/performance/risk-metrics` | GET | Comprehensive risk analysis | P2 |
| 15 | `/api/portfolios/{id}/performance/income` | GET | Dividend and interest tracking | P3 |
| 16 | `/api/portfolios/{id}/reports/generate` | POST | Generate performance report | P3 |
| 17 | `/api/reports/{id}/status` | GET | Check report generation status | P3 |
| 18 | `/api/portfolios/{id}/reports` | GET | List generated reports | P3 |
| 19 | `/api/portfolios/{id}/reports/scheduled` | GET/POST/PUT/DELETE | Manage scheduled reports | P3 |
| 20 | `/api/portfolios/{id}/performance/export` | GET | Export raw data | P3 |

---

## Component-to-API Mapping

### Overview Tab
```typescript
// Required APIs:
1. GET /api/portfolios/{id}/performance/summary
   → Displays: Total value, returns, best/worst periods

2. GET /api/portfolios/{id}/performance/value-history?frequency=monthly
   → Chart: Portfolio value over time with benchmark

3. GET /api/portfolios/{id}/performance/monthly-returns?year=2024
   → Chart: Monthly returns bar chart

4. GET /api/portfolios/{id}/performance/cash-flows?period=YTD
   → Displays: Net contributions/withdrawals
```

### Benchmarking Tab
```typescript
// Required APIs:
1. GET /api/benchmarks
   → Populate benchmark selector dropdown

2. GET /api/portfolios/{id}/performance/value-history?benchmark_id=sp500
   → Chart: Portfolio vs benchmark returns

3. GET /api/portfolios/{id}/performance/benchmark-comparison?benchmark_id=sp500
   → Table: Performance comparison across periods
   → Chart: Rolling alpha over time
```

### Attribution Tab
```typescript
// Required APIs:
1. GET /api/portfolios/{id}/performance/attribution/asset-class?period=YTD
   → Table: Asset class attribution
   → Chart: Contribution pie chart

2. GET /api/portfolios/{id}/performance/attribution/sector?period=YTD
   → Table: Sector attribution with allocation/selection effects
   → Chart: Sector contribution bar chart

3. GET /api/portfolios/{id}/performance/attribution/securities?period=YTD&limit=10
   → Tables: Top contributors and detractors
```

### Decomposition Tab
```typescript
// Required APIs:
1. GET /api/portfolios/{id}/performance/decomposition?period=YTD
   → Displays: Return breakdown (dividends, interest, capital gains)
   → Chart: Return composition pie chart
   → Displays: Realized vs unrealized gains

2. GET /api/portfolios/{id}/performance/income?period=YTD
   → Displays: Income generation tracking
```

### Periods Tab
```typescript
// Required APIs:
1. GET /api/portfolios/{id}/performance/periods
   → Table: Performance across all standard periods

2. GET /api/portfolios/{id}/performance/rolling-returns?window=12M
   → Chart: Rolling returns analysis

3. POST /api/portfolios/{id}/performance/custom-period
   → Custom date range analysis form
```

### Reports Tab
```typescript
// Required APIs:
1. POST /api/portfolios/{id}/reports/generate
   → Generate report (PDF/Excel)

2. GET /api/reports/{id}/status
   → Check generation status

3. GET /api/portfolios/{id}/reports?limit=20
   → Table: Report history

4. GET /api/portfolios/{id}/reports/scheduled
   → Display scheduled reports

5. POST /api/portfolios/{id}/reports/scheduled
   → Create new scheduled report
```

---

## Key Metrics & Calculations

### Time-Weighted Return (TWR)
```python
# Neutralizes impact of cash flows
# Preferred for comparing portfolio managers
def calculate_twr(valuations, cash_flows):
    """
    TWR = [(1 + R1) × (1 + R2) × ... × (1 + Rn)] - 1
    where Ri = (End Value - Begin Value - Net Cash Flow) / (Begin Value + Cash Flow)
    """
    pass
```

### Money-Weighted Return (MWR/IRR)
```python
# Accounts for timing and size of cash flows
# Represents actual investor experience
def calculate_mwr(valuations, cash_flows):
    """
    Solve for r: NPV = 0
    NPV = Σ(Cash Flows / (1 + r)^t) + Final Value / (1 + r)^T
    """
    from scipy.optimize import newton
    # Implementation
    pass
```

### Attribution Analysis
```python
def brinson_attribution(portfolio_weights, portfolio_returns, 
                       benchmark_weights, benchmark_returns):
    """
    Allocation Effect = (Wp - Wb) × Rb
    Selection Effect = Wb × (Rp - Rb)
    Interaction Effect = (Wp - Wb) × (Rp - Rb)
    Total Effect = Allocation + Selection + Interaction
    """
    pass
```

### Risk Metrics
```python
def calculate_risk_metrics(returns, benchmark_returns, risk_free_rate=0.05):
    """
    Sharpe Ratio = (Rp - Rf) / σp
    Sortino Ratio = (Rp - Rf) / σd (downside deviation)
    Alpha = Rp - [Rf + β(Rb - Rf)]
    Beta = Cov(Rp, Rb) / Var(Rb)
    Max Drawdown = max(peak - trough) / peak
    """
    pass
```

---

## Implementation Checklist

### Phase 1: Core Performance (Week 1-2)
- [ ] Setup database schema additions
  - [ ] `portfolio_daily_valuations` table
  - [ ] `benchmark_data` table
  - [ ] `portfolio_performance_cache` table

- [ ] Implement core calculation service
  - [ ] Daily return calculations
  - [ ] Time-weighted return (TWR)
  - [ ] Money-weighted return (MWR/IRR)
  - [ ] Cumulative returns

- [ ] Build core API endpoints
  - [ ] ✅ API #1: Performance Summary
  - [ ] ✅ API #2: Value History
  - [ ] ✅ API #3: Benchmark Comparison
  - [ ] ✅ API #4: Available Benchmarks
  - [ ] ✅ API #9: Monthly Returns

- [ ] Setup benchmark data integration
  - [ ] Fetch S&P 500, NASDAQ data
  - [ ] Create local benchmark data cache
  - [ ] Schedule daily benchmark updates

### Phase 2: Attribution & Analytics (Week 3-4)
- [ ] Implement attribution calculations
  - [ ] Asset class attribution
  - [ ] Sector attribution (Brinson-Fachler model)
  - [ ] Security-level attribution

- [ ] Build attribution APIs
  - [ ] ✅ API #5: Asset Class Attribution
  - [ ] ✅ API #6: Sector Attribution
  - [ ] ✅ API #7: Security Attribution

- [ ] Implement decomposition analysis
  - [ ] ✅ API #8: Return Decomposition
  - [ ] ✅ API #13: Cash Flow Analysis
  - [ ] ✅ API #14: Risk Metrics

- [ ] Build supporting APIs
  - [ ] ✅ API #11: Period Performance

### Phase 3: Advanced Features (Week 5-6)
- [ ] Implement advanced analytics
  - [ ] ✅ API #10: Rolling Returns
  - [ ] ✅ API #12: Custom Period Analysis
  - [ ] ✅ API #15: Income Generation

- [ ] Build reporting system
  - [ ] Setup report generation queue
  - [ ] PDF report templates (ReportLab)
  - [ ] Excel export (openpyxl)
  - [ ] ✅ API #16: Generate Report
  - [ ] ✅ API #17: Report Status
  - [ ] ✅ API #18: Report History

- [ ] Implement scheduled reports
  - [ ] Email integration
  - [ ] Cron job for scheduled generation
  - [ ] ✅ API #19: Scheduled Reports CRUD

- [ ] Data export
  - [ ] ✅ API #20: Export Raw Data

### Phase 4: Optimization & Testing
- [ ] Performance optimization
  - [ ] Implement caching strategy
  - [ ] Add database indexes
  - [ ] Create materialized views
  - [ ] Optimize complex queries

- [ ] Testing
  - [ ] Unit tests for calculations
  - [ ] Integration tests for APIs
  - [ ] Performance tests for large portfolios
  - [ ] Accuracy validation tests

- [ ] Documentation
  - [ ] Complete OpenAPI/Swagger docs
  - [ ] Add inline code documentation
  - [ ] Create user guide
  - [ ] Write API examples

---

## Database Schema

```sql
-- Daily Portfolio Valuations (for performance tracking)
CREATE TABLE portfolio_daily_valuations (
    id SERIAL PRIMARY KEY,
    portfolio_id UUID NOT NULL REFERENCES portfolios(id),
    valuation_date DATE NOT NULL,
    total_value DECIMAL(15, 2) NOT NULL,
    cash_value DECIMAL(15, 2),
    securities_value DECIMAL(15, 2),
    daily_return DECIMAL(10, 6),
    cumulative_return DECIMAL(10, 6),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(portfolio_id, valuation_date)
);

CREATE INDEX idx_portfolio_valuations_date 
    ON portfolio_daily_valuations(portfolio_id, valuation_date DESC);

-- Benchmark Historical Data
CREATE TABLE benchmark_data (
    id SERIAL PRIMARY KEY,
    benchmark_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    close_value DECIMAL(15, 4) NOT NULL,
    return_1d DECIMAL(10, 6),
    return_cumulative DECIMAL(10, 6),
    volume BIGINT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(benchmark_id, date)
);

CREATE INDEX idx_benchmark_data_date 
    ON benchmark_data(benchmark_id, date DESC);

-- Performance Calculation Cache
CREATE TABLE portfolio_performance_cache (
    id SERIAL PRIMARY KEY,
    portfolio_id UUID NOT NULL REFERENCES portfolios(id),
    period VARCHAR(10) NOT NULL,
    benchmark_id VARCHAR(50),
    calculation_date DATE NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(portfolio_id, period, benchmark_id, calculation_date)
);

CREATE INDEX idx_performance_cache_lookup 
    ON portfolio_performance_cache(portfolio_id, period, benchmark_id, calculation_date DESC);

-- Generated Reports
CREATE TABLE portfolio_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id),
    user_id UUID NOT NULL REFERENCES "user"(id),
    report_type VARCHAR(50) NOT NULL,
    period VARCHAR(50),
    start_date DATE,
    end_date DATE,
    format VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    file_path TEXT,
    file_size_bytes INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    error_message TEXT
);

CREATE INDEX idx_portfolio_reports_user 
    ON portfolio_reports(user_id, created_at DESC);

-- Scheduled Reports
CREATE TABLE portfolio_scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id),
    user_id UUID NOT NULL REFERENCES "user"(id),
    report_type VARCHAR(50) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    day_of_month INTEGER,
    day_of_week INTEGER,
    format VARCHAR(10) NOT NULL DEFAULT 'pdf',
    email_recipients TEXT[] NOT NULL,
    include_sections TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_reports_next_run 
    ON portfolio_scheduled_reports(next_run_at) 
    WHERE is_active = TRUE;

-- Benchmarks Definition
CREATE TABLE benchmarks (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ticker VARCHAR(20),
    description TEXT,
    asset_class VARCHAR(50),
    region VARCHAR(50),
    data_source VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default benchmarks
INSERT INTO benchmarks (id, name, ticker, asset_class, region, data_source) VALUES
('sp500', 'S&P 500', '^GSPC', 'equity', 'US', 'yahoo_finance'),
('nasdaq', 'NASDAQ Composite', '^IXIC', 'equity', 'US', 'yahoo_finance'),
('dow', 'Dow Jones Industrial Average', '^DJI', 'equity', 'US', 'yahoo_finance'),
('msci_world', 'MSCI World', 'URTH', 'equity', 'Global', 'yahoo_finance'),
('russell2000', 'Russell 2000', '^RUT', 'equity', 'US', 'yahoo_finance'),
('us_bonds', 'US Aggregate Bonds', 'AGG', 'fixed_income', 'US', 'yahoo_finance');
```

---

## Python Service Structure

```
backend/app/services/performance/
├── __init__.py
├── calculator.py           # Core calculation functions
├── attribution.py          # Attribution analysis
├── risk_metrics.py         # Risk calculations
├── benchmarks.py          # Benchmark data handling
├── reports.py             # Report generation
└── cache.py               # Performance caching

backend/app/api/routes/
└── performance.py         # Performance API endpoints
```

### Example Service Implementation

```python
# backend/app/services/performance/calculator.py
from typing import List, Dict, Optional
from datetime import datetime, date
import pandas as pd
import numpy as np
from scipy.optimize import newton

class PerformanceCalculator:
    """Core performance calculation service"""
    
    def calculate_time_weighted_return(
        self, 
        portfolio_id: str,
        start_date: date,
        end_date: date
    ) -> float:
        """
        Calculate Time-Weighted Return (TWR)
        Neutralizes the impact of cash flows
        """
        # Get daily valuations and cash flows
        valuations = self._get_daily_valuations(portfolio_id, start_date, end_date)
        cash_flows = self._get_cash_flows(portfolio_id, start_date, end_date)
        
        # Calculate sub-period returns
        sub_returns = []
        for i in range(len(valuations) - 1):
            begin_value = valuations[i]['value']
            end_value = valuations[i+1]['value']
            net_flow = cash_flows.get(valuations[i+1]['date'], 0)
            
            sub_return = (end_value - begin_value - net_flow) / begin_value
            sub_returns.append(sub_return)
        
        # Chain-link sub-period returns
        twr = np.prod([1 + r for r in sub_returns]) - 1
        return twr
    
    def calculate_money_weighted_return(
        self,
        portfolio_id: str,
        start_date: date,
        end_date: date
    ) -> float:
        """
        Calculate Money-Weighted Return (IRR)
        Accounts for timing and size of cash flows
        """
        cash_flows = self._get_all_cash_flows(portfolio_id, start_date, end_date)
        
        def npv(rate):
            # Calculate NPV at given rate
            total = 0
            for cf in cash_flows:
                days_diff = (cf['date'] - start_date).days
                years = days_diff / 365.25
                total += cf['amount'] / (1 + rate) ** years
            return total
        
        # Solve for rate where NPV = 0
        irr = newton(npv, 0.1)  # Start with 10% guess
        return irr
    
    def calculate_cumulative_returns(
        self,
        portfolio_id: str,
        start_date: date,
        end_date: date,
        frequency: str = 'daily'
    ) -> List[Dict]:
        """
        Calculate cumulative returns over time
        """
        valuations = self._get_daily_valuations(portfolio_id, start_date, end_date)
        
        results = []
        initial_value = valuations[0]['value']
        
        for val in valuations:
            cumulative_return = (val['value'] - initial_value) / initial_value * 100
            results.append({
                'date': val['date'],
                'value': val['value'],
                'return': cumulative_return
            })
        
        return results
```

---

## Frontend Integration Guide

### Hook Structure
```typescript
// hooks/usePerformance.ts
export function usePerformance(portfolioId: string, period: string = 'YTD') {
  return useQuery({
    queryKey: ['performance', 'summary', portfolioId, period],
    queryFn: () => PerformanceService.getSummary({ portfolioId, period })
  });
}

export function useValueHistory(
  portfolioId: string, 
  benchmarkId: string = 'sp500'
) {
  return useQuery({
    queryKey: ['performance', 'value-history', portfolioId, benchmarkId],
    queryFn: () => PerformanceService.getValueHistory({ portfolioId, benchmarkId })
  });
}
```

### Service Structure
```typescript
// services/PerformanceService.ts
import { ApiClient } from '../client';

export class PerformanceService {
  static async getSummary(params: { portfolioId: string; period: string }) {
    return ApiClient.get(`/portfolios/${params.portfolioId}/performance/summary`, {
      params: { period: params.period }
    });
  }
  
  static async getValueHistory(params: { 
    portfolioId: string; 
    benchmarkId?: string;
    frequency?: string;
  }) {
    return ApiClient.get(
      `/portfolios/${params.portfolioId}/performance/value-history`,
      { params }
    );
  }
  
  // ... other methods
}
```

---

## Next Steps

1. **Review the full specification**: Check `API_SPECS_PORTFOLIO_PERFORMANCE.md`
2. **Setup database schema**: Run the SQL migrations
3. **Install Python dependencies**: Add required packages to `requirements.txt`
4. **Start with Phase 1**: Build core performance APIs first
5. **Test incrementally**: Test each API as you build it
6. **Update frontend**: Replace dummy data with API calls

## Questions or Clarifications?

- Need help with specific calculations?
- Want example implementations for any API?
- Need guidance on testing strategies?
- Want to discuss architecture decisions?

