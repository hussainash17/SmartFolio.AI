"""empty message

Revision ID: c494ebc3baf4
Revises: 2025_11_10_0001
Create Date: 2025-11-15 20:05:55.394492

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'c494ebc3baf4'
down_revision = '2025_11_10_0001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        "idx_daily_ohlc_company_date",
        "dailyohlc",
        ["company_id", "date"]
    )

    op.create_index(
        "idx_daily_ohlc_date",
        "dailyohlc",
        ["date"]
    )

    op.create_index(
        "idx_portfolio_daily_valuation_portfolio_date",
        "portfolio_daily_valuations",
        ["portfolio_id", "valuation_date"]
    )

    op.create_index(
        "idx_trade_portfolio_date",
        "trade",
        ["portfolio_id", "trade_date"]
    )

    op.create_index(
        "idx_portfolio_position_portfolio",
        "portfolioposition",
        ["portfolio_id"]
    )


def downgrade():
    op.drop_index("idx_daily_ohlc_company_date", table_name="dailyohlc")
    op.drop_index("idx_daily_ohlc_date", table_name="dailyohlc")
    op.drop_index("idx_portfolio_daily_valuation_portfolio_date", table_name="portfolio_daily_valuations")
    op.drop_index("idx_trade_portfolio_date", table_name="trade")
    op.drop_index("idx_portfolio_position_portfolio", table_name="portfolioposition")
