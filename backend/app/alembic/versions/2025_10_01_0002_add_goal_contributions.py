"""add goal contributions table

Revision ID: add_goal_contributions
Revises: add_funds_transactions
Create Date: 2025-10-01 00:02:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_goal_contributions'
down_revision = 'add_funds_transactions'
branch_labels = None
depends_on = None


def upgrade() -> None:
	# Create userinvestmentgoalcontribution table
	op.create_table(
		'userinvestmentgoalcontribution',
		sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
		sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('user.id'), nullable=False),
		sa.Column('goal_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('userinvestmentgoal.id'), nullable=False),
		sa.Column('amount', sa.Integer(), nullable=False),
		sa.Column('contributed_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
		sa.Column('notes', sa.String(length=500), nullable=True),
		sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
	)
	# Index for querying contributions by goal
	op.create_index('ix_goal_contrib_goal_id', 'userinvestmentgoalcontribution', ['goal_id'])


def downgrade() -> None:
	op.drop_index('ix_goal_contrib_goal_id', table_name='userinvestmentgoalcontribution')
	op.drop_table('userinvestmentgoalcontribution')