"""Add GoalLinkedAsset table

Revision ID: f0ad8948de89
Revises: 1dfe48305639
Create Date: 2025-12-20 21:53:08.821599

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f0ad8948de89'
down_revision = '1dfe48305639'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('goallinkedasset',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('goal_id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('symbol', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('company_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('allocation_type', sa.Enum('QUANTITY', 'PERCENTAGE', name='allocationtype'), nullable=False),
    sa.Column('allocation_value', sa.Float(), nullable=False),
    sa.Column('linked_quantity', sa.Float(), nullable=False),
    sa.Column('current_value', sa.Float(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['goal_id'], ['userinvestmentgoal.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_goallinkedasset_goal_id'), 'goallinkedasset', ['goal_id'], unique=False)
    op.create_index(op.f('ix_goallinkedasset_symbol'), 'goallinkedasset', ['symbol'], unique=False)
    op.create_index(op.f('ix_goallinkedasset_user_id'), 'goallinkedasset', ['user_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_goallinkedasset_user_id'), table_name='goallinkedasset')
    op.drop_index(op.f('ix_goallinkedasset_symbol'), table_name='goallinkedasset')
    op.drop_index(op.f('ix_goallinkedasset_goal_id'), table_name='goallinkedasset')
    op.drop_table('goallinkedasset')
    # Drop the enum type manually if needed, usually Alembic doesn't auto-generate drop for enums created inline
    op.execute("DROP TYPE IF EXISTS allocationtype")
