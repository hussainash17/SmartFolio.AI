# Portfolio Performance APIs - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
cd backend
uv pip install numpy pandas scipy yfinance
```

### Step 2: Run Database Migration

```bash
# Make sure you're in the backend directory
cd backend

# Run migration
uv run alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade 2025_10_14_0001 -> 2025_10_20_0001, add_portfolio_performance_tables
```

### Step 3: Verify Tables Created

Check your database to confirm these tables exist:
- `benchmarks`
- `benchmark_data`
- `portfolio_daily_valuations`
- `portfolio_performance_cache`
- `portfolio_reports`
- `portfolio_scheduled_reports`

### Step 4: Start Your Backend

```bash
# If using uv:
uv run uvicorn app.main:app --reload

# Or with Python:
python -m uvicorn app.main:app --reload
```

### Step 5: Test the APIs

Open your browser or use curl to test:

#### Test 1: Get Available Benchmarks
```bash
curl http://localhost:8000/api/benchmarks
```

Expected: List of 6 benchmarks (S&P 500, NASDAQ, etc.)

#### Test 2: Get Portfolio Summary (requires authentication)
```bash
curl -X GET "http://localhost:8000/api/portfolios/{YOUR_PORTFOLIO_ID}/performance/summary?period=YTD" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

#### Test 3: Check API Documentation
Visit: `http://localhost:8000/docs`

Look for the new endpoints under the "performance" tag.

---

## 📝 Quick API Reference

### Core Endpoints

| Endpoint | Description | Priority |
|----------|-------------|----------|
| `GET /api/benchmarks` | List all benchmarks | P1 |
| `GET /api/portfolios/{id}/performance/summary` | Performance summary | P1 |
| `GET /api/portfolios/{id}/performance/value-history` | Value over time | P1 |
| `GET /api/portfolios/{id}/performance/benchmark-comparison` | Compare to benchmark | P1 |
| `GET /api/portfolios/{id}/performance/monthly-returns` | Monthly breakdown | P1 |
| `GET /api/portfolios/{id}/performance/attribution/securities` | Top contributors | P1 |
| `GET /api/portfolios/{id}/performance/cash-flows` | Cash flow history | P2 |
| `GET /api/portfolios/{id}/performance/risk-metrics` | Risk analysis | P2 |
| `GET /api/portfolios/{id}/performance/periods` | All periods at once | P2 |

### Query Parameters

**period** (most endpoints):
- `1W` - 1 week
- `1M` - 1 month
- `3M` - 3 months
- `6M` - 6 months
- `YTD` - Year to date
- `1Y` - 1 year
- `3Y` - 3 years
- `5Y` - 5 years
- `ALL` - Since inception

**frequency** (value-history):
- `daily` - Daily data points
- `weekly` - Weekly data points
- `monthly` - Monthly data points

**benchmark_id**:
- `sp500` - S&P 500
- `nasdaq` - NASDAQ Composite
- `dow` - Dow Jones
- `msci_world` - MSCI World
- `russell2000` - Russell 2000
- `us_bonds` - US Bonds

---

## 🧪 Testing with Sample Data

### If You Don't Have Portfolio Data Yet

Create a test portfolio with trades:

```python
from app.core.db import engine
from sqlmodel import Session
from app.model.portfolio import Portfolio
from app.model.trade import Trade
from datetime import datetime, timedelta
import uuid

with Session(engine) as db:
    # Create test portfolio
    portfolio = Portfolio(
        id=uuid.uuid4(),
        user_id=YOUR_USER_ID,  # Replace with your user ID
        name="Test Portfolio",
        is_default=False,
        is_active=True,
        cash_balance=10000
    )
    db.add(portfolio)
    db.commit()
    
    print(f"Created portfolio: {portfolio.id}")
```

### Sync Benchmark Data (One-time Setup)

Create a script `backend/sync_benchmarks.py`:

```python
from app.core.db import engine
from sqlmodel import Session
from app.services.benchmark_service import BenchmarkService

def sync_all_benchmarks():
    with Session(engine) as db:
        service = BenchmarkService(db)
        
        benchmarks = ['sp500', 'nasdaq', 'dow', 'msci_world', 'russell2000', 'us_bonds']
        
        for benchmark_id in benchmarks:
            print(f"Syncing {benchmark_id}...")
            try:
                service.sync_benchmark_data(benchmark_id, days=365)
                print(f"  ✅ {benchmark_id} synced successfully")
            except Exception as e:
                print(f"  ❌ Error syncing {benchmark_id}: {str(e)}")

if __name__ == "__main__":
    sync_all_benchmarks()
```

Run it:
```bash
cd backend
uv run python sync_benchmarks.py
```

---

## 🔍 Troubleshooting

### Issue: "Insufficient data for performance calculation"

**Cause**: No historical data in `portfolio_daily_valuations` table

**Solution 1** (Quick): The APIs will calculate on-the-fly from trades. Just ensure your portfolio has some trades.

**Solution 2** (Better): Pre-calculate valuations:
```python
from app.services.performance_calculator import PerformanceCalculator
from datetime import date, timedelta

with Session(engine) as db:
    calc = PerformanceCalculator(db)
    
    # Calculate for the last 365 days
    end_date = date.today()
    start_date = end_date - timedelta(days=365)
    
    # This will trigger calculation
    valuations = calc._get_daily_valuations(portfolio_id, start_date, end_date)
```

### Issue: "Benchmark data not available"

**Cause**: Benchmark data hasn't been synced yet

**Solution**: Run the sync script (see above) or the APIs will work without benchmark comparison.

### Issue: "ImportError: No module named 'numpy'"

**Solution**: Install dependencies
```bash
uv pip install numpy pandas scipy yfinance
```

### Issue: Migration fails

**Cause**: Conflicting migration

**Solution**: Check your current migration:
```bash
alembic current
```

Then manually update the `down_revision` in the migration file to match your latest migration.

---

## 📊 Expected Performance

### API Response Times (approximate)

- **With cached valuations**: 50-200ms
- **Without cached valuations**: 1-5 seconds (depends on portfolio size and date range)
- **Benchmark comparison**: +100-300ms (first time, then cached)

### Recommended Optimizations

1. **Run daily valuation calculator** (reduces API response time by 10x)
2. **Sync benchmarks daily** (keep data fresh)
3. **Use performance cache** (for frequently accessed periods)

---

## 🎓 Example Frontend Integration

### React/TypeScript Example

```typescript
// services/PerformanceService.ts
export const PerformanceService = {
  async getSummary(portfolioId: string, period: string = 'YTD') {
    const response = await fetch(
      `/api/portfolios/${portfolioId}/performance/summary?period=${period}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );
    return response.json();
  },
  
  async getValueHistory(portfolioId: string, benchmarkId?: string) {
    const params = new URLSearchParams({
      period: 'YTD',
      frequency: 'daily',
      ...(benchmarkId && { benchmark_id: benchmarkId }),
    });
    
    const response = await fetch(
      `/api/portfolios/${portfolioId}/performance/value-history?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );
    return response.json();
  },
};

// Usage in component
const { data, isLoading } = useQuery({
  queryKey: ['performance', portfolioId, 'summary', period],
  queryFn: () => PerformanceService.getSummary(portfolioId, period),
});
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Database migration completed successfully
- [ ] All 6 new tables exist in database
- [ ] Dependencies installed (numpy, pandas, scipy, yfinance)
- [ ] Backend starts without errors
- [ ] `/api/benchmarks` endpoint returns 6 benchmarks
- [ ] Can access `/docs` and see performance endpoints
- [ ] Performance summary API returns data for a test portfolio
- [ ] Benchmark data synced (optional but recommended)

---

## 📖 Next Steps

Once everything is working:

1. **Integrate with Frontend**: Update your PortfolioPerformance.tsx component to use real APIs
2. **Schedule Daily Tasks**: Set up cron job for daily valuation calculations
3. **Monitor Performance**: Check API response times and optimize if needed
4. **Add More Features**: Implement remaining APIs (13-20) if needed
5. **Customize Benchmarks**: Add local market benchmarks if available

---

## 🆘 Need Help?

### Check These Resources

1. **API Specs**: See `API_SPECS_PORTFOLIO_PERFORMANCE.md` for detailed API documentation
2. **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md` for what's been built
3. **Code Examples**: Look at the route implementations in `backend/app/api/routes/performance.py`

### Common Questions

**Q: Do I need all the dependencies?**
A: Yes, numpy, pandas, and scipy are required for calculations. yfinance is needed for benchmark data.

**Q: Can I use different benchmarks?**
A: Yes! Add new benchmarks to the `benchmarks` table and provide a Yahoo Finance ticker symbol.

**Q: How do I add historical data?**
A: Import your historical trades into the `trade` table, then run the valuation calculator.

**Q: Can I disable benchmark comparison?**
A: Yes, just don't provide the `benchmark_id` parameter in your API calls.

---

## 🎉 You're Ready!

Your Portfolio Performance APIs are now fully functional. Start testing with the endpoints above and integrate with your frontend!

For detailed API documentation, visit: `http://localhost:8000/docs` after starting your backend.

