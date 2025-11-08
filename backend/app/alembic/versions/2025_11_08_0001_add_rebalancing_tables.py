"""add rebalancing tables

Revision ID: 2025_11_08_0001
Revises: 2025_11_06_0002
Create Date: 2025-11-08 00:01:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2025_11_08_0001'
down_revision = '3d8b4ce437f4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create rebalancing_settings table
    op.create_table(
        'rebalancing_settings',
        sa.Column('id', sa.UUID(), primary_key=True, nullable=False),
        sa.Column('user_id', sa.UUID(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('portfolio_id', sa.UUID(), sa.ForeignKey('portfolio.id'), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('threshold_pct', sa.Numeric(precision=5, scale=2), nullable=False, server_default='5.0'),
        sa.Column('frequency', sa.String(length=20), nullable=False, server_default='quarterly'),
        sa.Column('min_trade_value', sa.Numeric(precision=12, scale=2), nullable=False, server_default='100.0'),
        sa.Column('last_rebalance_at', sa.DateTime(), nullable=True),
        sa.Column('next_rebalance_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    
    # Create unique index for user_id + portfolio_id
    op.create_index('ix_rebalancing_settings_user_id', 'rebalancing_settings', ['user_id'])
    op.create_index('ix_rebalancing_settings_portfolio_id', 'rebalancing_settings', ['portfolio_id'])
    op.create_unique_constraint(
        'uq_rebalancing_settings_user_portfolio',
        'rebalancing_settings',
        ['user_id', 'portfolio_id']
    )
    
    # Create rebalancing_run table
    op.create_table(
        'rebalancing_run',
        sa.Column('id', sa.UUID(), primary_key=True, nullable=False),
        sa.Column('user_id', sa.UUID(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('portfolio_id', sa.UUID(), sa.ForeignKey('portfolio.id'), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('drift_before', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('drift_after', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('trades_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('buy_value', sa.Numeric(precision=14, scale=2), nullable=False, server_default='0'),
        sa.Column('sell_value', sa.Numeric(precision=14, scale=2), nullable=False, server_default='0'),
        sa.Column('transaction_cost', sa.Numeric(precision=14, scale=2), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('executed_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    
    # Create indexes for rebalancing_run
    op.create_index('ix_rebalancing_run_user_id', 'rebalancing_run', ['user_id'])
    op.create_index('ix_rebalancing_run_portfolio_id', 'rebalancing_run', ['portfolio_id'])
    op.create_index('ix_rebalancing_run_executed_at', 'rebalancing_run', ['executed_at'])
    op.create_index('ix_rebalancing_run_portfolio_executed', 'rebalancing_run', ['portfolio_id', 'executed_at'])
    
    # Create rebalancing_trade table
    op.create_table(
        'rebalancing_trade',
        sa.Column('id', sa.UUID(), primary_key=True, nullable=False),
        sa.Column('run_id', sa.UUID(), sa.ForeignKey('rebalancing_run.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stock_id', sa.UUID(), sa.ForeignKey('company.id'), nullable=False),
        sa.Column('symbol', sa.String(length=20), nullable=False),
        sa.Column('action', sa.String(length=4), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('price', sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column('value', sa.Numeric(precision=14, scale=2), nullable=False),
    )
    
    # Create index for rebalancing_trade
    op.create_index('ix_rebalancing_trade_run_id', 'rebalancing_trade', ['run_id'])


def downgrade() -> None:
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_index('ix_rebalancing_trade_run_id', 'rebalancing_trade')
    op.drop_table('rebalancing_trade')
    
    op.drop_index('ix_rebalancing_run_portfolio_executed', 'rebalancing_run')
    op.drop_index('ix_rebalancing_run_executed_at', 'rebalancing_run')
    op.drop_index('ix_rebalancing_run_portfolio_id', 'rebalancing_run')
    op.drop_index('ix_rebalancing_run_user_id', 'rebalancing_run')
    op.drop_table('rebalancing_run')
    
    op.drop_constraint('uq_rebalancing_settings_user_portfolio', 'rebalancing_settings', type_='unique')
    op.drop_index('ix_rebalancing_settings_portfolio_id', 'rebalancing_settings')
    op.drop_index('ix_rebalancing_settings_user_id', 'rebalancing_settings')
    op.drop_table('rebalancing_settings')

