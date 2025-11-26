"""add realized pnl to portfolio

Revision ID: add_realized_pnl_to_portfolio
Revises: add_cash_balance_to_portfolio
Create Date: 2025-11-25 13:30:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_realized_pnl_to_portfolio'
down_revision = 'c494ebc3baf4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('portfolio', sa.Column('realized_pnl', sa.Numeric(precision=15, scale=2), nullable=True, server_default='0'))


def downgrade() -> None:
    op.drop_column('portfolio', 'realized_pnl')
