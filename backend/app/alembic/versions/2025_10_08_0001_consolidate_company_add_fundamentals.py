"""consolidate company and add fundamental tables

Revision ID: 2025_10_08_0001
Revises: 2024_01_20_1000
Create Date: 2025-10-08 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2025_10_08_0001'
down_revision = 'seed_initial_data_20250830'
branch_labels = None
depends_on = None


def upgrade():
    # Step 1: Add UUID id column to company table (will become new primary key)
    op.execute("""
        ALTER TABLE company ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
    """)
    
    # Step 2: Populate the new id field for any null values
    op.execute("""
        UPDATE company SET id = gen_random_uuid() WHERE id IS NULL;
    """)
    
    # Step 3: Add missing columns from stockcompany to company
    op.execute("""
        ALTER TABLE company 
        ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
        ADD COLUMN IF NOT EXISTS market_cap NUMERIC,
        ADD COLUMN IF NOT EXISTS total_shares INTEGER,
        ADD COLUMN IF NOT EXISTS free_float NUMERIC,
        ADD COLUMN IF NOT EXISTS pe_ratio NUMERIC,
        ADD COLUMN IF NOT EXISTS pb_ratio NUMERIC,
        ADD COLUMN IF NOT EXISTS eps NUMERIC,
        ADD COLUMN IF NOT EXISTS nav NUMERIC,
        ADD COLUMN IF NOT EXISTS dividend_yield NUMERIC,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    """)
    
    # Step 4: Drop ALL foreign key constraints that reference company.company_id
    # This must happen BEFORE we drop the old primary key
    op.execute("ALTER TABLE marketinformation DROP CONSTRAINT IF EXISTS marketinformation_company_id_fkey CASCADE;")
    op.execute("ALTER TABLE alert DROP CONSTRAINT IF EXISTS alert_stock_id_fkey CASCADE;")
    op.execute("ALTER TABLE dailyohlc DROP CONSTRAINT IF EXISTS dailyohlc_company_id_fkey CASCADE;")
    op.execute("ALTER TABLE intradaytick DROP CONSTRAINT IF EXISTS intradaytick_company_id_fkey CASCADE;")
    op.execute("ALTER TABLE \"order\" DROP CONSTRAINT IF EXISTS order_stock_id_fkey CASCADE;")
    op.execute("ALTER TABLE portfolioposition DROP CONSTRAINT IF EXISTS portfolioposition_stock_id_fkey CASCADE;")
    op.execute("ALTER TABLE stockdata DROP CONSTRAINT IF EXISTS stockdata_company_id_fkey CASCADE;")
    op.execute("ALTER TABLE stocknews DROP CONSTRAINT IF EXISTS stocknews_stock_id_fkey CASCADE;")
    op.execute("ALTER TABLE trade DROP CONSTRAINT IF EXISTS trade_stock_id_fkey CASCADE;")
    op.execute("ALTER TABLE watchlistitem DROP CONSTRAINT IF EXISTS watchlistitem_stock_id_fkey CASCADE;")
    
    # Step 5: Now we can drop old company_id column and constraints, make id the primary key
    op.execute("ALTER TABLE company DROP CONSTRAINT IF EXISTS company_pkey CASCADE;")
    op.execute("ALTER TABLE company DROP CONSTRAINT IF EXISTS company_trading_code_key CASCADE;")
    op.execute("ALTER TABLE company DROP COLUMN IF EXISTS company_id CASCADE;")
    op.execute("ALTER TABLE company ALTER COLUMN id SET NOT NULL;")
    op.execute("ALTER TABLE company ADD PRIMARY KEY (id);")
    
    # Step 6: Add unique constraint on trading_code (symbol)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_company_trading_code ON company(trading_code);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_company_sector ON company(sector);")
    
    # Step 7: Update foreign key constraints to reference company.id (UUID) instead of company.company_id (INTEGER)
    # Note: Since no data migration is needed, we'll just drop the data in these tables by setting to NULL
    # The application will repopulate them as needed
    
    # marketinformation table - change company_id to UUID
    op.execute("ALTER TABLE marketinformation ALTER COLUMN company_id DROP NOT NULL;")
    op.execute("ALTER TABLE marketinformation ALTER COLUMN company_id TYPE UUID USING NULL;")
    op.execute("""
        ALTER TABLE marketinformation 
        ADD CONSTRAINT marketinformation_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
    """)
    
    # alert table - change stock_id to UUID
    op.execute("ALTER TABLE alert ALTER COLUMN stock_id DROP NOT NULL;")
    op.execute("ALTER TABLE alert ALTER COLUMN stock_id TYPE UUID USING NULL;")
    op.execute("""
        ALTER TABLE alert 
        ADD CONSTRAINT alert_stock_id_fkey 
        FOREIGN KEY (stock_id) REFERENCES company(id) ON DELETE CASCADE;
    """)
    
    # dailyohlc table - change company_id to UUID
    op.execute("ALTER TABLE dailyohlc ALTER COLUMN company_id DROP NOT NULL;")
    op.execute("ALTER TABLE dailyohlc ALTER COLUMN company_id TYPE UUID USING NULL;")
    op.execute("""
        ALTER TABLE dailyohlc 
        ADD CONSTRAINT dailyohlc_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
    """)
    
    # intradaytick table - change company_id to UUID
    op.execute("ALTER TABLE intradaytick ALTER COLUMN company_id DROP NOT NULL;")
    op.execute("ALTER TABLE intradaytick ALTER COLUMN company_id TYPE UUID USING NULL;")
    op.execute("""
        ALTER TABLE intradaytick 
        ADD CONSTRAINT intradaytick_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
    """)
    
    # order table - change stock_id to UUID
    op.execute("ALTER TABLE \"order\" ALTER COLUMN stock_id DROP NOT NULL;")
    op.execute("ALTER TABLE \"order\" ALTER COLUMN stock_id TYPE UUID USING NULL;")
    op.execute("""
        ALTER TABLE "order" 
        ADD CONSTRAINT order_stock_id_fkey 
        FOREIGN KEY (stock_id) REFERENCES company(id) ON DELETE CASCADE;
    """)
    
    # portfolioposition table - change stock_id to UUID
    op.execute("ALTER TABLE portfolioposition ALTER COLUMN stock_id DROP NOT NULL;")
    op.execute("ALTER TABLE portfolioposition ALTER COLUMN stock_id TYPE UUID USING NULL;")
    op.execute("""
        ALTER TABLE portfolioposition 
        ADD CONSTRAINT portfolioposition_stock_id_fkey 
        FOREIGN KEY (stock_id) REFERENCES company(id) ON DELETE CASCADE;
    """)
    
    # stockdata table - change company_id to UUID
    op.execute("ALTER TABLE stockdata ALTER COLUMN company_id DROP NOT NULL;")
    op.execute("ALTER TABLE stockdata ALTER COLUMN company_id TYPE UUID USING NULL;")
    op.execute("""
        ALTER TABLE stockdata 
        ADD CONSTRAINT stockdata_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
    """)
    
    # stocknews table - change stock_id to UUID
    op.execute("ALTER TABLE stocknews ALTER COLUMN stock_id DROP NOT NULL;")
    op.execute("ALTER TABLE stocknews ALTER COLUMN stock_id TYPE UUID USING NULL;")
    op.execute("""
        ALTER TABLE stocknews 
        ADD CONSTRAINT stocknews_stock_id_fkey 
        FOREIGN KEY (stock_id) REFERENCES company(id) ON DELETE CASCADE;
    """)
    
    # trade table - change stock_id to UUID
    op.execute("ALTER TABLE trade ALTER COLUMN stock_id DROP NOT NULL;")
    op.execute("ALTER TABLE trade ALTER COLUMN stock_id TYPE UUID USING NULL;")
    op.execute("""
        ALTER TABLE trade 
        ADD CONSTRAINT trade_stock_id_fkey 
        FOREIGN KEY (stock_id) REFERENCES company(id) ON DELETE CASCADE;
    """)
    
    # watchlistitem table - change stock_id to UUID
    op.execute("ALTER TABLE watchlistitem ALTER COLUMN stock_id DROP NOT NULL;")
    op.execute("ALTER TABLE watchlistitem ALTER COLUMN stock_id TYPE UUID USING NULL;")
    op.execute("""
        ALTER TABLE watchlistitem 
        ADD CONSTRAINT watchlistitem_stock_id_fkey 
        FOREIGN KEY (stock_id) REFERENCES company(id) ON DELETE CASCADE;
    """)
    
    # Step 8: Drop the stockcompany table since we're consolidating to company
    op.execute("DROP TABLE IF EXISTS stockcompany CASCADE;")
    
    # Step 13: Create new fundamental data tables
    
    # dividend_information table
    op.create_table(
        'dividend_information',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('cash_dividend', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('stock_dividend', sa.String(length=50), nullable=True),
        sa.Column('right_issue', sa.String(length=250), nullable=True),
        sa.Column('nav', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('yield_percentage', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['company_id'], ['company.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id', 'year', name='dividend_information_company_year_unique')
    )
    op.create_index('ix_dividend_information_company_id', 'dividend_information', ['company_id'])
    op.create_index('ix_dividend_information_year', 'dividend_information', ['year'])
    
    # financial_performance table
    op.create_table(
        'financial_performance',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('eps_basic', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('eps_diluted', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('nav_per_share', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('profit', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('total_comprehensive_income', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('pe_ratio', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('pb_ratio', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['company_id'], ['company.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id', 'year', name='financial_performance_company_year_unique')
    )
    op.create_index('ix_financial_performance_company_id', 'financial_performance', ['company_id'])
    op.create_index('ix_financial_performance_year', 'financial_performance', ['year'])
    
    # quarterly_performance table
    op.create_table(
        'quarterly_performance',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('quarter', sa.String(length=20), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('eps_basic', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('eps_diluted', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('market_price_end_period', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['company_id'], ['company.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id', 'quarter', 'date', name='quarterly_performance_company_quarter_date_unique')
    )
    op.create_index('ix_quarterly_performance_company_id', 'quarterly_performance', ['company_id'])
    op.create_index('ix_quarterly_performance_date', 'quarterly_performance', ['date'])
    
    # shareholding_pattern table
    op.create_table(
        'shareholding_pattern',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('sponsor_director', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('government', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('institute', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('foreign_holder', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('public_holder', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['company_id'], ['company.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id', 'date', name='shareholding_pattern_company_date_unique')
    )
    op.create_index('ix_shareholding_pattern_company_id', 'shareholding_pattern', ['company_id'])
    op.create_index('ix_shareholding_pattern_date', 'shareholding_pattern', ['date'])
    
    # loan_status table
    op.create_table(
        'loan_status',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('short_term_loan', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('long_term_loan', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('total_loan', sa.Numeric(precision=18, scale=2), 
                 sa.Computed('(short_term_loan + long_term_loan)', persisted=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['company_id'], ['company.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id', name='loan_status_company_id_unique')
    )
    op.create_index('ix_loan_status_company_id', 'loan_status', ['company_id'])
    
    # scraper_log table
    op.create_table(
        'scraper_log',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('scraper_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('companies_processed', sa.Integer(), nullable=True),
        sa.Column('companies_failed', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('host_ip', sa.String(length=50), nullable=True),
        sa.Column('started_at', sa.TIMESTAMP(), nullable=False),
        sa.Column('completed_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_scraper_log_scraper_type', 'scraper_log', ['scraper_type'])
    op.create_index('ix_scraper_log_started_at', 'scraper_log', ['started_at'])
    
    # Step 14: Add triggers for updated_at on new tables
    op.execute("""
        DROP TRIGGER IF EXISTS update_dividend_information_updated_at ON dividend_information;
        CREATE TRIGGER update_dividend_information_updated_at
            BEFORE UPDATE ON dividend_information
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)
    
    op.execute("""
        DROP TRIGGER IF EXISTS update_financial_performance_updated_at ON financial_performance;
        CREATE TRIGGER update_financial_performance_updated_at
            BEFORE UPDATE ON financial_performance
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)
    
    op.execute("""
        DROP TRIGGER IF EXISTS update_quarterly_performance_updated_at ON quarterly_performance;
        CREATE TRIGGER update_quarterly_performance_updated_at
            BEFORE UPDATE ON quarterly_performance
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)
    
    op.execute("""
        DROP TRIGGER IF EXISTS update_shareholding_pattern_updated_at ON shareholding_pattern;
        CREATE TRIGGER update_shareholding_pattern_updated_at
            BEFORE UPDATE ON shareholding_pattern
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)
    
    op.execute("""
        DROP TRIGGER IF EXISTS update_loan_status_updated_at ON loan_status;
        CREATE TRIGGER update_loan_status_updated_at
            BEFORE UPDATE ON loan_status
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)
    
    op.execute("""
        DROP TRIGGER IF EXISTS update_company_updated_at ON company;
        CREATE TRIGGER update_company_updated_at
            BEFORE UPDATE ON company
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade():
    # Drop triggers
    op.execute("DROP TRIGGER IF EXISTS update_dividend_information_updated_at ON dividend_information;")
    op.execute("DROP TRIGGER IF EXISTS update_financial_performance_updated_at ON financial_performance;")
    op.execute("DROP TRIGGER IF EXISTS update_quarterly_performance_updated_at ON quarterly_performance;")
    op.execute("DROP TRIGGER IF EXISTS update_shareholding_pattern_updated_at ON shareholding_pattern;")
    op.execute("DROP TRIGGER IF EXISTS update_loan_status_updated_at ON loan_status;")
    op.execute("DROP TRIGGER IF EXISTS update_company_updated_at ON company;")
    
    # Drop new tables
    op.drop_index('ix_scraper_log_started_at', 'scraper_log')
    op.drop_index('ix_scraper_log_scraper_type', 'scraper_log')
    op.drop_table('scraper_log')
    
    op.drop_index('ix_loan_status_company_id', 'loan_status')
    op.drop_table('loan_status')
    
    op.drop_index('ix_shareholding_pattern_date', 'shareholding_pattern')
    op.drop_index('ix_shareholding_pattern_company_id', 'shareholding_pattern')
    op.drop_table('shareholding_pattern')
    
    op.drop_index('ix_quarterly_performance_date', 'quarterly_performance')
    op.drop_index('ix_quarterly_performance_company_id', 'quarterly_performance')
    op.drop_table('quarterly_performance')
    
    op.drop_index('ix_financial_performance_year', 'financial_performance')
    op.drop_index('ix_financial_performance_company_id', 'financial_performance')
    op.drop_table('financial_performance')
    
    op.drop_index('ix_dividend_information_year', 'dividend_information')
    op.drop_index('ix_dividend_information_company_id', 'dividend_information')
    op.drop_table('dividend_information')
    
    # Recreate stockcompany table and reverse the migration
    # This is a simplified downgrade - in production you'd want to preserve all data
    op.execute("""
        CREATE TABLE stockcompany (
            id UUID PRIMARY KEY,
            symbol VARCHAR(50) NOT NULL,
            company_name VARCHAR(255) NOT NULL,
            sector VARCHAR(100) NOT NULL,
            industry VARCHAR(100) NOT NULL,
            market_cap NUMERIC,
            authorized_capital NUMERIC,
            paid_up_capital NUMERIC,
            face_value NUMERIC,
            total_shares INTEGER,
            free_float NUMERIC,
            pe_ratio NUMERIC,
            pb_ratio NUMERIC,
            eps NUMERIC,
            nav NUMERIC,
            dividend_yield NUMERIC,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("CREATE UNIQUE INDEX ix_stockcompany_symbol ON stockcompany(symbol);")
    
    # Note: Full data restoration would require backing up data before migration
    # This is a simplified version for demonstration

