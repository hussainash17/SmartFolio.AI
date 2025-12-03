"""add donchian channel cache

Revision ID: 2025_12_03_0001
Revises: 2025_12_01_0001
Create Date: 2025-12-03 20:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2025_12_03_0001'
down_revision = '2025_12_01_0001'
branch_labels = None
depends_on = None


def upgrade():
    # Check if table exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'donchian_channel_cache' not in tables:
        # Create table if it doesn't exist
        op.create_table('donchian_channel_cache',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('calculation_date', sa.Date(), nullable=False),
            sa.Column('current_price', sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column('data_points', sa.Integer(), nullable=True),
            sa.Column('includes_current_day', sa.Boolean(), nullable=False, server_default='false'),
            
            sa.Column('period_5_resistance', sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column('period_5_support', sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column('period_5_middle', sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column('period_5_range', sa.Numeric(precision=10, scale=2), nullable=True),
            
            sa.Column('period_10_resistance', sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column('period_10_support', sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column('period_10_middle', sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column('period_10_range', sa.Numeric(precision=10, scale=2), nullable=True),
            
            sa.Column('period_20_resistance', sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column('period_20_support', sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column('period_20_middle', sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column('period_20_range', sa.Numeric(precision=10, scale=2), nullable=True),
            
            sa.Column('market_cap', sa.Numeric(), nullable=True),
            sa.Column('pe_ratio', sa.Numeric(), nullable=True),
            sa.Column('dividend_yield', sa.Numeric(), nullable=True),
            sa.Column('roe', sa.Numeric(), nullable=True),
            sa.Column('debt_to_equity', sa.Numeric(), nullable=True),
            sa.Column('eps', sa.Numeric(), nullable=True),
            sa.Column('nav', sa.Numeric(), nullable=True),
            sa.Column('fundamental_score', sa.Numeric(), nullable=True),
            sa.Column('sector', sa.Text(), nullable=True),
            sa.Column('symbol', sa.Text(), nullable=True),
            
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
            
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['company_id'], ['company.id'], ),
            sa.UniqueConstraint('company_id', 'calculation_date', name='uix_company_calculation_date')
        )
        
        op.create_index(op.f('ix_donchian_cache_company_id'), 'donchian_channel_cache', ['company_id'], unique=False)
        op.create_index(op.f('ix_donchian_cache_calculation_date'), 'donchian_channel_cache', ['calculation_date'], unique=False)
        op.create_index(op.f('ix_donchian_cache_sector'), 'donchian_channel_cache', ['sector'], unique=False)
        op.create_index(op.f('ix_donchian_cache_score'), 'donchian_channel_cache', ['fundamental_score'], unique=False)
    else:
        # Alter existing table
        # Make technical columns nullable
        op.alter_column('donchian_channel_cache', 'current_price', nullable=True)
        op.alter_column('donchian_channel_cache', 'data_points', nullable=True)
        op.alter_column('donchian_channel_cache', 'period_5_resistance', nullable=True)
        op.alter_column('donchian_channel_cache', 'period_5_support', nullable=True)
        op.alter_column('donchian_channel_cache', 'period_5_middle', nullable=True)
        op.alter_column('donchian_channel_cache', 'period_5_range', nullable=True)
        op.alter_column('donchian_channel_cache', 'period_10_resistance', nullable=True)
        op.alter_column('donchian_channel_cache', 'period_10_support', nullable=True)
        op.alter_column('donchian_channel_cache', 'period_10_middle', nullable=True)
        op.alter_column('donchian_channel_cache', 'period_10_range', nullable=True)
        op.alter_column('donchian_channel_cache', 'period_20_resistance', nullable=True)
        op.alter_column('donchian_channel_cache', 'period_20_support', nullable=True)
        op.alter_column('donchian_channel_cache', 'period_20_middle', nullable=True)
        op.alter_column('donchian_channel_cache', 'period_20_range', nullable=True)

        # Add new columns
        op.add_column('donchian_channel_cache', sa.Column('market_cap', sa.Numeric(), nullable=True))
        op.add_column('donchian_channel_cache', sa.Column('pe_ratio', sa.Numeric(), nullable=True))
        op.add_column('donchian_channel_cache', sa.Column('dividend_yield', sa.Numeric(), nullable=True))
        op.add_column('donchian_channel_cache', sa.Column('roe', sa.Numeric(), nullable=True))
        op.add_column('donchian_channel_cache', sa.Column('debt_to_equity', sa.Numeric(), nullable=True))
        op.add_column('donchian_channel_cache', sa.Column('eps', sa.Numeric(), nullable=True))
        op.add_column('donchian_channel_cache', sa.Column('nav', sa.Numeric(), nullable=True))
        op.add_column('donchian_channel_cache', sa.Column('fundamental_score', sa.Numeric(), nullable=True))
        op.add_column('donchian_channel_cache', sa.Column('sector', sa.Text(), nullable=True))
        op.add_column('donchian_channel_cache', sa.Column('symbol', sa.Text(), nullable=True))
        
        # Add indexes
        op.create_index(op.f('ix_donchian_cache_sector'), 'donchian_channel_cache', ['sector'], unique=False)
        op.create_index(op.f('ix_donchian_cache_score'), 'donchian_channel_cache', ['fundamental_score'], unique=False)


def downgrade():
    # Revert changes (simplified, assuming we want to drop columns or make nullable false)
    # Note: Making columns NOT NULL again might fail if there are NULL values
    
    op.drop_index(op.f('ix_donchian_cache_score'), table_name='donchian_channel_cache')
    op.drop_index(op.f('ix_donchian_cache_sector'), table_name='donchian_channel_cache')
    
    op.drop_column('donchian_channel_cache', 'symbol')
    op.drop_column('donchian_channel_cache', 'sector')
    op.drop_column('donchian_channel_cache', 'fundamental_score')
    op.drop_column('donchian_channel_cache', 'nav')
    op.drop_column('donchian_channel_cache', 'eps')
    op.drop_column('donchian_channel_cache', 'debt_to_equity')
    op.drop_column('donchian_channel_cache', 'roe')
    op.drop_column('donchian_channel_cache', 'dividend_yield')
    op.drop_column('donchian_channel_cache', 'pe_ratio')
    op.drop_column('donchian_channel_cache', 'market_cap')
    
    # We won't revert the NULLABLE changes as it might cause data loss or errors
