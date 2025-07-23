#!/usr/bin/env python3
"""
Script to check and fix database schema for volume fields
"""
import asyncio
from sqlmodel import create_engine, text
from app.core.config import settings

def check_and_fix_schema():
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    
    with engine.connect() as conn:
        # Check current column types
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'dailyohlc' AND column_name = 'volume'
        """))
        
        for row in result:
            print(f"dailyohlc.volume type: {row.data_type}")
        
        # Check if volume is still INTEGER
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'dailyohlc' AND column_name = 'volume' AND data_type = 'integer'
        """))
        
        if result.fetchone():
            print("Volume field is still INTEGER, fixing...")
            
            # Fix the volume field
            conn.execute(text("ALTER TABLE dailyohlc ALTER COLUMN volume TYPE BIGINT USING volume::BIGINT"))
            conn.execute(text("ALTER TABLE stockdata ALTER COLUMN volume TYPE BIGINT USING volume::BIGINT"))
            conn.execute(text("ALTER TABLE intradaytick ALTER COLUMN volume TYPE BIGINT USING volume::BIGINT"))
            conn.execute(text("ALTER TABLE marketsummary ALTER COLUMN total_volume TYPE BIGINT USING total_volume::BIGINT"))
            
            conn.commit()
            print("Volume fields fixed to BIGINT")
        else:
            print("Volume fields are already BIGINT")
        
        # Check all volume fields
        result = conn.execute(text("""
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE column_name IN ('volume', 'total_volume') 
            AND table_name IN ('dailyohlc', 'stockdata', 'intradaytick', 'marketsummary')
            ORDER BY table_name, column_name
        """))
        
        print("\nCurrent volume field types:")
        for row in result:
            print(f"{row.table_name}.{row.column_name}: {row.data_type}")

if __name__ == "__main__":
    check_and_fix_schema() 