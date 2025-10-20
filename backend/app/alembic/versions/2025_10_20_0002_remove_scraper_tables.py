"""remove_scraper_tables

Revision ID: 2025_10_20_0002
Revises: 2025_10_20_0001
Create Date: 2025-10-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_10_20_0002'
down_revision = '2025_10_20_0001'
branch_labels = None
depends_on = None


def upgrade():
    # Drop scraper_log table if it exists
    op.execute("DROP TABLE IF EXISTS scraper_log CASCADE")


def downgrade():
    # Recreate scraper_log table if needed (optional)
    pass

