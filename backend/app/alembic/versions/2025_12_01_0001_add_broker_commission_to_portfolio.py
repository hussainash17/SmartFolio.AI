"""add broker commission to portfolio

Revision ID: 2025_12_01_0001
Revises: add_realized_pnl_to_portfolio
Create Date: 2025-12-01 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_12_01_0001'
down_revision = 'add_realized_pnl_to_portfolio'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add broker_commission column to portfolio table
    # DECIMAL(5,2) allows values from 0.00 to 999.99 (percentage)
    # Default is 0.5 (0.5%)
    op.add_column(
        'portfolio',
        sa.Column(
            'broker_commission',
            sa.Numeric(precision=5, scale=2),
            nullable=False,
            server_default='0.50'
        )
    )


def downgrade() -> None:
    op.drop_column('portfolio', 'broker_commission')

