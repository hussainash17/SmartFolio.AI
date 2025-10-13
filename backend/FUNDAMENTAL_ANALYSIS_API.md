# 📊 Fundamental Analysis API Documentation

## Overview

The Fundamental Analysis API suite provides comprehensive financial and company data for stock market analysis. All endpoints follow RESTful conventions and return clean, normalized JSON responses.

**Base URL:** `/api/v1/fundamentals`

---

## 🔑 Key Features

- ✅ **9 Comprehensive APIs** for fundamental analysis
- ✅ **Modular & Reusable** service layer architecture
- ✅ **Clean JSON responses** with proper error handling
- ✅ **Filter & Search** capabilities by sector, category, and financial metrics
- ✅ **Versioned API** (`/api/v1/...`) for future compatibility
- ✅ **Frontend Ready** - Optimized for React/Vue/Next.js integration
- ✅ **Secured with Authentication** - Requires valid JWT token

---

## 🔐 Authentication

All Fundamental Analysis APIs require authentication using JWT (JSON Web Token).

### Getting an Access Token

1. **Login to get access token:**
```bash
curl -X POST "http://localhost:8000/api/v1/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your_email@example.com&password=your_password"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

2. **Use the token in API requests:**
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:8000/api/v1/fundamentals/company/BATBC
```

### Frontend Integration

Include the token in request headers:

```typescript
const token = localStorage.getItem('access_token');

fetch('/api/v1/fundamentals/company/BATBC', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### Authentication Errors

- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Token expired or user doesn't have access
- `404 Not Found` - User not found

---

## 📘 API Endpoints

### 1. Company Basic Info

**Endpoint:** `GET /api/v1/fundamentals/company/{trading_code}`

**Description:** Fetch all basic company information for the fundamental analysis tab.

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:8000/api/v1/fundamentals/company/BATBC
```

**Example Response:**
```json
{
  "trading_code": "BATBC",
  "company_name": "British American Tobacco Bangladesh Company Limited",
  "category": "A",
  "sector": "Food & Allied",
  "listing_year": 1977,
  "head_office": "Dehora, Dhamsona, Balibhadra Bazar, Ashulia, Dhaka-1349",
  "factory": "Same as head office",
  "contact": {
    "company_secretary": "Syed Afzal Hossain",
    "email": "syed_afzal_hossain@bat.com",
    "cell": "+88 01313 701 925"
  },
  "website": "https://www.batbangladesh.com/"
}
```

---

### 2. Market Summary

**Endpoint:** `GET /api/v1/fundamentals/market-summary/{trading_code}`

**Description:** Provide key market indicators and valuation metrics.

**Example Request:**
```bash
GET /api/v1/fundamentals/market-summary/BATBC
```

**Example Response:**
```json
{
  "ltp": 259.70,
  "ltp_change": -0.04,
  "ycp": 259.80,
  "current_pe": 16.89,
  "audited_pe": 8.01,
  "dividend_yield": 11.55,
  "nav": 106.88,
  "face_value": 10,
  "market_cap": 14023.80,
  "paid_up_capital": 540.00,
  "authorized_capital": 54000.00,
  "reserve_and_surplus": 522460.00,
  "year_end": "December 31",
  "last_agm": "March 25, 2025",
  "week_52_range": {
    "low": 247.20,
    "high": 387.60
  }
}
```

---

### 3. Shareholding Pattern

**Endpoint:** `GET /api/v1/fundamentals/shareholding/{trading_code}`

**Description:** Show detailed shareholding distribution and recent changes.

**Example Request:**
```bash
GET /api/v1/fundamentals/shareholding/BATBC
```

**Example Response:**
```json
{
  "date": "2025-09-30",
  "director": 72.91,
  "govt": 0.64,
  "institute": 14.41,
  "foreign": 3.43,
  "public": 8.61,
  "change": {
    "foreign": -0.12,
    "public": 0.12
  }
}
```

---

### 4. Earnings & Profit

**Endpoint:** `GET /api/v1/fundamentals/earnings/{trading_code}`

**Description:** Retrieve EPS and profit trends by quarter and year.

**Example Request:**
```bash
GET /api/v1/fundamentals/earnings/BATBC
```

**Example Response:**
```json
{
  "quarters": [
    {
      "quarter": "Q1",
      "prev_year_eps": 7.65,
      "current_year_eps": 5.89,
      "growth_percent": -23.01,
      "period": "Mar 2025"
    },
    {
      "quarter": "Q2",
      "prev_year_eps": 9.48,
      "current_year_eps": 1.80,
      "growth_percent": -81.01,
      "period": "Jun 2025"
    }
  ],
  "annual": {
    "prev_year_eps": 32.42,
    "current_year_eps": 15.38,
    "growth_percent": -52.56,
    "profit_million": 17506.80
  }
}
```

---

### 5. Financial Health

**Endpoint:** `GET /api/v1/fundamentals/financial-health/{trading_code}`

**Description:** Display loan status, reserves, and balance sheet stability indicators.

**Example Request:**
```bash
GET /api/v1/fundamentals/financial-health/BATBC
```

**Example Response:**
```json
{
  "short_term_loan": 0.00,
  "long_term_loan": 0.00,
  "total_loan": 0.00,
  "reserve_and_surplus": 522460.00,
  "debt_status": "Debt-free",
  "remarks": "Strong reserves and no outstanding loans"
}
```

---

### 6. Dividend History

**Endpoint:** `GET /api/v1/fundamentals/dividends/{trading_code}`

**Description:** Provide annual dividend information (cash, stock, yield).

**Query Parameters:**
- `limit` (optional): Number of years to retrieve (default: 10, max: 20)

**Example Request:**
```bash
GET /api/v1/fundamentals/dividends/BATBC?limit=5
```

**Example Response:**
```json
[
  {
    "year": 2024,
    "cash_dividend": "550%",
    "stock_dividend": "0%",
    "dividend_yield": 11.55
  },
  {
    "year": 2023,
    "cash_dividend": "600%",
    "stock_dividend": "0%",
    "dividend_yield": 12.30
  }
]
```

---

### 7. Historical Ratios

**Endpoint:** `GET /api/v1/fundamentals/ratios/{trading_code}`

**Description:** Return historical P/E, EPS, NAV, and profit data for charts.

**Query Parameters:**
- `years` (optional): Number of years of history (default: 5, max: 10)

**Example Request:**
```bash
GET /api/v1/fundamentals/ratios/BATBC?years=5
```

**Example Response:**
```json
{
  "eps_history": [32.42, 28.76, 26.12, 15.38],
  "pe_history": [8.01, 10.25, 12.67, 16.89],
  "nav_history": [98.25, 102.55, 106.88],
  "profit_history": [21500, 19800, 17506.8],
  "years": [2020, 2021, 2022, 2023, 2024]
}
```

---

### 8. Company Comparison

**Endpoint:** `GET /api/v1/fundamentals/compare`

**Description:** Compare key financial indicators among multiple companies.

**Query Parameters:**
- `codes` (required): Comma-separated trading codes (max: 10 companies)

**Example Request:**
```bash
GET /api/v1/fundamentals/compare?codes=BATBC,SQURPHARMA,OLYMPIC
```

**Example Response:**
```json
[
  {
    "trading_code": "BATBC",
    "company_name": "British American Tobacco Bangladesh Company Limited",
    "ltp": 259.70,
    "pe": 16.89,
    "dividend_yield": 11.55,
    "nav": 106.88,
    "market_cap": 14023.80,
    "eps": 15.38,
    "sector": "Food & Allied"
  },
  {
    "trading_code": "SQURPHARMA",
    "company_name": "Square Pharmaceuticals PLC.",
    "ltp": 211.20,
    "pe": 14.12,
    "dividend_yield": 4.6,
    "nav": 92.45,
    "market_cap": 28500.00,
    "eps": 14.95,
    "sector": "Pharmaceuticals & Chemicals"
  }
]
```

---

### 9. Search & Filter

**Endpoint:** `GET /api/v1/fundamentals/search`

**Description:** Filter companies based on category, sector, or performance range.

**Query Parameters:**
- `sector` (optional): Filter by sector
- `category` (optional): Filter by category (A, B, G, N, Z)
- `min_pe` (optional): Minimum P/E ratio
- `max_pe` (optional): Maximum P/E ratio
- `min_dividend_yield` (optional): Minimum dividend yield percentage
- `limit` (optional): Maximum results (default: 50, max: 100)

**Example Requests:**
```bash
# Search by sector and category
GET /api/v1/fundamentals/search?sector=Food%20&%20Allied&category=A

# Search by P/E range
GET /api/v1/fundamentals/search?min_pe=5&max_pe=15

# Search by minimum dividend yield
GET /api/v1/fundamentals/search?min_dividend_yield=5&limit=20
```

**Example Response:**
```json
[
  {
    "trading_code": "BATBC",
    "company_name": "British American Tobacco",
    "sector": "Food & Allied",
    "category": "A",
    "ltp": 259.70,
    "pe_ratio": 16.89,
    "market_cap": 14023.80
  },
  {
    "trading_code": "OLYMPIC",
    "company_name": "Olympic Industries",
    "sector": "Food & Allied",
    "category": "A",
    "ltp": 186.20,
    "pe_ratio": 15.50,
    "market_cap": 8500.00
  }
]
```

---

### 10. Data Availability Check (Bonus)

**Endpoint:** `GET /api/v1/fundamentals/data-availability/{trading_code}`

**Description:** Check what fundamental data is available for a company.

**Example Request:**
```bash
GET /api/v1/fundamentals/data-availability/BATBC
```

**Example Response:**
```json
{
  "has_basic_info": true,
  "has_financial_data": true,
  "has_dividend_data": true,
  "has_shareholding_data": true,
  "has_loan_data": true,
  "has_quarterly_data": true,
  "latest_data_year": 2024,
  "latest_quarter_date": "2025-03-31"
}
```

---

## 🏗️ Architecture

### Service Layer
- **File:** `/backend/app/services/fundamental_service.py`
- **Class:** `FundamentalAnalysisService`
- Extends `BaseService` for consistent error handling
- Implements all business logic for fundamental analysis

### API Routes
- **File:** `/backend/app/api/routes/fundamentals.py`
- All routes follow FastAPI best practices
- Proper dependency injection for database sessions
- Comprehensive OpenAPI documentation

### Data Models
- **File:** `/backend/app/model/fundamental_schemas.py`
- Pydantic models for request/response validation
- Clean separation from database models

### Database Models
- **File:** `/backend/app/model/fundamental.py`
- SQLModel ORM for database access
- Tables: `dividend_information`, `financial_performance`, `quarterly_performance`, `shareholding_pattern`, `loan_status`

---

## 🔍 Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK` - Successful request
- `404 Not Found` - Company or data not found
- `400 Bad Request` - Invalid query parameters
- `500 Internal Server Error` - Server error

**Error Response Format:**
```json
{
  "detail": "Company with trading code 'INVALID' not found"
}
```

---

## 🚀 Usage Examples

### Frontend Integration (React/TypeScript)

```typescript
// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Fetch company basic info
const getCompanyInfo = async (tradingCode: string) => {
  const response = await fetch(
    `/api/v1/fundamentals/company/${tradingCode}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) throw new Error('Authentication failed');
  return await response.json();
};

// Compare multiple companies
const compareCompanies = async (codes: string[]) => {
  const codesParam = codes.join(',');
  const response = await fetch(
    `/api/v1/fundamentals/compare?codes=${codesParam}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) throw new Error('Authentication failed');
  return await response.json();
};

// Search companies by sector
const searchBySector = async (sector: string) => {
  const response = await fetch(
    `/api/v1/fundamentals/search?sector=${encodeURIComponent(sector)}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) throw new Error('Authentication failed');
  return await response.json();
};
```

### Python Client

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# Step 1: Login to get access token
login_data = {
    "username": "user@example.com",
    "password": "your_password"
}
auth_response = requests.post(
    f"{BASE_URL}/login/access-token",
    data=login_data
)
access_token = auth_response.json()["access_token"]

# Step 2: Use token in headers
headers = {
    "Authorization": f"Bearer {access_token}"
}

# Get market summary
response = requests.get(
    f"{BASE_URL}/fundamentals/market-summary/BATBC",
    headers=headers
)
market_data = response.json()

# Get dividend history
response = requests.get(
    f"{BASE_URL}/fundamentals/dividends/BATBC?limit=5",
    headers=headers
)
dividends = response.json()

# Search companies
params = {"sector": "Food & Allied", "category": "A"}
response = requests.get(
    f"{BASE_URL}/fundamentals/search",
    params=params,
    headers=headers
)
companies = response.json()
```

---

## 🧪 Testing

All APIs have been tested and verified with real database data. Test results show:

✅ API 1: Company Basic Info - **Working**  
✅ API 2: Market Summary - **Working**  
✅ API 3: Shareholding Pattern - **Working**  
✅ API 4: Earnings & Profit - **Working**  
✅ API 5: Financial Health - **Working**  
✅ API 6: Dividend History - **Working**  
✅ API 7: Historical Ratios - **Working**  
✅ API 8: Company Comparison - **Working**  
✅ API 9: Search & Filter - **Working**  
✅ Bonus: Data Availability - **Working**

---

## 📝 Notes

1. **Data Availability**: Not all companies have complete fundamental data. Use the data availability endpoint to check what data exists for a specific company.

2. **Historical Data**: Historical ratios and dividends are limited by available data in the database. The `years` parameter specifies maximum years, but actual results may be fewer.

3. **Performance**: All queries are optimized with proper database indexes on `company_id`, `year`, `date`, and `trading_code` fields.

4. **Caching**: Consider implementing caching at the application level for frequently accessed data (market summary, company info) to improve performance.

5. **Rate Limiting**: For production deployments, implement rate limiting to prevent API abuse.

---

## 🔗 Related Documentation

- [API Main Documentation](./README.md)
- [Database Schema](./MIGRATION_GUIDE_COMPANY_CONSOLIDATION.md)
- [Development Guide](../development.md)

---

## 📞 Support

For issues or questions:
- Check the API documentation at `/docs` endpoint
- Review error messages in the response
- Ensure company trading codes are valid and exist in the database

