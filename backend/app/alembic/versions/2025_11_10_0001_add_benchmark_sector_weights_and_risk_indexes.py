"""add_benchmark_sector_weights_and_risk_indexes

Revision ID: 2025_11_10_0001
Revises: 1f28e073383f
Create Date: 2025-11-10 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '2025_11_10_0001'
down_revision = '1f28e073383f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create benchmark_sector_weights table
    op.create_table(
        'benchmark_sector_weights',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('benchmark_id', sa.String(length=50), nullable=False),
        sa.Column('as_of_date', sa.Date(), nullable=False),
        sa.Column('sector', sa.String(length=100), nullable=False),
        sa.Column('weight', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('benchmark_id', 'as_of_date', 'sector', name='uq_benchmark_sector_date')
    )
    
    # Create indexes
    op.create_index(
        'idx_benchmark_sector_weights_benchmark_date',
        'benchmark_sector_weights',
        ['benchmark_id', 'as_of_date']
    )
    
    # Add index on portfolioriskmetrics for faster queries
    op.create_index(
        'idx_portfolioriskmetrics_portfolio_date',
        'portfolioriskmetrics',
        ['portfolio_id', 'calculation_date']
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_portfolioriskmetrics_portfolio_date', table_name='portfolioriskmetrics')
    op.drop_index('idx_benchmark_sector_weights_benchmark_date', table_name='benchmark_sector_weights')
    
    # Drop table
    op.drop_table('benchmark_sector_weights')

