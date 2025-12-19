"""
Script to fetch Q2 quarterly performance data from StockNow API and update the database.

This script:
1. Fetches all companies from the company table
2. For each company, calls the API to get Q2 EPS data
3. Inserts/updates the quarterly_performance table with the data

Usage:
    # Update all companies (from project root directory):
    cd backend
    python ../scripts/update_quarterly_performance_q2.py
    
    # Update single company by trading code:
    cd backend
    python ../scripts/update_quarterly_performance_q2.py SQURPHARMA
    
    # Or if running from project root with backend in PYTHONPATH:
    PYTHONPATH=backend python scripts/update_quarterly_performance_q2.py
    PYTHONPATH=backend python scripts/update_quarterly_performance_q2.py SQURPHARMA

Requirements:
    - Company table must exist with columns: id (UUID) and trading_code
    - Quarterly_performance table must exist (see table structure below)
    - Database connection configured in app.core.config.settings (via .env file)
    - All backend dependencies installed (httpx, sqlmodel, psycopg, etc.)

API Endpoint Pattern:
    https://stocknow.com.bd/api/v1/instruments/{COMPANY_CODE}/fundamentals/q2_eps_cont_op?groupBy=meta_date&yearLimit=16

Expected quarterly_performance table structure:
    CREATE TABLE quarterly_performance (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
        quarter VARCHAR(20) NOT NULL,
        date DATE NOT NULL,
        eps_basic NUMERIC(18, 2),
        eps_diluted NUMERIC(18, 2),
        market_price_end_period NUMERIC(18, 2),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE (company_id, quarter, date)
    );
"""

import asyncio
import sys
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from typing import List, Dict, Any, Optional
import httpx
from sqlmodel import Session, text

# Add parent directory to path to import app modules
from pathlib import Path
script_dir = Path(__file__).parent.absolute()
project_root = script_dir.parent.absolute()
backend_dir = project_root / "backend"

if not backend_dir.exists():
    print(f"❌ Error: Backend directory not found at {backend_dir}")
    print("   Please ensure you're running this script from the TradeSmart project root.")
    sys.exit(1)

sys.path.insert(0, str(backend_dir))

try:
    from app.core.db import engine
    from app.core.config import settings
except ImportError as e:
    print(f"❌ Error importing app modules: {e}")
    print(f"   Make sure you're running from the project root and backend dependencies are installed.")
    print(f"   Backend directory: {backend_dir}")
    sys.exit(1)


API_BASE_URL = "https://stocknow.com.bd/api/v1/instruments"
QUARTER = "Q2"
EPS_METRIC = "q2_eps_cont_op"


def fetch_company_codes(db: Session) -> List[Dict[str, Any]]:
    """
    Fetch all companies from the database.
    
    Returns:
        List of dictionaries with company_id and trading_code
    """
    try:
        # Fetch companies using id column directly
        query = text("""
            SELECT 
                id as company_id,
                trading_code as code
            FROM company
            WHERE trading_code IS NOT NULL AND trading_code != ''
        """)
        
        result = db.execute(query)
        companies = [dict(row._mapping) for row in result.fetchall()]
        
        if not companies:
            print("⚠️  No companies found in database with valid trading codes.")
        
        return companies
    except Exception as e:
        print(f"❌ Error fetching companies: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


async def fetch_quarterly_data_from_api(company_code: str) -> Optional[Dict[str, Any]]:
    """
    Fetch quarterly performance data from StockNow API.
    
    Args:
        company_code: Company trading code (e.g., 'SQURPHARMA')
        
    Returns:
        Dictionary with date as key and list of records as value, or None if error
    """
    url = f"{API_BASE_URL}/{company_code}/fundamentals/{EPS_METRIC}?groupBy=meta_date&yearLimit=16"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            return data
    except httpx.HTTPStatusError as e:
        print(f"   ⚠️  HTTP error for {company_code}: {e.response.status_code} - {e.response.text[:100]}")
        return None
    except httpx.TimeoutException:
        print(f"   ⚠️  Timeout error for {company_code}")
        return None
    except Exception as e:
        print(f"   ⚠️  Error fetching data for {company_code}: {str(e)}")
        return None


def parse_api_response(api_data: Dict[str, Any], company_code: str) -> List[Dict[str, Any]]:
    """
    Parse API response into list of quarterly performance records.
    
    Args:
        api_data: API response dictionary
        company_code: Company code for reference
        
    Returns:
        List of parsed records ready for database insertion
    """
    records = []
    
    # Values that should be skipped (non-numeric)
    skip_values = {"n/a", "N/A", "na", "NA", "-", "--", "", "null", "NULL", "None"}
    
    for date_str, data_list in api_data.items():
        if not data_list or len(data_list) == 0:
            continue
            
        # Get the first record (should only be one per date)
        record_data = data_list[0]
        
        # Extract and clean the EPS value (remove trailing spaces)
        eps_value_str = record_data.get("meta_value", "").strip()
        
        # Skip empty or non-numeric values
        if not eps_value_str or eps_value_str.lower() in skip_values:
            continue
            
        try:
            eps_value = Decimal(eps_value_str)
            record_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            
            records.append({
                "date": record_date,
                "eps_basic": eps_value,
                "eps_diluted": None,  # Not available in this API endpoint
                "market_price_end_period": None,  # Not available in this API endpoint
            })
        except (ValueError, TypeError, InvalidOperation) as e:
            # Handle decimal.InvalidOperation and other conversion errors
            # Skip this record but don't fail the entire process
            continue
    
    return records


def upsert_quarterly_performance(
    db: Session,
    company_id: str,
    records: List[Dict[str, Any]]
) -> int:
    """
    Insert or update quarterly performance records in the database.
    
    Args:
        db: Database session
        company_id: Company UUID
        records: List of quarterly performance records
        
    Returns:
        Number of records inserted/updated
    """
    if not records:
        return 0
    
    inserted_count = 0
    
    for record in records:
        try:
            # Use ON CONFLICT to update if record already exists
            query = text("""
                INSERT INTO quarterly_performance (
                    company_id, quarter, date, eps_basic, eps_diluted, 
                    market_price_end_period, updated_at
                )
                VALUES (
                    :company_id, :quarter, :date, :eps_basic, :eps_diluted,
                    :market_price_end_period, CURRENT_TIMESTAMP
                )
                ON CONFLICT (company_id, quarter, date) 
                DO UPDATE SET
                    eps_basic = EXCLUDED.eps_basic,
                    eps_diluted = EXCLUDED.eps_diluted,
                    market_price_end_period = EXCLUDED.market_price_end_period,
                    updated_at = CURRENT_TIMESTAMP
            """)
            
            db.execute(query, {
                "company_id": company_id,
                "quarter": QUARTER,
                "date": record["date"],
                "eps_basic": record["eps_basic"],
                "eps_diluted": record["eps_diluted"],
                "market_price_end_period": record["market_price_end_period"],
            })
            
            inserted_count += 1
        except Exception as e:
            print(f"   ❌ Error inserting record for date {record['date']}: {str(e)}")
            continue
    
    db.commit()
    return inserted_count


async def process_company(
    db: Session,
    company: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Process a single company: fetch API data and update database.
    
    Args:
        db: Database session
        company: Company dictionary with company_id and code
        
    Returns:
        Dictionary with processing results
    """
    company_id = company["company_id"]
    company_code = company["code"]
    
    print(f"📊 Processing {company_code} (ID: {company_id})...")
    
    # Fetch data from API
    api_data = await fetch_quarterly_data_from_api(company_code)
    
    if not api_data:
        return {
            "company_code": company_code,
            "success": False,
            "records_processed": 0,
            "error": "Failed to fetch API data"
        }
    
    # Parse API response
    records = parse_api_response(api_data, company_code)
    
    if not records:
        print(f"   ⚠️  No valid records found for {company_code}")
        return {
            "company_code": company_code,
            "success": False,
            "records_processed": 0,
            "error": "No valid records in API response"
        }
    
    # Insert/update records in database
    try:
        records_count = upsert_quarterly_performance(db, company_id, records)
        print(f"   ✅ Processed {records_count} records for {company_code}")
        
        return {
            "company_code": company_code,
            "success": True,
            "records_processed": records_count
        }
    except Exception as e:
        print(f"   ❌ Error updating database for {company_code}: {str(e)}")
        db.rollback()
        return {
            "company_code": company_code,
            "success": False,
            "records_processed": 0,
            "error": str(e)
        }


async def update_single_company(trading_code: str) -> Dict[str, Any]:
    """
    Update quarterly performance data for a single company by trading code.
    
    Args:
        trading_code: Company trading code (e.g., 'SQURPHARMA')
        
    Returns:
        Dictionary with processing results
        
    Example:
        result = await update_single_company('SQURPHARMA')
        print(f"Success: {result['success']}, Records: {result['records_processed']}")
    """
    print(f"🚀 Updating Q2 quarterly performance for: {trading_code}")
    print("=" * 60)
    
    with Session(engine) as db:
        # Check if required tables exist
        if not check_table_exists(db, "company"):
            return {
                "company_code": trading_code,
                "success": False,
                "records_processed": 0,
                "error": "Company table does not exist"
            }
        
        if not check_table_exists(db, "quarterly_performance"):
            return {
                "company_code": trading_code,
                "success": False,
                "records_processed": 0,
                "error": "Quarterly_performance table does not exist"
            }
        
        # Fetch company from database
        query = text("""
            SELECT 
                id as company_id,
                trading_code as code
            FROM company
            WHERE trading_code = :trading_code
        """)
        
        result = db.execute(query, {"trading_code": trading_code})
        row = result.fetchone()
        
        if not row:
            return {
                "company_code": trading_code,
                "success": False,
                "records_processed": 0,
                "error": f"Company with trading code '{trading_code}' not found in database"
            }
        
        company = dict(row._mapping)
        
        # Process the company
        return await process_company(db, company)


def check_table_exists(db: Session, table_name: str) -> bool:
    """Check if a table exists in the database."""
    query = text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = :table_name
        )
    """)
    result = db.execute(query, {"table_name": table_name})
    return result.scalar()


async def main():
    """
    Main function to run the Q2 quarterly performance update script.
    
    Usage:
        # Update all companies:
        python scripts/update_quarterly_performance_q2.py
        
        # Update single company:
        python scripts/update_quarterly_performance_q2.py SQURPHARMA
    """
    # Check if a trading code was provided as command-line argument
    if len(sys.argv) > 1:
        trading_code = sys.argv[1].strip().upper()
        print(f"🎯 Single company mode (Q2): {trading_code}")
        print()
        
        result = await update_single_company(trading_code)
        
        # Print result summary
        print("\n" + "=" * 60)
        print("📊 RESULT")
        print("=" * 60)
        print(f"Company: {result['company_code']}")
        print(f"Success: {'✅ Yes' if result['success'] else '❌ No'}")
        print(f"Records processed: {result['records_processed']}")
        if not result['success']:
            print(f"Error: {result.get('error', 'Unknown error')}")
        print("\n✅ Q2 Update complete!")
        return
    
    # Process all companies
    print("🚀 Starting Q2 Quarterly Performance Data Update")
    print("=" * 60)
    
    with Session(engine) as db:
        # Check if required tables exist
        print("\n🔍 Checking database tables...")
        
        if not check_table_exists(db, "company"):
            print("❌ Company table does not exist!")
            print("   Please create the company table first.")
            return
        
        if not check_table_exists(db, "quarterly_performance"):
            print("❌ Quarterly_performance table does not exist!")
            print("   Please create the quarterly_performance table first.")
            print("\n   Expected table structure:")
            print("   CREATE TABLE quarterly_performance (")
            print("       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,")
            print("       company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,")
            print("       quarter VARCHAR(20) NOT NULL,")
            print("       date DATE NOT NULL,")
            print("       eps_basic NUMERIC(18, 2),")
            print("       eps_diluted NUMERIC(18, 2),")
            print("       market_price_end_period NUMERIC(18, 2),")
            print("       created_at TIMESTAMP DEFAULT NOW() NOT NULL,")
            print("       updated_at TIMESTAMP DEFAULT NOW() NOT NULL,")
            print("       UNIQUE (company_id, quarter, date)")
            print("   );")
            return
        
        print("✅ Required tables exist")
        
        # Fetch all companies
        print("\n📋 Fetching companies from database...")
        companies = fetch_company_codes(db)
        
        if not companies:
            print("❌ No companies found. Exiting.")
            return
        
        print(f"✅ Found {len(companies)} companies")
        
        # Process each company
        print(f"\n🔄 Processing {len(companies)} companies...")
        print("-" * 60)
        
        results = []
        success_count = 0
        total_records = 0
        
        for idx, company in enumerate(companies, 1):
            result = await process_company(db, company)
            results.append(result)
            
            if result["success"]:
                success_count += 1
                total_records += result["records_processed"]
            
            # Add delay between API calls (except for the last one)
            if idx < len(companies):
                await asyncio.sleep(0.5)  # 500ms delay between calls
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 SUMMARY")
        print("=" * 60)
        print(f"Total companies processed: {len(companies)}")
        print(f"Successfully processed: {success_count}")
        print(f"Failed: {len(companies) - success_count}")
        print(f"Total records inserted/updated: {total_records}")
        
        if len(companies) - success_count > 0:
            print("\n⚠️  Failed companies:")
            for result in results:
                if not result["success"]:
                    print(f"   - {result['company_code']}: {result.get('error', 'Unknown error')}")
        
        print("\n✅ Q2 Quarterly performance update complete!")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Process interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
