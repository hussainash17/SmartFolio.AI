#!/usr/bin/env python3
"""
Direct table creation script for KYC and UserAccount tables.
This script will create the missing tables using the same database connection as the backend.
"""

import os
import sys
from datetime import datetime

# Add the backend directory to Python path
sys.path.append('/workspace/backend')

try:
    from sqlalchemy import create_engine, text
    from app.core.config import settings
    from app.model.user import KYCInformation, UserAccount, UserInvestmentGoal
    from sqlmodel import SQLModel
    
    print("Creating database engine...")
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    
    print("Testing database connection...")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✓ Database connection successful!")
    
    print("Creating missing tables...")
    
    # Create the tables
    KYCInformation.__table__.create(engine, checkfirst=True)
    print("✓ Created kycinformation table")
    
    UserAccount.__table__.create(engine, checkfirst=True)
    print("✓ Created useraccount table")
    
    UserInvestmentGoal.__table__.create(engine, checkfirst=True)
    print("✓ Created userinvestmentgoal table")
    
    print("\n✅ All tables created successfully!")
    
    # Verify tables exist
    print("\nVerifying tables...")
    with engine.connect() as conn:
        tables = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('kycinformation', 'useraccount', 'userinvestmentgoal')
            ORDER BY table_name
        """)).fetchall()
        
        print("Found tables:")
        for table in tables:
            print(f"  - {table[0]}")
            
    print("\n🎉 Database setup complete! The backend should now work properly.")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)