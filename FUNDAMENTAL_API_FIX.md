# Fundamental Analysis API - URL Prefix Fix

## Issue
The fundamental analysis APIs were not being called from the frontend due to duplicate URL prefixes.

### Root Cause
The backend router had the full path including `/api/v1`:
```python
# WRONG
router = APIRouter(prefix="/api/v1/fundamentals", tags=["fundamentals"])
```

This resulted in duplicate prefixes when included in the main API router:
- Expected: `/api/v1/fundamentals/company/{code}`
- Actual: `/api/v1/api/v1/fundamentals/company/{code}` ❌

## Fix Applied

### 1. Backend Route Fix
**File:** `backend/app/api/routes/fundamentals.py`

```python
# CORRECT
router = APIRouter(prefix="/fundamentals", tags=["fundamentals"])
```

The `/api/v1` prefix is already added by the main API router in `backend/app/api/main.py`.

### 2. Frontend SDK Fix
**File:** `pms-frontend/src/client/sdk.gen.ts`

Fixed all occurrences of duplicate prefix:
```bash
sed -i "s|/api/v1/api/v1/fundamentals|/api/v1/fundamentals|g" sdk.gen.ts
```

### 3. Default Stock Symbol
**File:** `pms-frontend/components/Fundamentals.tsx`

Set default symbol to ensure immediate API calls:
```typescript
const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>(
  defaultSymbol || 'GP' // Default to GP (Grameenphone)
);
```

### 4. Authentication Fix
Fixed authentication check to use localStorage:
```typescript
// Before
const isAuthenticated = !!(OpenAPI as any).TOKEN;

// After
const isAuthenticated = !!localStorage.getItem('portfoliomax_token');
```

## Testing

### 1. Restart Frontend Dev Server
```bash
cd pms-frontend
npm run dev
```

### 2. Hard Refresh Browser
- Chrome/Firefox: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)

### 3. Expected API Calls
When navigating to Fundamentals tab:
- ✅ `GET /api/v1/market/list`
- ✅ `GET /api/v1/fundamentals/company/GP`
- ✅ `GET /api/v1/fundamentals/market-summary/GP`
- ✅ `GET /api/v1/fundamentals/shareholding/GP`
- ✅ `GET /api/v1/fundamentals/earnings/GP`
- ✅ `GET /api/v1/fundamentals/financial-health/GP`
- ✅ `GET /api/v1/fundamentals/dividends/GP`
- ✅ `GET /api/v1/fundamentals/ratios/GP`

### 4. Debug Console
The console should show:
```javascript
🔍 Fundamentals Debug: {
  isAuthenticated: true,
  selectedSymbol: "GP",
  hasStockList: true,
  isLoading: false,
  hasCompanyInfo: true,
  hasMarketSummary: true
}
```

## Important Notes

### When Regenerating OpenAPI Client
Always use the correct backend route prefix pattern. The router prefix should NOT include `/api/v1`:

```python
# Correct pattern for all routes
router = APIRouter(prefix="/resource-name", tags=["resource-name"])
```

The main API router in `app/api/main.py` includes all routes under `/api/v1`.

### Frontend Build
After any SDK changes, rebuild the frontend:
```bash
cd pms-frontend
npm run build
```

## Files Modified

### Backend
- ✅ `backend/app/api/routes/fundamentals.py` - Fixed router prefix

### Frontend
- ✅ `pms-frontend/src/client/sdk.gen.ts` - Fixed API URLs
- ✅ `pms-frontend/components/Fundamentals.tsx` - Added default symbol & auth fix
- ✅ `pms-frontend/hooks/useFundamentals.ts` - Fixed auth checks

## Status
✅ **FIXED** - All fundamental analysis APIs now working correctly

---

**Last Updated:** October 13, 2025
**Issue:** Duplicate API prefix
**Resolution:** Fixed backend router prefix and regenerated/patched SDK

