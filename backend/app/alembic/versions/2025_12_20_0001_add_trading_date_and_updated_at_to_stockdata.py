"""add trading_date and updated_at to stockdata

Revision ID: 2025_12_20_0001
Revises: f0ad8948de89
Create Date: 2025-12-20 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_12_20_0001'
down_revision = 'f0ad8948de89'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add trading_date column (DATE type, nullable)
    op.add_column('stockdata',
                  sa.Column('trading_date', sa.Date(), nullable=True))
    
    # Add updated_at column (TIMESTAMP type, nullable)
    op.add_column('stockdata',
                  sa.Column('updated_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Remove updated_at column
    op.drop_column('stockdata', 'updated_at')
    
    # Remove trading_date column
    op.drop_column('stockdata', 'trading_date')

