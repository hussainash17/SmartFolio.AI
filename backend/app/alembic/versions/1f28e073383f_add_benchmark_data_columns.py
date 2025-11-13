"""add_benchmark_data_columns

Revision ID: 1f28e073383f
Revises: 2025_11_08_0001
Create Date: 2025-11-10 14:13:32.390314

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '1f28e073383f'
down_revision = '2025_11_08_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to benchmark_data table
    op.add_column('benchmark_data', sa.Column('open_value', sa.Numeric(), nullable=True))
    op.add_column('benchmark_data', sa.Column('high_value', sa.Numeric(), nullable=True))
    op.add_column('benchmark_data', sa.Column('low_value', sa.Numeric(), nullable=True))
    op.add_column('benchmark_data', sa.Column('trades', sa.BigInteger(), nullable=True))
    op.add_column('benchmark_data', sa.Column('total_value', sa.Numeric(), nullable=True))
    op.add_column('benchmark_data', sa.Column('daily_return', sa.Numeric(), nullable=True))
    op.add_column('benchmark_data', sa.Column('cumulative_return', sa.Numeric(), nullable=True))


def downgrade() -> None:
    # Remove columns in reverse order
    op.drop_column('benchmark_data', 'cumulative_return')
    op.drop_column('benchmark_data', 'daily_return')
    op.drop_column('benchmark_data', 'total_value')
    op.drop_column('benchmark_data', 'trades')
    op.drop_column('benchmark_data', 'low_value')
    op.drop_column('benchmark_data', 'high_value')
    op.drop_column('benchmark_data', 'open_value')
