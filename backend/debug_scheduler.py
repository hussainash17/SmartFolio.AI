#!/usr/bin/env python3
"""
Debug script for testing scheduler functions in isolation
Run this with: uv run python debug_scheduler.py
"""

import logging
import sys
import os

# Configure logging for debugging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_imports():
    """Test if all required modules can be imported"""
    print("=== Testing Imports ===")
    try:
        import sentry_sdk
        print("✓ sentry_sdk imported successfully")
    except ImportError as e:
        print(f"✗ sentry_sdk import failed: {e}")
        return False
    
    try:
        from app.scraper.scheduler import fetch_and_save_companies, fetch_and_save_stock_data
        print("✓ scheduler functions imported successfully")
    except ImportError as e:
        print(f"✗ scheduler import failed: {e}")
        return False
    
    try:
        from app.scraper.dse import fetch_company_names, fetch_company_names_simple
        print("✓ DSE functions imported successfully")
    except ImportError as e:
        print(f"✗ DSE import failed: {e}")
        return False
    
    try:
        from app.scraper.stock_data import fetch_stock_data, fetch_stock_data_simple
        print("✓ stock data functions imported successfully")
    except ImportError as e:
        print(f"✗ stock data import failed: {e}")
        return False
    
    return True

def test_simple_functions():
    """Test the simple fetch functions that don't require network or database"""
    print("\n=== Testing Simple Functions ===")
    
    try:
        from app.scraper.dse import fetch_company_names_simple
        companies = fetch_company_names_simple()
        print(f"✓ Simple company fetch: {len(companies)} companies")
        for company in companies[:2]:
            print(f"  - {company['trading_code']}: {company['full_name']}")
    except Exception as e:
        print(f"✗ Simple company fetch failed: {e}")
    
    try:
        from app.scraper.stock_data import fetch_stock_data_simple
        stocks = fetch_stock_data_simple()
        print(f"✓ Simple stock fetch: {len(stocks)} stocks")
        for stock in stocks[:2]:
            print(f"  - {stock['trading_code']}: LTP={stock.get('ltp')}")
    except Exception as e:
        print(f"✗ Simple stock fetch failed: {e}")

def test_network_functions():
    """Test the network-dependent functions"""
    print("\n=== Testing Network Functions ===")
    
    try:
        from app.scraper.dse import fetch_company_names
        print("Testing DSE company fetch (this may take a moment)...")
        companies = fetch_company_names()
        print(f"✓ DSE company fetch: {len(companies)} companies")
        for company in companies[:2]:
            print(f"  - {company['trading_code']}: {company['full_name']}")
    except Exception as e:
        print(f"✗ DSE company fetch failed: {e}")
    
    try:
        from app.scraper.stock_data import fetch_stock_data
        print("Testing DSE stock fetch (this may take a moment)...")
        stocks = fetch_stock_data()
        print(f"✓ DSE stock fetch: {len(stocks)} stocks")
        for stock in stocks[:2]:
            print(f"  - {stock['trading_code']}: LTP={stock.get('ltp')}")
    except Exception as e:
        print(f"✗ DSE stock fetch failed: {e}")

def test_scheduler_functions():
    """Test the full scheduler functions (requires database)"""
    print("\n=== Testing Scheduler Functions ===")
    print("Note: These functions require database connection")
    
    try:
        from app.scraper.scheduler import fetch_and_save_companies
        print("Testing fetch_and_save_companies...")
        fetch_and_save_companies()
        print("✓ fetch_and_save_companies completed")
    except Exception as e:
        print(f"✗ fetch_and_save_companies failed: {e}")
    
    try:
        from app.scraper.scheduler import fetch_and_save_stock_data
        print("Testing fetch_and_save_stock_data...")
        fetch_and_save_stock_data()
        print("✓ fetch_and_save_stock_data completed")
    except Exception as e:
        print(f"✗ fetch_and_save_stock_data failed: {e}")

if __name__ == "__main__":
    print("Scheduler Debug Script")
    print("=" * 50)
    
    # Test imports first
    if not test_imports():
        print("\n❌ Import tests failed. Please check your environment setup.")
        sys.exit(1)
    
    # Test simple functions
    test_simple_functions()
    
    # Test network functions
    test_network_functions()
    
    # Test scheduler functions
    test_scheduler_functions()
    
    print("\n✅ Debug script completed!")
    print("\nTo debug in PyCharm:")
    print("1. Set breakpoints in this script or the original scheduler files")
    print("2. Run this script in debug mode")
    print("3. Or run the main application: uv run python app/main.py") 