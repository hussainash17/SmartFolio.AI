"""fix_volume_to_bigint_manual

Revision ID: 5eb82f350768
Revises: 7fbb10dd9eaa
Create Date: 2025-07-23 17:03:34.953488

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '5eb82f350768'
down_revision = '7fbb10dd9eaa'
branch_labels = None
depends_on = None


def upgrade():
    # Fix volume fields to use BIGINT instead of INTEGER
    # This will handle large volume values like 7222985000
    
    # Fix dailyohlc volume field
    op.execute("ALTER TABLE dailyohlc ALTER COLUMN volume TYPE BIGINT USING volume::BIGINT")
    
    # Fix stockdata volume field
    op.execute("ALTER TABLE stockdata ALTER COLUMN volume TYPE BIGINT USING volume::BIGINT")
    
    # Fix intradaytick volume field
    op.execute("ALTER TABLE intradaytick ALTER COLUMN volume TYPE BIGINT USING volume::BIGINT")
    
    # Fix marketsummary total_volume field
    op.execute("ALTER TABLE marketsummary ALTER COLUMN total_volume TYPE BIGINT USING total_volume::BIGINT")


def downgrade():
    # Revert volume fields back to INTEGER (not recommended for production)
    op.execute("ALTER TABLE dailyohlc ALTER COLUMN volume TYPE INTEGER USING volume::INTEGER")
    op.execute("ALTER TABLE stockdata ALTER COLUMN volume TYPE INTEGER USING volume::INTEGER")
    op.execute("ALTER TABLE intradaytick ALTER COLUMN volume TYPE INTEGER USING volume::INTEGER")
    op.execute("ALTER TABLE marketsummary ALTER COLUMN total_volume TYPE INTEGER USING total_volume::INTEGER")
