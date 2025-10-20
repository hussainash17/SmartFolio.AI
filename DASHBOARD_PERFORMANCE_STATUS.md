# Dashboard Performance Tab - Integration Status

## ✅ GOOD NEWS: APIs Are Already Integrated!

The Performance tab in the Dashboard **IS** already using real backend APIs. The code at lines 102-122 in `ComprehensiveDashboard.tsx` shows:

```typescript
// Lines 102-109: API calls are being made
const { data: returnsYTD } = usePerformanceReturns(selectedPortfolioId, 'YTD');
const { data: returns1Y } = usePerformanceReturns(selectedPortfolioId, '1Y');
const { data: returns3Y } = usePerformanceReturns(selectedPortfolioId, '3Y');
const { data: returnsAll } = usePerformanceReturns(selectedPortfolioId, 'ALL');
const { data: riskMetrics1Y } = usePerformanceRiskMetrics(selectedPortfolioId, '1Y');
const { data: bestWorstYTD } = useBestWorstPeriods(selectedPortfolioId, 'YTD');
const { data: cashFlowsYTD } = useCashFlows(selectedPortfolioId, 'YTD');

// Lines 112-122: Data is aggregated from APIs
const portfolioPerformance = useMemo(() => ({
  totalReturn: returnsAll?.time_weighted_return || 0,
  yearToDate: returnsYTD?.time_weighted_return || 0,
  oneYear: returns1Y?.annualized_return || 0,
  threeYear: returns3Y?.annualized_return || 0,
  sharpeRatio: riskMetrics1Y?.sharpe_ratio || 0,
  volatility: riskMetrics1Y?.volatility || 0,
  maxDrawdown: riskMetrics1Y?.max_drawdown || 0,
}), [returnsAll, returnsYTD, returns1Y, returns3Y, riskMetrics1Y]);
```

## Why You're Seeing 0.00%

The values show 0.00% because of one of these reasons:

### 1. **No Portfolio Selected**
Check if `selectedPortfolioId` is set. The hooks are disabled when `selectedPortfolioId` is null.

**Solution**: Make sure a portfolio is selected in the Dashboard.

### 2. **No Historical Valuations**
The backend APIs return 0 when there are no pre-calculated valuations in the `portfolio_daily_valuations` table.

**Solution**: Run the backfill endpoint:
```bash
curl -X 'POST' \
  'http://localhost:8000/api/v1/portfolios/{portfolio_id}/performance/backfill?days=365' \
  -H 'Authorization: Bearer {your_token}'
```

### 3. **APIs Returning Empty Data**
The portfolio might not have enough transaction history to calculate returns.

**Solution**: Check the browser DevTools Network tab to see what the APIs are actually returning.

## How to Debug

### Step 1: Open Browser DevTools
1. Open the Dashboard in your browser
2. Press F12 to open DevTools
3. Go to the Network tab
4. Click on the Performance tab in the Dashboard

### Step 2: Check API Calls
Look for these API calls:
- `GET /portfolios/{id}/performance/returns?period=YTD`
- `GET /portfolios/{id}/performance/returns?period=1Y`
- `GET /portfolios/{id}/performance/returns?period=3Y`
- `GET /portfolios/{id}/performance/returns?period=ALL`
- `GET /portfolios/{id}/performance/risk-metrics?period=1Y`

### Step 3: Check Response Data
Click on each API call and check the Response tab. You should see:
```json
{
  "portfolio_id": "...",
  "period": "YTD",
  "time_weighted_return": 12.50,  // <-- Should NOT be 0
  "money_weighted_return": 11.80,
  "annualized_return": 15.20,
  "days": 294
}
```

If you see `time_weighted_return: 0`, then the backend is calculating 0% returns.

## Quick Fix: Add Console Logging

Add this temporary logging to see what's happening:

```typescript
// In ComprehensiveDashboard.tsx, after line 122, add:
console.log('Performance Data:', {
  selectedPortfolioId,
  returnsYTD,
  returns1Y,
  returns3Y,
  returnsAll,
  riskMetrics1Y,
  portfolioPerformance
});
```

This will show you exactly what data the APIs are returning.

## Most Likely Issue: Missing Backfill

The most common reason for 0.00% is that the `portfolio_daily_valuations` table is empty. 

### Solution:
1. Run the backfill endpoint to pre-calculate valuations
2. Wait for it to complete (runs in background)
3. Refresh the Dashboard

### Backfill Command:
```bash
# Replace {portfolio_id} and {token} with actual values
curl -X 'POST' \
  'http://localhost:8000/api/v1/portfolios/ece37744-f021-41c7-955b-16db55d3c01b/performance/backfill?days=365' \
  -H 'Authorization: Bearer eyJhbGc...'
```

## Verification

After running backfill, you should see:
1. Network requests to the performance APIs
2. Non-zero values in the API responses
3. Performance metrics displayed in the Dashboard

## Summary

✅ **APIs ARE integrated** - The code is correct  
❌ **Data is missing** - Need to run backfill  
🔧 **Action needed**: Run the backfill endpoint for your portfolio

The integration is complete. You just need data in the database!
