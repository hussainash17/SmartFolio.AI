"""add funds transactions and credit limit

Revision ID: add_funds_transactions
Revises: add_cash_balance_to_portfolio
Create Date: 2025-09-20 00:01:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_funds_transactions'
down_revision = 'add_cash_balance_to_portfolio'
branch_labels = None
depends_on = None


def upgrade() -> None:
	# Add credit_limit to user table
	op.add_column('user', sa.Column('credit_limit', sa.Float(), nullable=True, server_default='0'))
	# Create accounttransaction table
	op.create_table(
		'accounttransaction',
		sa.Column('id', sa.UUID(), primary_key=True, nullable=False),
		sa.Column('user_id', sa.UUID(), sa.ForeignKey('user.id'), nullable=False),
		sa.Column('portfolio_id', sa.UUID(), sa.ForeignKey('portfolio.id'), nullable=True),
		sa.Column('order_id', sa.UUID(), sa.ForeignKey('order.id'), nullable=True),
		sa.Column('trade_id', sa.UUID(), sa.ForeignKey('trade.id'), nullable=True),
		sa.Column('type', sa.String(length=30), nullable=False),
		sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
		sa.Column('currency', sa.String(length=10), nullable=False, server_default='USD'),
		sa.Column('description', sa.String(length=500), nullable=True),
		sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
	)


def downgrade() -> None:
	op.drop_table('accounttransaction')
	op.drop_column('user', 'credit_limit')