# 📋 Fundamental Analysis API - Quick Reference

## Base URL
```
/api/v1/fundamentals
```

## Available Endpoints

| # | Method | Endpoint | Description | Status |
|---|--------|----------|-------------|--------|
| 1 | GET | `/company/{trading_code}` | Company basic information | ✅ |
| 2 | GET | `/market-summary/{trading_code}` | Market metrics & valuation | ✅ |
| 3 | GET | `/shareholding/{trading_code}` | Shareholding distribution | ✅ |
| 4 | GET | `/earnings/{trading_code}` | Earnings & profit trends | ✅ |
| 5 | GET | `/financial-health/{trading_code}` | Loan & debt status | ✅ |
| 6 | GET | `/dividends/{trading_code}?limit=10` | Dividend history | ✅ |
| 7 | GET | `/ratios/{trading_code}?years=5` | Historical ratios | ✅ |
| 8 | GET | `/compare?codes=A,B,C` | Compare companies | ✅ |
| 9 | GET | `/search?sector=X&category=A` | Search & filter | ✅ |
| 10 | GET | `/data-availability/{trading_code}` | Check data status | ✅ |

## 🔐 Authentication Required

All endpoints require JWT authentication. Include the token in the `Authorization` header:
```bash
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Get your access token:
```bash
curl -X POST "http://localhost:8000/api/v1/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your_email@example.com&password=your_password"
```

## Quick Examples

### 1. Get Company Info
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:8000/api/v1/fundamentals/company/BATBC
```

### 2. Market Summary
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:8000/api/v1/fundamentals/market-summary/BATBC
```

### 3. Compare Companies
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "http://localhost:8000/api/v1/fundamentals/compare?codes=BATBC,SQURPHARMA,OLYMPIC"
```

### 4. Search by Sector
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "http://localhost:8000/api/v1/fundamentals/search?sector=Food%20%26%20Allied&category=A"
```

### 5. Dividend History
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "http://localhost:8000/api/v1/fundamentals/dividends/BATBC?limit=5"
```

## Search Filters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `sector` | string | Filter by sector | `Food & Allied` |
| `category` | string | Market category | `A`, `B`, `G`, `N`, `Z` |
| `min_pe` | decimal | Minimum P/E ratio | `5.0` |
| `max_pe` | decimal | Maximum P/E ratio | `15.0` |
| `min_dividend_yield` | decimal | Minimum dividend % | `5.0` |
| `limit` | integer | Max results | `50` (default), max `100` |

## Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (invalid parameters) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (token expired or insufficient privileges) |
| 404 | Not Found (company or data not found) |
| 500 | Server Error |

## Key Data Points

### Company Basic Info
- Trading code, company name
- Sector, category
- Listing year
- Contact information
- Website

### Market Summary
- LTP (Last Trading Price)
- P/E ratio (current & audited)
- Dividend yield
- NAV (Net Asset Value)
- Market cap
- 52-week range
- Capital structure

### Shareholding Pattern
- Director holdings %
- Government holdings %
- Institutional holdings %
- Foreign holdings %
- Public holdings %
- Recent changes

### Earnings & Profit
- Quarterly EPS trends
- YoY growth %
- Annual profit figures

### Financial Health
- Short-term loans
- Long-term loans
- Reserve & surplus
- Debt status assessment

### Dividend History
- Cash dividend %
- Stock dividend %
- Dividend yield %
- Multi-year history

### Historical Ratios
- EPS history
- P/E ratio history
- NAV history
- Profit history
- Time series data

## Frontend Integration

### React/TypeScript Example
```typescript
const API_BASE = '/api/v1/fundamentals';

// Get auth headers
const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json'
});

// Fetch company info
const fetchCompanyInfo = async (code: string) => {
  const res = await fetch(`${API_BASE}/company/${code}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
};

// Search companies
const searchCompanies = async (filters: {
  sector?: string;
  category?: string;
  minPe?: number;
}) => {
  const params = new URLSearchParams();
  if (filters.sector) params.append('sector', filters.sector);
  if (filters.category) params.append('category', filters.category);
  if (filters.minPe) params.append('min_pe', filters.minPe.toString());
  
  const res = await fetch(`${API_BASE}/search?${params}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
};
```

## API Documentation
- Full docs: `/backend/FUNDAMENTAL_ANALYSIS_API.md`
- Implementation: `/backend/FUNDAMENTAL_ANALYSIS_IMPLEMENTATION.md`
- Interactive: `http://localhost:8000/docs` (FastAPI auto-docs)

## Testing
All endpoints tested ✅  
Test company: `PREMIERCEM`

---

**Status:** Production Ready 🚀  
**Version:** 1.0  
**Last Updated:** October 13, 2025

