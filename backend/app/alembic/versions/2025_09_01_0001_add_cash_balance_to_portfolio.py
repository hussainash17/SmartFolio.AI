"""add cash balance to portfolio

Revision ID: add_cash_balance_to_portfolio
Revises: ea5530c74046
Create Date: 2025-09-01 00:01:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_cash_balance_to_portfolio'
down_revision = '2024_08_14_1200'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('portfolio', sa.Column('cash_balance', sa.Numeric(precision=15, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column('portfolio', 'cash_balance')