"""add_close_sd_table

Revision ID: a5f6300d3323
Revises: 2025_12_12_0001
Create Date: 2025-12-15 15:35:21.686360

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'a5f6300d3323'
down_revision = '2025_12_12_0001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "stockdata",
        sa.Column("closed_price", sa.Float, nullable=False, server_default="0.0")
    )


def downgrade():
    op.drop_column("stockdata", "closed_price")
