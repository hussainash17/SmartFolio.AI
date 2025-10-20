# 🇧🇩 Dhaka Stock Exchange (DSE) Benchmarks Setup

## 📊 DSE Indices Configured

Your Portfolio Performance system now uses **Dhaka Stock Exchange** benchmarks:

### Available Benchmarks

| ID | Name | Description |
|----|------|-------------|
| **dsex** | DSEX - Broad Index | Main benchmark - All listed companies on DSE |
| **ds30** | DS30 - Blue Chip Index | Top 30 companies by market cap & liquidity |
| **dses** | DSES - Shariah Index | Shariah-compliant stocks index |

**Default Benchmark**: DSEX (used when no benchmark specified)

---

## 🎯 How It Works

### Data Source

DSE index data is fetched from your **existing `marketsummary` table**!

✅ No external API needed  
✅ Uses your DSE scraper data  
✅ Real-time DSE index values  
✅ Automatic synchronization with your scraper  

### Data Flow

```
DSE Scraper (Java)
    ↓
marketsummary table
    ↓ (sync_benchmarks.py)
benchmark_data table
    ↓
Performance APIs
```

---

## 🚀 Setup Steps

### 1. Run Migration (Creates 3 DSE Benchmarks)

```bash
cd backend
uv run alembic upgrade head
```

This creates the benchmarks:
- ✅ DSEX - Dhaka Stock Exchange Broad Index
- ✅ DS30 - DSE 30 Index
- ✅ DSES - DSE Shariah Index

### 2. Sync DSE Index Data

```bash
cd backend
uv run python sync_benchmarks.py
```

This reads from your `marketsummary` table and populates `benchmark_data` table.

**Note**: This uses your existing DSE scraper data, so make sure your DSE scraper is running and populating the `marketsummary` table.

### 3. Verify

```bash
# Check benchmarks were created
curl http://localhost:8000/api/benchmarks

# Expected output:
# {
#   "benchmarks": [
#     {"id": "dsex", "name": "DSEX - Dhaka Stock Exchange Broad Index", ...},
#     {"id": "ds30", "name": "DS30 - Dhaka Stock Exchange 30 Index", ...},
#     {"id": "dses", "name": "DSES - Dhaka Stock Exchange Shariah Index", ...}
#   ]
# }
```

---

## 📈 Using DSE Benchmarks in APIs

### Compare Portfolio to DSEX

```bash
GET /api/portfolios/{id}/performance/benchmark-comparison?benchmark_id=dsex
```

### Value History with DS30

```bash
GET /api/portfolios/{id}/performance/value-history?benchmark_id=ds30
```

### Risk Metrics vs DSES (Shariah Index)

```bash
GET /api/portfolios/{id}/performance/risk-metrics?benchmark_id=dses
```

---

## 🔄 Automatic Sync with DSE Scraper

Since the benchmark data comes from your `marketsummary` table:

1. **Your DSE scraper runs** → Updates `marketsummary.dse_index`
2. **Run sync script** → Copies to `benchmark_data` table
3. **Performance APIs** → Use cached benchmark data

### Schedule Daily Sync (Recommended)

Add to cron or Windows Task Scheduler:

```bash
# Run after DSE scraper completes (e.g., 7 PM Bangladesh time)
0 19 * * * cd /path/to/backend && uv run python sync_benchmarks.py
```

This keeps benchmark data fresh automatically!

---

## 📊 Current Limitations & Solutions

### DS30 and DSES Data

**Current Status**: 
- ✅ DSEX data available in `marketsummary.dse_index`
- ⚠️ DS30 and DSES currently use DSEX data (placeholder)

**Why**: Your `marketsummary` table currently only has `dse_index` column.

**Solutions**:

#### Option 1: Add DS30 and DSES to MarketSummary (Recommended)

Update your DSE scraper to also scrape DS30 and DSES indices:

```sql
-- Add new columns to marketsummary table
ALTER TABLE marketsummary 
ADD COLUMN ds30_index NUMERIC,
ADD COLUMN ds30_change NUMERIC,
ADD COLUMN ds30_change_percent NUMERIC,
ADD COLUMN dses_index NUMERIC,
ADD COLUMN dses_change NUMERIC,
ADD COLUMN dses_change_percent NUMERIC;
```

Then update `benchmark_service.py`:

```python
index_column_map = {
    'DSEX': 'dse_index',
    'DS30': 'ds30_index',  # Use actual DS30 column
    'DSES': 'dses_index',  # Use actual DSES column
}
```

#### Option 2: Use DSEX for All (Current Setup)

All three benchmarks use DSEX data until DS30/DSES are available.

**Pros**: Works immediately with existing data  
**Cons**: DS30 and DSES show same values as DSEX

---

## 🎯 Example API Responses

### Get Benchmarks

```json
{
  "benchmarks": [
    {
      "id": "dsex",
      "name": "DSEX - Dhaka Stock Exchange Broad Index",
      "ticker": "DSEX",
      "description": null,
      "asset_class": "equity",
      "region": "Bangladesh",
      "data_source": "dse",
      "is_active": true
    },
    {
      "id": "ds30",
      "name": "DS30 - Dhaka Stock Exchange 30 Index",
      "ticker": "DS30",
      "asset_class": "equity",
      "region": "Bangladesh",
      "data_source": "dse",
      "is_active": true
    },
    {
      "id": "dses",
      "name": "DSES - Dhaka Stock Exchange Shariah Index",
      "ticker": "DSES",
      "asset_class": "equity",
      "region": "Bangladesh",
      "data_source": "dse",
      "is_active": true
    }
  ]
}
```

### Portfolio vs DSEX

```json
{
  "portfolio_id": "abc-123",
  "benchmark_id": "dsex",
  "benchmark_name": "DSEX - Dhaka Stock Exchange Broad Index",
  "comparison": [
    {
      "period": "1M",
      "portfolio_return": 5.2,
      "benchmark_return": 3.8,
      "relative_return": 1.4,
      "alpha": 0.5,
      "beta": 1.08
    }
  ]
}
```

---

## 🔧 Troubleshooting

### "No market data found for DSEX"

**Cause**: Your `marketsummary` table is empty or doesn't have recent data

**Solution**: 
1. Ensure your DSE scraper is running
2. Check `marketsummary` table has records:
   ```sql
   SELECT COUNT(*) FROM marketsummary;
   SELECT MAX(date) FROM marketsummary;
   ```
3. If empty, run your DSE scraper first

### "Benchmark data not syncing"

**Cause**: `marketsummary.dse_index` is NULL

**Solution**: Check your scraper is populating the index value:
```sql
SELECT date, dse_index, total_trades, total_volume 
FROM marketsummary 
ORDER BY date DESC 
LIMIT 10;
```

---

## 📝 Summary

✅ **3 DSE Benchmarks** configured (DSEX, DS30, DSES)  
✅ **Uses existing data** from your `marketsummary` table  
✅ **No external API** dependencies  
✅ **Automatic sync** with your DSE scraper  
✅ **Default benchmark**: DSEX  

Your portfolio performance will now be compared against Bangladesh market indices! 🇧🇩

---

## 🎯 Next Steps

1. **Run migration** to create benchmarks
2. **Run sync script** to populate benchmark data from marketsummary
3. **Test APIs** with DSE benchmarks
4. **(Optional)** Add DS30 and DSES columns to marketsummary table for full support

---

## 📖 Related Files

- Migration: `app/alembic/versions/2025_10_20_0001_add_portfolio_performance_tables.py`
- Service: `app/services/benchmark_service.py`
- Sync Script: `sync_benchmarks.py`

**Your performance system now uses Bangladesh market benchmarks!** 🇧🇩🚀

