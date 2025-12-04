"""add fundamental score breakdown

Revision ID: 2025_12_04_0001
Revises: 2025_12_03_0001
Create Date: 2025-12-04 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_12_04_0001'
down_revision = '2025_12_03_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add score breakdown columns to donchian_channel_cache table
    op.add_column('donchian_channel_cache', sa.Column('base_score', sa.Numeric(), nullable=True))
    op.add_column('donchian_channel_cache', sa.Column('pe_score_contribution', sa.Numeric(), nullable=True))
    op.add_column('donchian_channel_cache', sa.Column('dividend_yield_score_contribution', sa.Numeric(), nullable=True))
    op.add_column('donchian_channel_cache', sa.Column('debt_to_equity_score_contribution', sa.Numeric(), nullable=True))
    op.add_column('donchian_channel_cache', sa.Column('roe_score_contribution', sa.Numeric(), nullable=True))


def downgrade() -> None:
    # Remove score breakdown columns
    op.drop_column('donchian_channel_cache', 'roe_score_contribution')
    op.drop_column('donchian_channel_cache', 'debt_to_equity_score_contribution')
    op.drop_column('donchian_channel_cache', 'dividend_yield_score_contribution')
    op.drop_column('donchian_channel_cache', 'pe_score_contribution')
    op.drop_column('donchian_channel_cache', 'base_score')

