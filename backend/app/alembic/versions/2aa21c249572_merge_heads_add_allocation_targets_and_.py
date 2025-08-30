"""Merge heads add_allocation_targets and add_goal_contributions

Revision ID: 2aa21c249572
Revises: add_allocation_targets, add_goal_contributions
Create Date: 2025-08-30 11:11:18.470188

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '2aa21c249572'
down_revision = ('add_allocation_targets', 'add_goal_contributions')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
