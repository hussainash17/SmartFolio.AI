"""Migrate schema.sql tables and update user table

Revision ID: auto_migrate_schema_sql
Revises: 1a31ce608336
Create Date: 2024-08-01 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'auto_migrate_schema_sql'
down_revision = '1a31ce608336'
branch_labels = None
depends_on = None


def upgrade():
    # Drop item table first (it has foreign key to user)
    op.drop_table('item')

    # Drop old user table
    op.drop_table('user')

    # Create app_user table with UUID
    op.create_table(
        'app_user',
        sa.Column('user_id', sa.UUID(), primary_key=True),
        sa.Column('username', sa.String(50), unique=True, nullable=False),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('password', sa.String(255), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    # Recreate item table with reference to app_user (using UUID)
    op.create_table(
        'item',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.String(255)),
        sa.Column('owner_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['app_user.user_id'], ondelete='CASCADE'),
    )

    # Create company table
    op.create_table(
        'company',
        sa.Column('company_id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('trading_code', sa.String(50), nullable=False, unique=True),
        sa.Column('scrip_code', sa.Integer),
        sa.Column('type_of_instrument', sa.String(50)),
        sa.Column('market_category', sa.String(1)),
        sa.Column('electronic_share', sa.String(1)),
        sa.Column('authorized_capital', sa.Numeric(18, 2)),
        sa.Column('paid_up_capital', sa.Numeric(18, 2)),
        sa.Column('face_value', sa.Numeric(18, 2)),
        sa.Column('market_lot', sa.Integer),
        sa.Column('total_outstanding_securities', sa.BigInteger),
        sa.Column('sector', sa.String(255)),
        sa.Column('debut_trading_date', sa.Date),
        sa.Column('listing_year', sa.Integer),
        sa.Column('address', sa.String(2500)),
        sa.Column('factory_address', sa.String(255)),
        sa.Column('phone', sa.String(255)),
        sa.Column('fax', sa.String(255)),
        sa.Column('email', sa.String(255)),
        sa.Column('website', sa.String(255)),
        sa.Column('company_secretary_name', sa.String(255)),
        sa.Column('company_secretary_email', sa.String(255)),
        sa.Column('company_secretary_cell_no', sa.String(255)),
        sa.Column('reserve_and_surplus', sa.Numeric(18, 2)),
        sa.Column('year_end', sa.String(25)),
        sa.Column('last_agm_date', sa.Date),
        sa.Column('fifty_two_weeks_moving_range', sa.String(100)),
    )

    # Create candlestick table
    op.create_table(
        'candlestick',
        sa.Column('symbol', sa.String(15), nullable=False),
        sa.Column('timestamp', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('open', sa.Float),
        sa.Column('high', sa.Float),
        sa.Column('low', sa.Float),
        sa.Column('close', sa.Float),
        sa.Column('volume', sa.BigInteger),
        sa.Column('trades', sa.BigInteger),
        sa.Column('value', sa.Float, server_default='0'),
        sa.PrimaryKeyConstraint('symbol', 'timestamp'),
    )
    op.create_index('idx_candlestick_symbol_timestamp', 'candlestick', ['symbol', 'timestamp'], unique=False,
                    postgresql_using='btree')

    # Create dividend_information table
    op.create_table(
        'dividend_information',
        sa.Column('dividend_id', sa.Integer, primary_key=True),
        sa.Column('company_id', sa.Integer, sa.ForeignKey('company.company_id')),
        sa.Column('year', sa.Integer),
        sa.Column('cash_dividend', sa.Numeric(18, 2)),
        sa.Column('stock_dividend', sa.String(50)),
        sa.Column('right_issue', sa.String(250)),
        sa.Column('nav', sa.Numeric(18, 2)),
    )

    # Create financial_performance table
    op.create_table(
        'financial_performance',
        sa.Column('performance_id', sa.Integer, primary_key=True),
        sa.Column('company_id', sa.Integer, sa.ForeignKey('company.company_id')),
        sa.Column('year', sa.Integer),
        sa.Column('eps_basic', sa.Numeric(18, 2)),
        sa.Column('eps_diluted', sa.Numeric(18, 2)),
        sa.Column('nav_per_share', sa.Numeric(18, 2)),
        sa.Column('profit', sa.Numeric(18, 2)),
        sa.Column('total_comprehensive_income', sa.Numeric(18, 2)),
        sa.Column('earnings_per_share_continuing_operations', sa.Numeric(18, 2)),
        sa.Column('pe_ratio', sa.Numeric(18, 2)),
    )

    # Create quarterly_performance table
    op.create_table(
        'quarterly_performance',
        sa.Column('quarterly_id', sa.Integer, primary_key=True),
        sa.Column('company_id', sa.Integer, sa.ForeignKey('company.company_id')),
        sa.Column('quarter', sa.String(20)),
        sa.Column('eps_basic', sa.Numeric(18, 2)),
        sa.Column('eps_diluted', sa.Numeric(18, 2)),
        sa.Column('market_price_end_period', sa.Numeric(18, 2)),
        sa.Column('date', sa.Date),
    )

    # Create share_holding table
    op.create_table(
        'share_holding',
        sa.Column('holding_id', sa.Integer, primary_key=True),
        sa.Column('company_id', sa.Integer, sa.ForeignKey('company.company_id')),
        sa.Column('date', sa.Date),
        sa.Column('sponsor_director', sa.Numeric(5, 2)),
        sa.Column('government', sa.Numeric(5, 2)),
        sa.Column('institute', sa.Numeric(5, 2)),
        sa.Column('foreign_holder', sa.Numeric(5, 2)),
        sa.Column('public_holder', sa.Numeric(5, 2)),
    )

    # Create loan_status table
    op.create_table(
        'loan_status',
        sa.Column('loan_id', sa.Integer, primary_key=True),
        sa.Column('company_id', sa.Integer, sa.ForeignKey('company.company_id')),
        sa.Column('date', sa.Date),
        sa.Column('short_term_loan', sa.Numeric(18, 2)),
        sa.Column('long_term_loan', sa.Numeric(18, 2)),
    )

    # Create market_information table
    op.create_table(
        'market_information',
        sa.Column('market_info_id', sa.Integer, primary_key=True),
        sa.Column('company_id', sa.Integer, sa.ForeignKey('company.company_id')),
        sa.Column('date', sa.Date),
        sa.Column('last_trading_price', sa.Numeric(18, 2)),
        sa.Column('closing_price', sa.Numeric(18, 2)),
        sa.Column('opening_price', sa.Numeric(18, 2)),
        sa.Column('adjusted_opening_price', sa.Numeric(18, 2)),
        sa.Column('days_range', sa.String(50)),
        sa.Column('change', sa.Numeric(18, 2)),
        sa.Column('days_value', sa.Numeric(18, 2)),
        sa.Column('days_volume', sa.Integer),
        sa.Column('days_trade', sa.Integer),
        sa.Column('market_capitalization', sa.Numeric(18, 2)),
        sa.Column('yesterday_closing_price', sa.Numeric(18, 2)),
    )

    # Create trade table
    op.create_table(
        'trade',
        sa.Column('trade_id', sa.Integer, primary_key=True),
        sa.Column('symbol', sa.String(15), nullable=False),
        sa.Column('timestamp', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('match_number', sa.Text, nullable=False),
        sa.Column('executed_qty', sa.BigInteger),
        sa.Column('printable', sa.String(1)),
        sa.Column('execution_price', sa.Float),
    )
    op.create_index('idx_trade_symbol_timestamp', 'trade', ['symbol', 'timestamp'], unique=False,
                    postgresql_using='btree')
    op.create_unique_constraint('unique_trade_match_number', 'trade', ['match_number', 'timestamp'])

    # Create time_and_sales table
    op.create_table(
        'time_and_sales',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('symbol', sa.String(15)),
        sa.Column('side', sa.String(10)),
        sa.Column('time', sa.TIMESTAMP(), nullable=False),
        sa.Column('quantity', sa.BigInteger),
        sa.Column('price', sa.Float),
        sa.Column('order_number', sa.String(50)),
        sa.Column('match_number', sa.Text),
    )

    # Create order_events table
    op.create_table(
        'order_events',
        sa.Column('event_id', sa.Integer, primary_key=True),
        sa.Column('time_for_aggregation', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'),
                  nullable=False),
        sa.Column('symbol', sa.String(15)),
        sa.Column('price', sa.Float),
        sa.Column('quantity', sa.BigInteger),
        sa.Column('order_number', sa.BigInteger, nullable=False),
        sa.Column('order_side', sa.String(10)),
        sa.Column('new_order_number', sa.BigInteger),
        sa.Column('deleted', sa.Boolean, server_default=sa.text('FALSE')),
    )
    op.create_index('idx_order_events_time', 'order_events', ['time_for_aggregation'], unique=False,
                    postgresql_using='btree')
    op.create_index('idx_order_events_order_number', 'order_events', ['order_number'], unique=False,
                    postgresql_using='btree')

    # Create news table
    op.create_table(
        'news',
        sa.Column('news_id', sa.BigInteger, primary_key=True),
        sa.Column('company_id', sa.Integer, sa.ForeignKey('company.company_id')),
        sa.Column('title', sa.String(255)),
        sa.Column('reference', sa.String(250)),
        sa.Column('news_text', sa.String(550)),
        sa.Column('timestamp', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('closing_price', sa.Float),
        sa.Column('change_pct', sa.Float),
        sa.Column('sentiment', sa.String(20)),
    )

    # Create watchlist table
    op.create_table(
        'watchlist',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('client_id', sa.String(10)),
        sa.Column('title', sa.String(30)),
        sa.Column('description', sa.String(256)),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_on', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_table(
        'watchlist_stocks',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('watchlist_id', sa.Integer, sa.ForeignKey('watchlist.id', ondelete='CASCADE')),
        sa.Column('symbol', sa.String(15)),
    )

    # Create outbox_events table
    op.create_table(
        'outbox_events',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('event_type', sa.Text, nullable=False),
        sa.Column('symbol', sa.String(15), nullable=False),
        sa.Column('published', sa.Boolean, server_default=sa.text('FALSE'), nullable=False),
        sa.Column('event_time', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )

    # Create market_status table
    op.create_table(
        'market_status',
        sa.Column('last_updated', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('current_event_code', sa.String(255)),
        sa.Column('group_name', sa.String(20), primary_key=True),
    )

    # Create technical_indicators table
    op.create_table(
        'technical_indicators',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('symbol', sa.String(15), nullable=False),
        sa.Column('timestamp', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('sma_20', sa.Float),
        sa.Column('sma_50', sa.Float),
        sa.Column('rsi_14', sa.Float),
        sa.Column('macd', sa.Float),
        sa.Column('bollinger_upper', sa.Float),
        sa.Column('bollinger_lower', sa.Float),
        sa.UniqueConstraint('symbol', 'timestamp'),
    )

    # Create backtest_results table
    op.create_table(
        'backtest_results',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('strategy_name', sa.String(100)),
        sa.Column('symbol', sa.String(15)),
        sa.Column('start_date', sa.Date),
        sa.Column('end_date', sa.Date),
        sa.Column('sharpe_ratio', sa.Float),
        sa.Column('max_drawdown', sa.Float),
        sa.Column('cagr', sa.Float),
        sa.Column('total_return', sa.Float),
        sa.Column('details', sa.JSON),
    )


def downgrade():
    op.drop_table('backtest_results')
    op.drop_table('technical_indicators')
    op.drop_table('market_status')
    op.drop_table('outbox_events')
    op.drop_table('watchlist_stocks')
    op.drop_table('watchlist')
    op.drop_table('news')
    op.drop_index('idx_order_events_order_number', table_name='order_events')
    op.drop_index('idx_order_events_time', table_name='order_events')
    op.drop_table('order_events')
    op.drop_table('time_and_sales')
    op.drop_index('unique_trade_match_number', table_name='trade')
    op.drop_index('idx_trade_symbol_timestamp', table_name='trade')
    op.drop_table('trade')
    op.drop_table('market_information')
    op.drop_table('loan_status')
    op.drop_table('share_holding')
    op.drop_table('quarterly_performance')
    op.drop_table('financial_performance')
    op.drop_table('dividend_information')
    op.drop_index('idx_candlestick_symbol_timestamp', table_name='candlestick')
    op.drop_table('candlestick')
    op.drop_table('company')
    op.drop_table('app_user')
    # Note: The old 'user' and 'item' tables are not restored in downgrade.
