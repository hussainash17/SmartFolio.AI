# Company Consolidation Migration Guide

## Overview

This migration consolidates the `stockcompany` and `company` tables into a single unified `company` table, and adds new fundamental data tables for storing company financial information.

**Migration File:** `2025_10_08_0001_consolidate_company_add_fundamentals.py`

## What Changed

### 1. Table Consolidation

- **Merged Tables:** `stockcompany` and `company` → `company`
- **Primary Key Change:** `company.company_id` (INTEGER) → `company.id` (UUID)
- **Symbol Field:** `trading_code` is now the primary symbol field (equivalent to old `stockcompany.symbol`)

### 2. Schema Changes

#### Company Table (Consolidated)
- **New Primary Key:** `id` (UUID) - replaces old `company_id` (INTEGER)
- **Retained Fields from old Company:**
  - All original company fields (address, phone, email, etc.)
  - Trading information (trading_code, scrip_code, etc.)
  
- **Added Fields from StockCompany:**
  - `company_name` - Full company name
  - `industry` - Industry classification
  - `market_cap` - Market capitalization
  - `total_shares` - Total number of shares
  - `free_float` - Free float percentage
  - `pe_ratio`, `pb_ratio`, `eps`, `nav`, `dividend_yield` - Market metrics
  - `is_active` - Active status flag
  - `created_at`, `updated_at` - Timestamps

### 3. Foreign Key Updates

All tables that previously referenced `stockcompany.id` now reference `company.id`:

- `alert` → `stock_id` → `company.id`
- `dailyohlc` → `company_id` → `company.id`
- `intradaytick` → `company_id` → `company.id`
- `order` → `stock_id` → `company.id`
- `portfolioposition` → `stock_id` → `company.id`
- `stockdata` → `company_id` → `company.id`
- `stocknews` → `stock_id` → `company.id`
- `trade` → `stock_id` → `company.id`
- `watchlistitem` → `stock_id` → `company.id`

### 4. New Fundamental Data Tables

#### dividend_information
Stores dividend information by year:
- `cash_dividend` - Cash dividend amount
- `stock_dividend` - Stock dividend percentage
- `right_issue` - Right issue information
- `nav` - Net Asset Value
- `yield_percentage` - Dividend yield percentage

**Unique Constraint:** `(company_id, year)`

#### financial_performance
Annual financial performance metrics:
- `eps_basic`, `eps_diluted` - Earnings per share
- `nav_per_share` - NAV per share
- `profit` - Annual profit
- `total_comprehensive_income` - Total comprehensive income
- `pe_ratio`, `pb_ratio` - Valuation ratios

**Unique Constraint:** `(company_id, year)`

#### quarterly_performance
Quarterly performance data:
- `quarter` - Quarter identifier (Q1, Q2, Q3, Half Yearly, 9 Months, Annual)
- `date` - Quarter end date
- `eps_basic`, `eps_diluted` - Quarterly EPS
- `market_price_end_period` - Market price at quarter end

**Unique Constraint:** `(company_id, quarter, date)`

#### shareholding_pattern
Shareholding distribution by date:
- `sponsor_director` - Sponsor/Director holding percentage
- `government` - Government holding percentage
- `institute` - Institutional holding percentage
- `foreign_holder` - Foreign holding percentage
- `public_holder` - Public holding percentage

**Unique Constraint:** `(company_id, date)`

#### loan_status
Company loan information:
- `short_term_loan` - Short-term loan amount
- `long_term_loan` - Long-term loan amount
- `total_loan` - Computed total (short + long term)

**Unique Constraint:** `company_id`

#### scraper_log
Logging for scraper operations:
- `scraper_type` - Type of scraper (REALTIME, FUNDAMENTAL, COMPANY_LIST)
- `status` - Scraper status (SUCCESS, FAILED, PARTIAL)
- `companies_processed` - Number of companies processed
- `companies_failed` - Number of failures
- `error_message` - Error details
- `host_ip` - Host IP address
- `started_at`, `completed_at` - Timing information
- `duration_seconds` - Duration in seconds

## Migration Strategy

### Data Migration Flow

1. **Create Mapping Table**
   - Temporary table linking old `company_id` to `stockcompany.id`
   - Mapping based on `trading_code = symbol`

2. **Add UUID Column to Company**
   - Add `id` UUID column to existing company table
   - Populate with matching stockcompany UUIDs where possible
   - Generate new UUIDs for companies without matches

3. **Merge Data**
   - Copy stockcompany fields to company table
   - Insert companies from stockcompany that don't exist in company
   - Preserve existing company data where available

4. **Update Foreign Keys**
   - Drop old foreign key constraints
   - Create new foreign key constraints pointing to `company.id`
   - All existing data relationships are preserved via UUID matching

5. **Drop Old Structures**
   - Drop `stockcompany` table
   - Drop old `company_id` column
   - Make `id` the primary key

6. **Create New Tables**
   - Create all new fundamental data tables
   - Add appropriate indexes and constraints

### Backwards Compatibility

- **StockCompany Model:** The `StockCompany` class in `stock.py` is marked as `table=False` (non-table model) and deprecated
- **Use Company Instead:** All new code should use the `Company` model
- **API Compatibility:** Existing API endpoints should continue to work, but return Company data

## Code Changes

### Model Updates

1. **backend/app/model/company.py**
   - Updated `Company` model with UUID primary key
   - Added fields from StockCompany
   - Added relationships to all dependent tables

2. **backend/app/model/fundamental.py** (NEW)
   - All new fundamental data models
   - Includes Pydantic schemas for API

3. **backend/app/model/stock.py**
   - `StockCompany` marked as non-table (deprecated)
   - Foreign keys updated to reference `company.id`

4. **backend/app/model/portfolio.py**
   - Foreign keys updated to `company.id`
   - Relationships updated to use `Company`

5. **backend/app/model/trade.py**
   - Foreign keys updated to `company.id`
   - Relationships updated to use `Company`

6. **backend/app/model/order.py**
   - Foreign keys updated to `company.id`
   - Relationships updated to use `Company`

7. **backend/app/model/alert.py**
   - Foreign keys updated to `company.id`
   - Relationships updated to use `Company`

### API Routes (TO DO)

The following routes may need updates to use `Company` instead of `StockCompany`:
- `backend/app/api/routes/market.py`
- Any routes using `StockCompany` model

## Running the Migration

### Prerequisites

1. **Backup Database:** Always backup before running migrations
   ```bash
   pg_dump -h localhost -U postgres -d tradesmart > backup_before_migration.sql
   ```

2. **Check Current State:**
   ```bash
   cd backend
   alembic current
   ```

### Execute Migration

```bash
cd backend
alembic upgrade head
```

### Verify Migration

1. **Check Tables:**
   ```sql
   \dt -- List all tables
   \d company -- Describe company table
   ```

2. **Verify Data:**
   ```sql
   -- Check company table has data
   SELECT COUNT(*) FROM company;
   
   -- Verify stockcompany is gone
   SELECT COUNT(*) FROM stockcompany; -- Should error
   
   -- Check new tables exist
   SELECT COUNT(*) FROM dividend_information;
   SELECT COUNT(*) FROM financial_performance;
   ```

3. **Check Foreign Keys:**
   ```sql
   -- Verify foreign key relationships
   SELECT 
       tc.table_name, 
       kcu.column_name,
       ccu.table_name AS foreign_table_name
   FROM information_schema.table_constraints AS tc 
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY' 
     AND ccu.table_name = 'company';
   ```

## Rollback

If you need to rollback:

```bash
alembic downgrade -1
```

**Note:** The downgrade will recreate the `stockcompany` table structure but may not fully restore all data. Always ensure you have a backup before migration.

## Post-Migration Tasks

### 1. Update API Endpoints

Search for and update any code using `StockCompany`:

```bash
# Find usages
grep -r "StockCompany" backend/app/api/
grep -r "stockcompany" backend/app/api/
```

Replace with `Company` model usage.

### 2. Update Services

Check and update any services:

```bash
grep -r "StockCompany" backend/app/services/
```

### 3. Update Scrapers

Update any scrapers that populate company data:

```bash
grep -r "StockCompany" backend/app/scraper/
```

### 4. Test Critical Paths

Test the following:
- [ ] Company listing API
- [ ] Stock data retrieval
- [ ] Portfolio operations
- [ ] Order placement
- [ ] Watchlist operations
- [ ] Trade recording

### 5. Populate Fundamental Data

Create scrapers or import scripts to populate the new fundamental tables:
- `dividend_information`
- `financial_performance`
- `quarterly_performance`
- `shareholding_pattern`
- `loan_status`

## Benefits

1. **Simplified Schema:** Single source of truth for company information
2. **UUID Consistency:** All primary keys now use UUID
3. **Better Data Model:** Separation of company info from market data
4. **Fundamental Analysis:** New tables enable comprehensive fundamental analysis
5. **Easier Maintenance:** No more synchronization between two company tables

## Breaking Changes

### For API Consumers

- Company IDs are now UUIDs instead of integers
- `trading_code` is the symbol field (not `symbol`)
- `company_name` may be separate from `name` field

### For Internal Code

- All references to `StockCompany` should use `Company`
- Foreign key references updated from `stockcompany.id` to `company.id`
- Integer company IDs no longer valid

## Support

For issues or questions about this migration:
1. Check the migration logs: `backend/app/alembic/versions/2025_10_08_0001_consolidate_company_add_fundamentals.py`
2. Review model definitions in `backend/app/model/`
3. Contact the development team

## References

- **Migration File:** `backend/app/alembic/versions/2025_10_08_0001_consolidate_company_add_fundamentals.py`
- **Company Model:** `backend/app/model/company.py`
- **Fundamental Models:** `backend/app/model/fundamental.py`
- **Stock Models:** `backend/app/model/stock.py`

