# Fix for KYC Tables Missing Error

## Problem
The backend is getting errors because the `kycinformation` and `useraccount` tables don't exist:

```
(psycopg.errors.UndefinedTable) relation "kycinformation" does not exist
(psycopg.errors.UndefinedTable) relation "useraccount" does not exist
```

## Solution
I've created the necessary database migration files to create these missing tables.

### Files Created:
1. **Migration file**: `backend/app/alembic/versions/2024_08_03_1600_add_kyc_useraccount_tables.py`
2. **Direct SQL script**: `create_missing_tables.sql` 
3. **Python creation script**: `backend/create_tables_directly.py`

### Method 1: Using Alembic (Recommended)
If you have access to the database where the backend is running:

```bash
cd backend
# Set up environment 
export PYTHONPATH=/workspace/backend

# Run the migration
alembic upgrade head
```

### Method 2: Using Direct SQL
Connect to your PostgreSQL database and run:

```bash
psql -h [HOST] -U [USERNAME] -d [DATABASE] -f create_missing_tables.sql
```

### Method 3: Using the Python Script
If you have the Python environment set up:

```bash
cd backend
python create_tables_directly.py
```

## Tables That Will Be Created:

### 1. kycinformation
- Stores KYC (Know Your Customer) information for users
- Includes personal info, address, employment, financial data
- Links to the `user` table via foreign key

### 2. useraccount  
- Stores different types of investment accounts for users
- Supports individual, joint, retirement accounts, etc.
- Links to the `user` table via foreign key

### 3. userinvestmentgoal
- Stores investment goals and objectives for users
- Includes target amounts, dates, priorities
- Links to the `user` table via foreign key

## Verification
After running any of the above methods, verify the tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('kycinformation', 'useraccount', 'userinvestmentgoal');
```

## Why This Happened
The SQLModel table definitions exist in the code (`app/model/user.py`) but the corresponding database tables were never created. The migration system wasn't properly run to create these tables.

## Next Steps
1. Run one of the migration methods above
2. Restart the backend application
3. Test the KYC endpoints to ensure they work:
   - `GET /api/v1/kyc/information`
   - `POST /api/v1/kyc/information`
   - `POST /api/v1/kyc/accounts`

The backend should now work without the "relation does not exist" errors!