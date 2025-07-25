#!/usr/bin/env python3
"""
Final verification script to confirm volume issue is resolved
"""
from sqlmodel import create_engine, text
from app.core.config import settings

def verify_volume_fix():
    print("🔍 Verifying volume field fix...")
    
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    
    with engine.connect() as conn:
        # Check all volume fields are BIGINT in database
        result = conn.execute(text("""
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE column_name IN ('volume', 'total_volume') 
            AND table_name IN ('dailyohlc', 'stockdata', 'intradaytick', 'marketsummary')
            ORDER BY table_name, column_name
        """))
        
        print("\n📊 Database Schema:")
        all_bigint = True
        for row in result:
            print(f"  {row.table_name}.{row.column_name}: {row.data_type}")
            if row.data_type != 'bigint':
                all_bigint = False
        
        if all_bigint:
            print("\n✅ SUCCESS: All volume fields are BIGINT in database!")
        else:
            print("\n❌ ERROR: Some volume fields are not BIGINT in database!")
            return False
        
        # Test inserting a large volume value
        print("\n🧪 Testing large volume insertion...")
        try:
            # Test with a value larger than INT_MAX (2,147,483,647)
            large_volume = 9865381000  # This was the value that caused the original error
            
            # Insert a test record (we'll clean it up)
            conn.execute(text("""
                INSERT INTO dailyohlc (id, company_id, date, open_price, high, low, close_price, volume, turnover, trades_count, change, change_percent)
                VALUES (
                    gen_random_uuid(),
                    (SELECT id FROM stockcompany LIMIT 1),
                    CURRENT_DATE,
                    100.00,
                    110.00,
                    90.00,
                    105.00,
                    :volume,
                    1000000.00,
                    1000,
                    5.00,
                    5.00
                )
            """), {"volume": large_volume})
            
            # Clean up the test record
            conn.execute(text("DELETE FROM dailyohlc WHERE volume = :volume"), {"volume": large_volume})
            conn.commit()
            
            print(f"✅ SUCCESS: Large volume value {large_volume} was inserted and deleted successfully!")
            return True
            
        except Exception as e:
            print(f"❌ ERROR: Failed to insert large volume: {e}")
            conn.rollback()
            return False

if __name__ == "__main__":
    success = verify_volume_fix()
    if success:
        print("\n🎉 Volume issue has been completely resolved!")
        print("   - Database columns are BIGINT")
        print("   - Large volume values can be stored")
        print("   - StockNow scraper should work without errors")
    else:
        print("\n💥 Volume issue still needs attention!") 