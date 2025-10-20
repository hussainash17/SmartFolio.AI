"""
Benchmark Data Synchronization Script

Run this script to fetch and cache benchmark data from Yahoo Finance.
This should be run once initially and then scheduled to run daily.

Usage:
    uv run python sync_benchmarks.py
    
or:
    python sync_benchmarks.py
"""

from app.core.db import engine
from sqlmodel import Session
from app.services.benchmark_service import BenchmarkService


def sync_all_benchmarks(days: int = 365):
    """
    Sync all benchmark data.
    
    For DSE benchmarks (DSEX, DS30, DSES), this syncs from your marketsummary table.
    
    Args:
        days: Number of days of historical data to fetch (default: 365)
    """
    print(f"Starting benchmark synchronization ({days} days of history)...")
    print("=" * 60)
    
    with Session(engine) as db:
        service = BenchmarkService(db)
        
        # Dhaka Stock Exchange benchmarks
        benchmarks = [
            'dsex',   # DSEX - Dhaka Stock Exchange Broad Index
            'ds30',   # DS30 - Dhaka Stock Exchange 30 Index
            'dses',   # DSES - Dhaka Stock Exchange Shariah Index
        ]
        
        total = len(benchmarks)
        successful = 0
        failed = 0
        
        for i, benchmark_id in enumerate(benchmarks, 1):
            print(f"\n[{i}/{total}] Syncing {benchmark_id}...")
            try:
                service.sync_benchmark_data(benchmark_id, days=days)
                print(f"  ✅ {benchmark_id} synced successfully")
                successful += 1
            except Exception as e:
                print(f"  ❌ Error syncing {benchmark_id}: {str(e)}")
                failed += 1
    
    print("\n" + "=" * 60)
    print(f"Synchronization complete!")
    print(f"  ✅ Successful: {successful}")
    print(f"  ❌ Failed: {failed}")
    print("=" * 60)


if __name__ == "__main__":
    import sys
    
    # Allow specifying days as command line argument
    days = 365
    if len(sys.argv) > 1:
        try:
            days = int(sys.argv[1])
        except ValueError:
            print("Invalid days argument, using default (365)")
    
    sync_all_benchmarks(days)

