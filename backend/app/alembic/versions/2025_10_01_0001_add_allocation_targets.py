"""add allocation targets table

Revision ID: add_allocation_targets
Revises: add_funds_transactions
Create Date: 2025-10-01 00:01:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_allocation_targets'
down_revision = 'add_funds_transactions'
branch_labels = None
depends_on = None


def upgrade() -> None:
	op.create_table(
		'allocationtarget',
		sa.Column('id', sa.UUID(), primary_key=True, nullable=False),
		sa.Column('user_id', sa.UUID(), sa.ForeignKey('user.id'), nullable=False),
		sa.Column('portfolio_id', sa.UUID(), sa.ForeignKey('portfolio.id'), nullable=False),
		sa.Column('category', sa.String(length=100), nullable=False),
		sa.Column('category_type', sa.String(length=30), nullable=False, server_default='SECTOR'),
		sa.Column('target_percent', sa.Numeric(precision=5, scale=2), nullable=False),
		sa.Column('min_percent', sa.Numeric(precision=5, scale=2), nullable=True),
		sa.Column('max_percent', sa.Numeric(precision=5, scale=2), nullable=True),
		sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
		sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
	)
	op.create_unique_constraint(
		'uq_allocationtarget_user_portfolio_category_type',
		'allocationtarget',
		['user_id', 'portfolio_id', 'category', 'category_type']
	)


def downgrade() -> None:
	op.drop_constraint('uq_allocationtarget_user_portfolio_category_type', 'allocationtarget', type_='unique')
	op.drop_table('allocationtarget')