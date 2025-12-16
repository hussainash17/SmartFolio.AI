"""drop open_price not null constraint

Revision ID: 2025_12_12_0001
Revises: 2025_12_11_0001
Create Date: 2025-12-12 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_12_12_0001'
down_revision = '2025_12_11_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop NOT NULL constraint on open_price column in stockdata table
    op.alter_column('stockdata', 'open_price',
                    existing_type=sa.Numeric(precision=10, scale=2),
                    nullable=True)


def downgrade() -> None:
    # Restore NOT NULL constraint on open_price column in stockdata table
    op.alter_column('stockdata', 'open_price',
                    existing_type=sa.Numeric(precision=10, scale=2),
                    nullable=False)

