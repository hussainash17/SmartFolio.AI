# Portfolio Performance API Specifications

This document outlines all the APIs required for the Portfolio Performance Analytics feature.

## Overview

The Portfolio Performance feature requires comprehensive endpoints to calculate and return various performance metrics, attribution analysis, benchmarking data, and reporting capabilities.

---

## 1. Portfolio Performance Summary

### `GET /api/portfolios/{portfolio_id}/performance/summary`

Returns key performance metrics for a portfolio.

**Query Parameters:**
- `period` (optional): `1W`, `1M`, `3M`, `6M`, `YTD`, `1Y`, `3Y`, `5Y`, `ALL` (default: `YTD`)
- `start_date` (optional): ISO date string for custom period
- `end_date` (optional): ISO date string for custom period

**Response:**
```json
{
  "portfolio_id": "string",
  "portfolio_name": "string",
  "period": "YTD",
  "summary": {
    "total_value": 1250000,
    "total_cost": 1125000,
    "cumulative_return": 125000,
    "cumulative_return_percent": 11.11,
    "time_weighted_return": 12.5,
    "money_weighted_return": 11.8,
    "annualized_return": 15.2,
    "sharpe_ratio": 1.45,
    "sortino_ratio": 1.82,
    "max_drawdown": -8.5,
    "volatility": 12.3,
    "best_month": {
      "period": "Mar 2024",
      "return": 8.5
    },
    "worst_month": {
      "period": "Sep 2024",
      "return": -3.2
    },
    "best_quarter": {
      "period": "Q1 2024",
      "return": 17.2
    },
    "worst_quarter": {
      "period": "Q3 2024",
      "return": -1.8
    },
    "net_contributions": 50000,
    "net_withdrawals": 25000,
    "inception_date": "2023-01-01",
    "days_since_inception": 658
  }
}
```

---

## 2. Portfolio Value Over Time

### `GET /api/portfolios/{portfolio_id}/performance/value-history`

Returns portfolio value and benchmark comparison over time.

**Query Parameters:**
- `period` (optional): Time period filter
- `benchmark_id` (optional): Benchmark identifier (default: `sp500`)
- `frequency` (optional): `daily`, `weekly`, `monthly` (default: `daily`)

**Response:**
```json
{
  "portfolio_id": "string",
  "benchmark_id": "sp500",
  "benchmark_name": "S&P 500",
  "frequency": "daily",
  "data": [
    {
      "date": "2023-01-01",
      "portfolio_value": 1000000,
      "portfolio_return": 0,
      "portfolio_cumulative_return": 0,
      "benchmark_value": 1000000,
      "benchmark_return": 0,
      "benchmark_cumulative_return": 0,
      "relative_return": 0,
      "alpha": 0
    },
    {
      "date": "2023-02-01",
      "portfolio_value": 1050000,
      "portfolio_return": 5.0,
      "portfolio_cumulative_return": 5.0,
      "benchmark_value": 1020000,
      "benchmark_return": 2.0,
      "benchmark_cumulative_return": 2.0,
      "relative_return": 3.0,
      "alpha": 0.3
    }
  ]
}
```

---

## 3. Benchmark Comparison

### `GET /api/portfolios/{portfolio_id}/performance/benchmark-comparison`

Returns detailed benchmark comparison across multiple time periods.

**Query Parameters:**
- `benchmark_id` (optional): Benchmark identifier (default: `sp500`)

**Response:**
```json
{
  "portfolio_id": "string",
  "benchmark_id": "sp500",
  "benchmark_name": "S&P 500",
  "comparison": [
    {
      "period": "1W",
      "portfolio_return": 1.2,
      "benchmark_return": 0.9,
      "relative_return": 0.3,
      "alpha": 0.3,
      "beta": 1.05,
      "tracking_error": 2.1,
      "information_ratio": 0.14
    },
    {
      "period": "1M",
      "portfolio_return": 2.3,
      "benchmark_return": 1.9,
      "relative_return": 0.4,
      "alpha": 0.4,
      "beta": 1.08,
      "tracking_error": 2.3,
      "information_ratio": 0.17
    }
  ]
}
```

---

## 4. Available Benchmarks

### `GET /api/benchmarks`

Returns list of available benchmarks for comparison.

**Response:**
```json
{
  "benchmarks": [
    {
      "id": "sp500",
      "name": "S&P 500",
      "ticker": "^GSPC",
      "description": "Standard & Poor's 500 Index",
      "asset_class": "equity",
      "region": "US"
    },
    {
      "id": "nasdaq",
      "name": "NASDAQ Composite",
      "ticker": "^IXIC",
      "description": "NASDAQ Stock Market Composite Index",
      "asset_class": "equity",
      "region": "US"
    }
  ]
}
```

---

## 5. Asset Class Attribution

### `GET /api/portfolios/{portfolio_id}/performance/attribution/asset-class`

Returns performance attribution by asset class.

**Query Parameters:**
- `period` (optional): Time period filter

**Response:**
```json
{
  "portfolio_id": "string",
  "period": "YTD",
  "attribution": [
    {
      "asset_class": "Equities",
      "weight": 60.0,
      "benchmark_weight": 55.0,
      "return": 9.2,
      "benchmark_return": 8.5,
      "contribution": 5.5,
      "allocation_effect": 0.8,
      "selection_effect": 1.2,
      "interaction_effect": 0.1,
      "total_effect": 2.1
    },
    {
      "asset_class": "Fixed Income",
      "weight": 30.0,
      "benchmark_weight": 35.0,
      "return": 2.4,
      "benchmark_return": 2.1,
      "contribution": 0.7,
      "allocation_effect": 0.2,
      "selection_effect": 0.1,
      "interaction_effect": 0.0,
      "total_effect": 0.3
    }
  ],
  "total_attribution": {
    "total_allocation_effect": 1.0,
    "total_selection_effect": 1.3,
    "total_interaction_effect": 0.1,
    "total_active_return": 2.4
  }
}
```

---

## 6. Sector Attribution

### `GET /api/portfolios/{portfolio_id}/performance/attribution/sector`

Returns performance attribution by sector (for equities).

**Query Parameters:**
- `period` (optional): Time period filter
- `benchmark_id` (optional): Benchmark identifier

**Response:**
```json
{
  "portfolio_id": "string",
  "period": "YTD",
  "benchmark_id": "sp500",
  "attribution": [
    {
      "sector": "Technology",
      "weight": 25.0,
      "benchmark_weight": 22.0,
      "return": 15.2,
      "benchmark_return": 12.8,
      "contribution": 3.8,
      "allocation_effect": 0.5,
      "selection_effect": 0.8,
      "interaction_effect": 0.1,
      "total_effect": 1.4
    },
    {
      "sector": "Healthcare",
      "weight": 15.0,
      "benchmark_weight": 14.0,
      "return": 8.5,
      "benchmark_return": 7.2,
      "contribution": 1.28,
      "allocation_effect": 0.1,
      "selection_effect": 0.2,
      "interaction_effect": 0.0,
      "total_effect": 0.3
    }
  ]
}
```

---

## 7. Security Attribution (Top Contributors/Detractors)

### `GET /api/portfolios/{portfolio_id}/performance/attribution/securities`

Returns top contributing and detracting securities.

**Query Parameters:**
- `period` (optional): Time period filter
- `limit` (optional): Number of securities to return (default: 10)

**Response:**
```json
{
  "portfolio_id": "string",
  "period": "YTD",
  "top_contributors": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "sector": "Technology",
      "weight": 8.5,
      "return": 25.3,
      "contribution": 2.5,
      "beginning_value": 80000,
      "ending_value": 100240,
      "gain_loss": 20240
    },
    {
      "symbol": "MSFT",
      "name": "Microsoft Corp.",
      "sector": "Technology",
      "weight": 7.2,
      "return": 22.8,
      "contribution": 2.1,
      "beginning_value": 70000,
      "ending_value": 85960,
      "gain_loss": 15960
    }
  ],
  "top_detractors": [
    {
      "symbol": "XOM",
      "name": "Exxon Mobil Corp.",
      "sector": "Energy",
      "weight": 5.2,
      "return": -8.5,
      "contribution": -0.8,
      "beginning_value": 52000,
      "ending_value": 47580,
      "gain_loss": -4420
    }
  ]
}
```

---

## 8. Return Decomposition

### `GET /api/portfolios/{portfolio_id}/performance/decomposition`

Returns breakdown of returns by source (dividends, interest, capital gains).

**Query Parameters:**
- `period` (optional): Time period filter

**Response:**
```json
{
  "portfolio_id": "string",
  "period": "YTD",
  "decomposition": {
    "total_return": 12.5,
    "total_return_amount": 125000,
    "income": {
      "dividends": {
        "percent": 2.5,
        "amount": 25000
      },
      "interest": {
        "percent": 0.8,
        "amount": 8000
      },
      "total_income": {
        "percent": 3.3,
        "amount": 33000
      }
    },
    "capital_gains": {
      "realized": {
        "percent": 6.8,
        "amount": 68000,
        "short_term": 2.1,
        "long_term": 4.7
      },
      "unrealized": {
        "percent": 5.7,
        "amount": 57000
      },
      "total_capital_gains": {
        "percent": 12.5,
        "amount": 125000
      }
    },
    "currency_effect": {
      "percent": 0.2,
      "amount": 2000
    }
  }
}
```

---

## 9. Monthly Returns

### `GET /api/portfolios/{portfolio_id}/performance/monthly-returns`

Returns month-by-month performance data.

**Query Parameters:**
- `year` (optional): Filter by year (default: current year)

**Response:**
```json
{
  "portfolio_id": "string",
  "year": 2024,
  "monthly_returns": [
    {
      "month": "Jan",
      "month_number": 1,
      "return": 2.1,
      "portfolio_value_start": 1000000,
      "portfolio_value_end": 1021000,
      "benchmark_return": 1.8
    },
    {
      "month": "Feb",
      "month_number": 2,
      "return": 5.0,
      "portfolio_value_start": 1021000,
      "portfolio_value_end": 1072050,
      "benchmark_return": 4.2
    }
  ],
  "ytd_return": 12.5,
  "best_month": {
    "month": "Mar",
    "return": 8.5
  },
  "worst_month": {
    "month": "Sep",
    "return": -3.2
  },
  "positive_months": 9,
  "negative_months": 3
}
```

---

## 10. Rolling Returns

### `GET /api/portfolios/{portfolio_id}/performance/rolling-returns`

Returns rolling return analysis over different time windows.

**Query Parameters:**
- `window` (optional): `3M`, `6M`, `12M` (default: `12M`)
- `frequency` (optional): `daily`, `weekly`, `monthly` (default: `monthly`)

**Response:**
```json
{
  "portfolio_id": "string",
  "window": "12M",
  "frequency": "monthly",
  "data": [
    {
      "period": "Jan-Dec 2023",
      "end_date": "2023-12-31",
      "rolling_return": 15.2,
      "benchmark_return": 12.3,
      "relative_return": 2.9
    },
    {
      "period": "Feb-Jan 2024",
      "end_date": "2024-01-31",
      "rolling_return": 15.8,
      "benchmark_return": 12.8,
      "relative_return": 3.0
    }
  ],
  "statistics": {
    "average": 15.2,
    "median": 15.0,
    "min": 8.5,
    "max": 22.3,
    "std_dev": 3.2
  }
}
```

---

## 11. Period Performance Analysis

### `GET /api/portfolios/{portfolio_id}/performance/periods`

Returns performance across all standard time periods.

**Response:**
```json
{
  "portfolio_id": "string",
  "as_of_date": "2024-10-20",
  "periods": [
    {
      "period": "1W",
      "portfolio_return": 1.2,
      "benchmark_return": 0.9,
      "relative_return": 0.3,
      "alpha": 0.3,
      "sharpe_ratio": 1.45,
      "volatility": 12.3,
      "max_drawdown": -1.2
    },
    {
      "period": "1M",
      "portfolio_return": 2.3,
      "benchmark_return": 1.9,
      "relative_return": 0.4,
      "alpha": 0.4,
      "sharpe_ratio": 1.52,
      "volatility": 11.8,
      "max_drawdown": -2.1
    }
  ]
}
```

---

## 12. Custom Period Analysis

### `POST /api/portfolios/{portfolio_id}/performance/custom-period`

Analyzes performance for a custom date range.

**Request Body:**
```json
{
  "start_date": "2023-01-01",
  "end_date": "2024-10-20",
  "benchmark_id": "sp500"
}
```

**Response:**
```json
{
  "portfolio_id": "string",
  "start_date": "2023-01-01",
  "end_date": "2024-10-20",
  "days": 658,
  "performance": {
    "total_return": 25.0,
    "annualized_return": 15.2,
    "benchmark_return": 18.0,
    "relative_return": 7.0,
    "alpha": 2.8,
    "beta": 1.08,
    "sharpe_ratio": 1.45,
    "sortino_ratio": 1.82,
    "volatility": 12.3,
    "max_drawdown": -8.5,
    "calmar_ratio": 1.79
  }
}
```

---

## 13. Cash Flow Analysis

### `GET /api/portfolios/{portfolio_id}/performance/cash-flows`

Returns detailed cash flow history (contributions and withdrawals).

**Query Parameters:**
- `period` (optional): Time period filter
- `transaction_type` (optional): `all`, `contributions`, `withdrawals`

**Response:**
```json
{
  "portfolio_id": "string",
  "period": "YTD",
  "summary": {
    "total_contributions": 50000,
    "total_withdrawals": 25000,
    "net_cash_flow": 25000,
    "contribution_count": 12,
    "withdrawal_count": 3
  },
  "transactions": [
    {
      "date": "2024-01-15",
      "type": "contribution",
      "amount": 5000,
      "description": "Monthly contribution"
    },
    {
      "date": "2024-02-01",
      "type": "withdrawal",
      "amount": 10000,
      "description": "Partial withdrawal"
    }
  ]
}
```

---

## 14. Risk Metrics

### `GET /api/portfolios/{portfolio_id}/performance/risk-metrics`

Returns comprehensive risk analysis.

**Query Parameters:**
- `period` (optional): Time period filter
- `benchmark_id` (optional): Benchmark identifier

**Response:**
```json
{
  "portfolio_id": "string",
  "period": "YTD",
  "risk_metrics": {
    "volatility": {
      "annualized": 12.3,
      "daily": 0.77
    },
    "downside_deviation": 8.5,
    "max_drawdown": {
      "percent": -8.5,
      "amount": -106250,
      "start_date": "2024-07-15",
      "end_date": "2024-09-20",
      "recovery_date": "2024-10-15",
      "days_to_recover": 25
    },
    "value_at_risk": {
      "var_95": -2.5,
      "var_99": -3.8,
      "cvar_95": -3.2,
      "cvar_99": -4.5
    },
    "beta": 1.08,
    "correlation": 0.92,
    "r_squared": 0.85,
    "sharpe_ratio": 1.45,
    "sortino_ratio": 1.82,
    "calmar_ratio": 1.79,
    "information_ratio": 0.85,
    "treynor_ratio": 11.2
  }
}
```

---

## 15. Income Generation Analysis

### `GET /api/portfolios/{portfolio_id}/performance/income`

Returns dividend and interest income tracking.

**Query Parameters:**
- `period` (optional): Time period filter
- `frequency` (optional): `monthly`, `quarterly`, `annual`

**Response:**
```json
{
  "portfolio_id": "string",
  "period": "YTD",
  "income_summary": {
    "total_income": 33000,
    "dividend_income": 25000,
    "interest_income": 8000,
    "income_yield": 3.3,
    "dividend_yield": 2.5,
    "interest_yield": 0.8
  },
  "income_history": [
    {
      "date": "2024-01-15",
      "symbol": "AAPL",
      "type": "dividend",
      "amount": 250,
      "shares": 100,
      "per_share": 2.5
    },
    {
      "date": "2024-01-31",
      "symbol": "BOND_ETF",
      "type": "interest",
      "amount": 180,
      "shares": 200,
      "per_share": 0.9
    }
  ],
  "projected_annual_income": 39600,
  "top_income_generators": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "income_ytd": 1000,
      "yield": 2.1
    }
  ]
}
```

---

## 16. Report Generation

### `POST /api/portfolios/{portfolio_id}/reports/generate`

Generates a performance report.

**Request Body:**
```json
{
  "report_type": "monthly_summary",
  "period": "1M",
  "start_date": "2024-09-01",
  "end_date": "2024-09-30",
  "format": "pdf",
  "include_sections": [
    "summary",
    "attribution",
    "holdings",
    "transactions"
  ],
  "benchmark_id": "sp500"
}
```

**Response:**
```json
{
  "report_id": "string",
  "status": "generating",
  "estimated_time_seconds": 30,
  "download_url": null
}
```

---

## 17. Report Status

### `GET /api/reports/{report_id}/status`

Checks the status of a report generation.

**Response:**
```json
{
  "report_id": "string",
  "status": "completed",
  "created_at": "2024-10-20T10:30:00Z",
  "completed_at": "2024-10-20T10:30:25Z",
  "download_url": "https://api.example.com/reports/abc123/download",
  "expires_at": "2024-10-27T10:30:25Z"
}
```

---

## 18. Report History

### `GET /api/portfolios/{portfolio_id}/reports`

Returns list of previously generated reports.

**Query Parameters:**
- `limit` (optional): Number of reports to return (default: 20)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "portfolio_id": "string",
  "total": 45,
  "reports": [
    {
      "report_id": "string",
      "report_type": "monthly_summary",
      "period": "Oct 2024",
      "format": "pdf",
      "created_at": "2024-11-01T09:00:00Z",
      "file_size_bytes": 1048576,
      "download_url": "https://api.example.com/reports/abc123/download"
    },
    {
      "report_id": "string",
      "report_type": "quarterly_review",
      "period": "Q3 2024",
      "format": "excel",
      "created_at": "2024-10-01T09:00:00Z",
      "file_size_bytes": 524288,
      "download_url": "https://api.example.com/reports/def456/download"
    }
  ]
}
```

---

## 19. Scheduled Reports

### `GET /api/portfolios/{portfolio_id}/reports/scheduled`

Returns list of scheduled automatic reports.

**Response:**
```json
{
  "portfolio_id": "string",
  "scheduled_reports": [
    {
      "schedule_id": "string",
      "report_type": "monthly_summary",
      "frequency": "monthly",
      "day_of_month": 1,
      "format": "pdf",
      "email_recipients": ["user@example.com"],
      "is_active": true,
      "next_run_date": "2024-11-01T09:00:00Z"
    }
  ]
}
```

### `POST /api/portfolios/{portfolio_id}/reports/scheduled`

Creates a new scheduled report.

**Request Body:**
```json
{
  "report_type": "monthly_summary",
  "frequency": "monthly",
  "day_of_month": 1,
  "format": "pdf",
  "email_recipients": ["user@example.com"],
  "include_sections": ["summary", "attribution", "holdings"]
}
```

### `PUT /api/portfolios/{portfolio_id}/reports/scheduled/{schedule_id}`

Updates a scheduled report.

### `DELETE /api/portfolios/{portfolio_id}/reports/scheduled/{schedule_id}`

Deletes a scheduled report.

---

## 20. Export Raw Data

### `GET /api/portfolios/{portfolio_id}/performance/export`

Exports raw performance data for external analysis.

**Query Parameters:**
- `period` (optional): Time period filter
- `format`: `csv`, `excel`, `json`
- `include_daily_values` (optional): boolean
- `include_transactions` (optional): boolean

**Response:**
Returns file download with comprehensive performance data.

---

## Data Models

### Performance Calculation Notes

1. **Time-Weighted Return (TWR)**: Measures portfolio performance neutralizing the impact of cash flows. Calculated using the Modified Dietz method or Daily Valuation method.

2. **Money-Weighted Return (MWR)**: Internal Rate of Return (IRR) that accounts for the timing and size of cash flows. Represents actual investor experience.

3. **Attribution Analysis**: Uses Brinson-Fachler attribution model to decompose active return into:
   - Allocation Effect: Impact of sector/asset class weighting decisions
   - Selection Effect: Impact of security selection within sectors
   - Interaction Effect: Combined impact of allocation and selection

4. **Risk Metrics**:
   - Sharpe Ratio: (Return - Risk Free Rate) / Volatility
   - Sortino Ratio: (Return - Risk Free Rate) / Downside Deviation
   - Alpha: Excess return vs. benchmark after adjusting for risk (beta)
   - Beta: Portfolio sensitivity to benchmark movements

---

## Implementation Priority

### Phase 1 (Core Features):
1. Portfolio Performance Summary (#1)
2. Portfolio Value Over Time (#2)
3. Benchmark Comparison (#3)
4. Monthly Returns (#9)
5. Security Attribution (#7)

### Phase 2 (Advanced Analytics):
6. Asset Class Attribution (#5)
7. Sector Attribution (#6)
8. Return Decomposition (#8)
9. Risk Metrics (#14)
10. Cash Flow Analysis (#13)

### Phase 3 (Reporting & Advanced):
11. Rolling Returns (#10)
12. Period Performance (#11)
13. Income Generation (#15)
14. Report Generation (#16-19)
15. Custom Period Analysis (#12)

---

## Technical Considerations

### Performance Optimization:
- Cache frequently accessed calculations (daily returns, cumulative returns)
- Pre-calculate and store common time periods (1M, 3M, YTD, 1Y)
- Use database views or materialized views for complex queries
- Implement pagination for historical data endpoints

### Data Requirements:
- Daily portfolio valuations (end-of-day pricing)
- Complete transaction history with timestamps
- Benchmark historical data (can use external API like Alpha Vantage, Yahoo Finance)
- Dividend and interest payment records
- Sector and industry classifications for holdings

### Error Handling:
- Return appropriate errors when insufficient data for calculations
- Handle missing benchmark data gracefully
- Provide fallback values or null when metrics cannot be calculated
- Validate date ranges and period parameters

### Security:
- Ensure users can only access their own portfolio performance data
- Implement rate limiting on report generation endpoints
- Validate all input parameters
- Sanitize file downloads

---

## Dependencies

### External Data Sources:
- **Stock Prices**: DSE scraper (existing), backup to Alpha Vantage or Yahoo Finance
- **Benchmark Data**: Yahoo Finance API, MSCI, S&P indices
- **Risk-Free Rate**: Bangladesh Treasury bills, or use US Treasury for comparison
- **Sector Classifications**: GICS (Global Industry Classification Standard) or local DSE sectors

### Python Libraries (Suggested):
```python
# Performance Calculations
import pandas as pd
import numpy as np
from scipy.optimize import newton  # For IRR calculations

# Financial Metrics
import empyrical  # Portfolio performance metrics
import pyfolio  # Portfolio analysis
import quantstats  # Performance statistics

# Data Handling
from datetime import datetime, timedelta
import yfinance as yf  # Yahoo Finance data

# Report Generation
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import openpyxl  # Excel generation
```

### Database Schema Additions:

```sql
-- Cache table for daily portfolio valuations
CREATE TABLE portfolio_daily_valuations (
    id SERIAL PRIMARY KEY,
    portfolio_id UUID NOT NULL,
    valuation_date DATE NOT NULL,
    total_value DECIMAL(15, 2),
    cash_value DECIMAL(15, 2),
    securities_value DECIMAL(15, 2),
    daily_return DECIMAL(10, 6),
    cumulative_return DECIMAL(10, 6),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(portfolio_id, valuation_date)
);

-- Benchmark data
CREATE TABLE benchmark_data (
    id SERIAL PRIMARY KEY,
    benchmark_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    value DECIMAL(15, 4),
    return_1d DECIMAL(10, 6),
    return_cumulative DECIMAL(10, 6),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(benchmark_id, date)
);

-- Performance cache
CREATE TABLE portfolio_performance_cache (
    id SERIAL PRIMARY KEY,
    portfolio_id UUID NOT NULL,
    period VARCHAR(10) NOT NULL,
    benchmark_id VARCHAR(50),
    calculation_date DATE NOT NULL,
    metrics JSONB NOT NULL,  -- Store all calculated metrics
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(portfolio_id, period, benchmark_id, calculation_date)
);

-- Generated reports
CREATE TABLE portfolio_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    period VARCHAR(50),
    format VARCHAR(10),
    status VARCHAR(20),
    file_path TEXT,
    file_size_bytes INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- Scheduled reports
CREATE TABLE portfolio_scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    day_of_month INTEGER,
    format VARCHAR(10),
    email_recipients TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Testing Recommendations

1. **Unit Tests**: Test individual calculation functions (TWR, MWR, attribution)
2. **Integration Tests**: Test API endpoints with sample portfolio data
3. **Performance Tests**: Ensure calculations complete within acceptable time for large portfolios
4. **Data Validation**: Test edge cases (no data, single data point, gaps in data)
5. **Accuracy Tests**: Validate calculations against known benchmarks

---

## Documentation

Each API endpoint should include:
- OpenAPI/Swagger documentation
- Example requests and responses
- Calculation methodology explanations
- Error response formats
- Rate limit information

