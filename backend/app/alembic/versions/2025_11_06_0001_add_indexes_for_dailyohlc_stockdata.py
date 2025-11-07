"""add_indexes_for_dailyohlc_stockdata

Revision ID: 2025_11_06_0001
Revises: 2025_10_20_0002
Create Date: 2025-11-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_11_06_0001'
down_revision = '2025_10_20_0002'
branch_labels = None
depends_on = None


def upgrade():
    # ========================================================================
    # DailyOHLC Table Indexes
    # ========================================================================
    
    # Composite index for common query pattern (company_id + date)
    # Used for: Historical charting, technical analysis, YTD calculations
    op.create_index(
        'idx_dailyohlc_company_date',
        'dailyohlc',
        ['company_id', sa.text('date DESC')],
        unique=False
    )
    
    # Unique constraint to prevent duplicate records per company+date
    # This ensures data integrity for daily OHLC data
    op.create_index(
        'idx_dailyohlc_company_date_unique',
        'dailyohlc',
        ['company_id', 'date'],
        unique=True
    )
    
    # ========================================================================
    # StockData Table Indexes
    # ========================================================================
    
    # Timestamp index for max timestamp queries (critical for top movers/most active)
    # Used for: Finding latest market snapshot
    op.create_index(
        'idx_stockdata_timestamp',
        'stockdata',
        [sa.text('timestamp DESC')],
        unique=False
    )
    
    # Composite index for latest per company queries (most common pattern)
    # Used for: Stock listing, portfolio valuation, dashboard summary
    op.create_index(
        'idx_stockdata_company_timestamp',
        'stockdata',
        ['company_id', sa.text('timestamp DESC')],
        unique=False
    )
    
    # Composite index for top movers queries (timestamp + change_percent)
    # Used for: GET /market/top-movers endpoint
    op.create_index(
        'idx_stockdata_timestamp_change',
        'stockdata',
        [sa.text('timestamp DESC'), sa.text('change_percent DESC')],
        unique=False
    )
    
    # Composite index for most active queries (timestamp + volume)
    # Used for: GET /market/most-active endpoint
    op.create_index(
        'idx_stockdata_timestamp_volume',
        'stockdata',
        [sa.text('timestamp DESC'), sa.text('volume DESC')],
        unique=False
    )


def downgrade():
    # Drop indexes in reverse order
    op.drop_index('idx_stockdata_timestamp_volume', table_name='stockdata')
    op.drop_index('idx_stockdata_timestamp_change', table_name='stockdata')
    op.drop_index('idx_stockdata_company_timestamp', table_name='stockdata')
    op.drop_index('idx_stockdata_timestamp', table_name='stockdata')
    op.drop_index('idx_dailyohlc_company_date_unique', table_name='dailyohlc')
    op.drop_index('idx_dailyohlc_company_date', table_name='dailyohlc')

