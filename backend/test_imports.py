#!/usr/bin/env python3
"""
Test script to verify that all service imports work correctly.

This script can be run to test if the missing PortfolioService and ResearchService
have been successfully created and can be imported without errors.

Usage:
    python test_imports.py
    # or if you have a virtual environment:
    # source .venv/bin/activate && python test_imports.py
    # or with uv:
    # uv run python test_imports.py
"""

import sys
import traceback

def test_service_imports():
    """Test importing all services"""
    print("Testing service imports...")
    
    try:
        print("1. Testing BaseService import...")
        from app.services.base import BaseService, ServiceException
        print("   ✓ BaseService imported successfully")
        
        print("2. Testing KYCService import...")
        from app.services.kyc_service import KYCService
        print("   ✓ KYCService imported successfully")
        
        print("3. Testing AnalyticsService import...")
        from app.services.analytics_service import AnalyticsService
        print("   ✓ AnalyticsService imported successfully")
        
        print("4. Testing PortfolioService import...")
        from app.services.portfolio_service import PortfolioService
        print("   ✓ PortfolioService imported successfully")
        
        print("5. Testing ResearchService import...")
        from app.services.research_service import ResearchService
        print("   ✓ ResearchService imported successfully")
        
        print("6. Testing services __init__ import...")
        from app.services import (
            BaseService, KYCService, PortfolioService, 
            AnalyticsService, ResearchService
        )
        print("   ✓ All services imported from __init__ successfully")
        
        return True
        
    except ImportError as e:
        print(f"   ✗ Import Error: {e}")
        print("   Full traceback:")
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"   ✗ Unexpected Error: {e}")
        print("   Full traceback:")
        traceback.print_exc()
        return False

def test_model_imports():
    """Test importing key models"""
    print("\nTesting model imports...")
    
    try:
        print("1. Testing portfolio models...")
        from app.model.portfolio import (
            Portfolio, PortfolioCreate, PortfolioUpdate, 
            PortfolioPosition, Watchlist, WatchlistItem
        )
        print("   ✓ Portfolio models imported successfully")
        
        print("2. Testing trade models...")
        from app.model.trade import Trade, TradeCreate, TradeUpdate
        print("   ✓ Trade models imported successfully")
        
        print("3. Testing order models...")
        from app.model.order import Order, OrderCreate, OrderUpdate
        print("   ✓ Order models imported successfully")
        
        return True
        
    except ImportError as e:
        print(f"   ✗ Import Error: {e}")
        print("   Full traceback:")
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"   ✗ Unexpected Error: {e}")
        print("   Full traceback:")
        traceback.print_exc()
        return False

def test_main_app_import():
    """Test importing the main FastAPI app"""
    print("\nTesting main app import...")
    
    try:
        print("1. Testing main app import...")
        from app.main import app
        print("   ✓ Main FastAPI app imported successfully")
        
        print("2. Testing API routes import...")
        from app.api.main import api_router
        print("   ✓ API router imported successfully")
        
        return True
        
    except ImportError as e:
        print(f"   ✗ Import Error: {e}")
        print("   Full traceback:")
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"   ✗ Unexpected Error: {e}")
        print("   Full traceback:")
        traceback.print_exc()
        return False

def main():
    """Run all import tests"""
    print("=" * 60)
    print("Portfolio Management System - Import Test")
    print("=" * 60)
    
    all_passed = True
    
    # Test service imports
    if not test_service_imports():
        all_passed = False
    
    # Test model imports
    if not test_model_imports():
        all_passed = False
    
    # Test main app import
    if not test_main_app_import():
        all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print("The missing services have been successfully created.")
        print("You can now run the FastAPI application without import errors.")
        print("\nTo start the application, run:")
        print("  fastapi dev app/main.py")
        print("  # or")
        print("  uvicorn app.main:app --reload")
        sys.exit(0)
    else:
        print("❌ SOME TESTS FAILED!")
        print("Please check the error messages above and fix any issues.")
        sys.exit(1)

if __name__ == "__main__":
    main()