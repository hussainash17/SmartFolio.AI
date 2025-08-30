"""seed initial data via app.initial_data

Revision ID: seed_initial_data_20250830
Revises: 2aa21c249572
Create Date: 2025-08-30 12:05:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'seed_initial_data_20250830'
down_revision = '2aa21c249572'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Seed initial data by invoking the application seeding routines.
    try:
        import asyncio
        from app.initial_data import add_sample_stock_data, add_sample_portfolios

        # Run seeding coroutines sequentially
        asyncio.run(add_sample_stock_data())
        asyncio.run(add_sample_portfolios())
    except Exception as exc:
        # Re-raise to fail migration if seeding fails
        raise


def downgrade() -> None:
    # No automatic data rollback.
    pass


