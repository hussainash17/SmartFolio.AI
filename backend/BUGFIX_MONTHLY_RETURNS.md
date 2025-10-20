# Bug Fix: Monthly Returns API - Out of Bounds Datetime Error

## Issue
The monthly returns API endpoint was throwing a `pandas._libs.tslibs.np_datetime.OutOfBoundsDatetime` error when called with invalid year values (e.g., `year=1`).

### Error Details
```
pandas._libs.tslibs.np_datetime.OutOfBoundsDatetime: Out of bounds nanosecond timestamp: 0001-01-01, at position 0
```

### Root Cause
1. The API endpoint accepted any integer value for the `year` parameter without validation
2. When `year=1` was passed, the code created `date(1, 1, 1)` which is `0001-01-01`
3. Pandas cannot handle dates before `1677-09-21` due to nanosecond timestamp limitations
4. The error occurred in `_resample_returns()` when trying to convert dates to pandas datetime

## Solution

### 1. Added Year Validation in API Endpoint
**File:** `backend/app/api/routes/performance.py`

Added validation to ensure the year parameter is within a reasonable range:

```python
# Validate year is reasonable (pandas datetime limitations)
current_year = datetime.now().year
if year < 1900 or year > current_year + 10:
    raise HTTPException(
        status_code=400, 
        detail=f"Year must be between 1900 and {current_year + 10}"
    )
```

**Rationale:**
- Lower bound (1900): Well within pandas datetime range and reasonable for financial data
- Upper bound (current_year + 10): Allows some future planning but prevents unrealistic values
- Returns a clear HTTP 400 error with descriptive message

### 2. Added Safeguard in Data Processing
**File:** `backend/app/services/performance_calculator.py`

Added defensive programming in `_resample_returns()` to handle invalid dates gracefully:

```python
# Filter out invalid dates (before pandas datetime range)
# Pandas can handle dates from 1677-09-21 to 2262-04-11
df['date'] = pd.to_datetime(df['date'], errors='coerce')
df = df.dropna(subset=['date'])

if df.empty:
    return []
```

**Rationale:**
- Uses `errors='coerce'` to convert invalid dates to NaT (Not a Time) instead of raising errors
- Filters out invalid dates before processing
- Returns empty list if no valid dates remain
- Provides defense-in-depth even if validation is bypassed

## Testing

### Before Fix
```bash
curl -X 'GET' \
  'http://localhost:8000/api/v1/portfolios/{portfolio_id}/performance/monthly-returns?year=1' \
  -H 'Authorization: Bearer {token}'
```
**Result:** 500 Internal Server Error with pandas OutOfBoundsDatetime exception

### After Fix
```bash
curl -X 'GET' \
  'http://localhost:8000/api/v1/portfolios/{portfolio_id}/performance/monthly-returns?year=1' \
  -H 'Authorization: Bearer {token}'
```
**Result:** 400 Bad Request with message "Year must be between 1900 and 2035"

### Valid Request
```bash
curl -X 'GET' \
  'http://localhost:8000/api/v1/portfolios/{portfolio_id}/performance/monthly-returns?year=2024' \
  -H 'Authorization: Bearer {token}'
```
**Result:** 200 OK with monthly returns data

## Impact

### Fixed Endpoints
- `GET /api/v1/portfolios/{portfolio_id}/performance/monthly-returns`

### Protected Endpoints
All endpoints using `_resample_returns()` now have additional protection:
- `GET /api/v1/portfolios/{portfolio_id}/performance/value-history`
- `GET /api/v1/portfolios/{portfolio_id}/performance/summary`
- Any other endpoint that calls `calculate_cumulative_returns()` with frequency parameter

## Best Practices Applied

1. **Input Validation**: Validate user input at the API boundary
2. **Defensive Programming**: Add safeguards in data processing layers
3. **Clear Error Messages**: Return descriptive error messages to help API consumers
4. **Reasonable Defaults**: Use sensible bounds based on domain knowledge
5. **Defense in Depth**: Multiple layers of protection against invalid data

## Related Issues

This fix also prevents similar issues with:
- Negative year values
- Extremely large year values
- Year 0 (which doesn't exist in the Gregorian calendar)
- Any other out-of-range dates that might be constructed

## Future Improvements

Consider adding:
1. OpenAPI schema validation for year parameter (min/max values)
2. Logging for invalid year attempts to detect potential abuse
3. Rate limiting for repeated invalid requests
4. Unit tests for edge cases (year boundaries, invalid years, etc.)
