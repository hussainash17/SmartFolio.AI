"""add_portfolio_performance_tables

Revision ID: 2025_10_20_0001
Revises: 2025_10_14_0001
Create Date: 2025-10-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision = '2025_10_20_0001'
down_revision = '2025_10_14_0001'
branch_labels = None
depends_on = None


def upgrade():
    # Create benchmarks table
    op.create_table(
        'benchmarks',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('ticker', sa.String(20)),
        sa.Column('description', sa.Text()),
        sa.Column('asset_class', sa.String(50)),
        sa.Column('region', sa.String(50)),
        sa.Column('data_source', sa.String(50)),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )
    
    # Insert default benchmarks - Dhaka Stock Exchange indices
    op.execute("""
        INSERT INTO benchmarks (id, name, ticker, asset_class, region, data_source) VALUES
        ('dsex', 'DSEX - Dhaka Stock Exchange Broad Index', 'DSEX', 'equity', 'Bangladesh', 'dse'),
        ('ds30', 'DS30 - Dhaka Stock Exchange 30 Index', 'DS30', 'equity', 'Bangladesh', 'dse'),
        ('dses', 'DSES - Dhaka Stock Exchange Shariah Index', 'DSES', 'equity', 'Bangladesh', 'dse')
    """)
    
    # Create benchmark_data table
    op.create_table(
        'benchmark_data',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('benchmark_id', sa.String(50), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('close_value', sa.Numeric(15, 4), nullable=False),
        sa.Column('return_1d', sa.Numeric(10, 6)),
        sa.Column('return_cumulative', sa.Numeric(10, 6)),
        sa.Column('volume', sa.BigInteger()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('benchmark_id', 'date', name='uq_benchmark_date')
    )
    op.create_index('idx_benchmark_data_date', 'benchmark_data', ['benchmark_id', 'date'])
    
    # Create portfolio_daily_valuations table
    op.create_table(
        'portfolio_daily_valuations',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('portfolio_id', UUID(as_uuid=True), sa.ForeignKey('portfolio.id', ondelete='CASCADE'), nullable=False),
        sa.Column('valuation_date', sa.Date(), nullable=False),
        sa.Column('total_value', sa.Numeric(15, 2), nullable=False),
        sa.Column('cash_value', sa.Numeric(15, 2)),
        sa.Column('securities_value', sa.Numeric(15, 2)),
        sa.Column('daily_return', sa.Numeric(10, 6)),
        sa.Column('cumulative_return', sa.Numeric(10, 6)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('portfolio_id', 'valuation_date', name='uq_portfolio_date')
    )
    op.create_index('idx_portfolio_valuations_date', 'portfolio_daily_valuations', 
                    ['portfolio_id', sa.text('valuation_date DESC')])
    
    # Create portfolio_performance_cache table
    op.create_table(
        'portfolio_performance_cache',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('portfolio_id', UUID(as_uuid=True), sa.ForeignKey('portfolio.id', ondelete='CASCADE'), nullable=False),
        sa.Column('period', sa.String(10), nullable=False),
        sa.Column('benchmark_id', sa.String(50)),
        sa.Column('calculation_date', sa.Date(), nullable=False),
        sa.Column('metrics', JSONB, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('portfolio_id', 'period', 'benchmark_id', 'calculation_date', 
                          name='uq_perf_cache')
    )
    op.create_index('idx_performance_cache_lookup', 'portfolio_performance_cache',
                    ['portfolio_id', 'period', 'benchmark_id', sa.text('calculation_date DESC')])
    
    # Create portfolio_reports table
    op.create_table(
        'portfolio_reports',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('portfolio_id', UUID(as_uuid=True), sa.ForeignKey('portfolio.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('user.id', ondelete='CASCADE'), nullable=False),
        sa.Column('report_type', sa.String(50), nullable=False),
        sa.Column('period', sa.String(50)),
        sa.Column('start_date', sa.Date()),
        sa.Column('end_date', sa.Date()),
        sa.Column('format', sa.String(10), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('file_path', sa.Text()),
        sa.Column('file_size_bytes', sa.Integer()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('expires_at', sa.DateTime(timezone=True)),
        sa.Column('error_message', sa.Text())
    )
    op.create_index('idx_portfolio_reports_user', 'portfolio_reports', 
                    ['user_id', sa.text('created_at DESC')])
    
    # Create portfolio_scheduled_reports table
    op.create_table(
        'portfolio_scheduled_reports',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('portfolio_id', UUID(as_uuid=True), sa.ForeignKey('portfolio.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('user.id', ondelete='CASCADE'), nullable=False),
        sa.Column('report_type', sa.String(50), nullable=False),
        sa.Column('frequency', sa.String(20), nullable=False),
        sa.Column('day_of_month', sa.Integer()),
        sa.Column('day_of_week', sa.Integer()),
        sa.Column('format', sa.String(10), nullable=False, server_default='pdf'),
        sa.Column('email_recipients', sa.ARRAY(sa.Text()), nullable=False),
        sa.Column('include_sections', sa.ARRAY(sa.Text())),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('last_run_at', sa.DateTime(timezone=True)),
        sa.Column('next_run_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )
    op.create_index('idx_scheduled_reports_next_run', 'portfolio_scheduled_reports', 
                    ['next_run_at'], 
                    postgresql_where=sa.text('is_active = true'))


def downgrade():
    op.drop_table('portfolio_scheduled_reports')
    op.drop_table('portfolio_reports')
    op.drop_table('portfolio_performance_cache')
    op.drop_table('portfolio_daily_valuations')
    op.drop_table('benchmark_data')
    op.drop_table('benchmarks')

