"""add donchian channel cache table

Revision ID: add_donchian_channel_cache
Revises: 2025_12_01_0001
Create Date: 2025-12-03 12:16:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_donchian_channel_cache'
down_revision: Union[str, None] = '2025_12_01_0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create donchian_channel_cache table
    op.create_table(
        'donchian_channel_cache',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('calculation_date', sa.Date(), nullable=False),
        sa.Column('current_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('data_points', sa.Integer(), nullable=False),
        sa.Column('includes_current_day', sa.Boolean(), nullable=False, server_default='false'),
        
        # Period 5
        sa.Column('period_5_resistance', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('period_5_support', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('period_5_middle', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('period_5_range', sa.Numeric(precision=10, scale=2), nullable=False),
        
        # Period 10
        sa.Column('period_10_resistance', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('period_10_support', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('period_10_middle', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('period_10_range', sa.Numeric(precision=10, scale=2), nullable=False),
        
        # Period 20
        sa.Column('period_20_resistance', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('period_20_support', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('period_20_middle', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('period_20_range', sa.Numeric(precision=10, scale=2), nullable=False),
        
        # Metadata
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['company_id'], ['company.id'], ondelete='CASCADE'),
    )
    
    # Create indexes for better query performance
    op.create_index('ix_donchian_cache_company_id', 'donchian_channel_cache', ['company_id'])
    op.create_index('ix_donchian_cache_calculation_date', 'donchian_channel_cache', ['calculation_date'])
    
    # Create unique constraint: one cache entry per company per day
    op.create_unique_constraint('uix_company_calculation_date', 'donchian_channel_cache', ['company_id', 'calculation_date'])


def downgrade() -> None:
    # Drop unique constraint
    op.drop_constraint('uix_company_calculation_date', 'donchian_channel_cache', type_='unique')
    
    # Drop indexes
    op.drop_index('ix_donchian_cache_calculation_date', 'donchian_channel_cache')
    op.drop_index('ix_donchian_cache_company_id', 'donchian_channel_cache')
    
    # Drop table
    op.drop_table('donchian_channel_cache')
