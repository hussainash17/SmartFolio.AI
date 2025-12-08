"""remove market information add upcoming events

Revision ID: 2025_12_05_0001
Revises: 2025_12_04_0001
Create Date: 2025-12-05 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '2025_12_05_0001'
down_revision = '2025_12_04_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop marketinformation table if it exists
    op.execute("DROP TABLE IF EXISTS marketinformation CASCADE")
    
    # Drop the index if it exists
    op.execute("DROP INDEX IF EXISTS ix_marketinformation_company_id")
    
    # Create upcoming_events table
    op.create_table('upcoming_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('post_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('timestamp', sa.BigInteger(), nullable=False),
        sa.Column('date', sa.String(length=50), nullable=False),
        sa.Column('time', sa.String(length=20), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for efficient querying
    op.create_index(op.f('ix_upcoming_events_code'), 'upcoming_events', ['code'], unique=False)
    op.create_index(op.f('ix_upcoming_events_timestamp'), 'upcoming_events', ['timestamp'], unique=False)
    op.create_index(op.f('ix_upcoming_events_type'), 'upcoming_events', ['type'], unique=False)
    op.create_index(op.f('ix_upcoming_events_post_date'), 'upcoming_events', ['post_date'], unique=False)


def downgrade() -> None:
    # Drop upcoming_events table and indexes
    op.drop_index(op.f('ix_upcoming_events_post_date'), table_name='upcoming_events')
    op.drop_index(op.f('ix_upcoming_events_type'), table_name='upcoming_events')
    op.drop_index(op.f('ix_upcoming_events_timestamp'), table_name='upcoming_events')
    op.drop_index(op.f('ix_upcoming_events_code'), table_name='upcoming_events')
    op.drop_table('upcoming_events')
    
    # Recreate marketinformation table (simplified version - you may need to adjust based on your needs)
    op.create_table('marketinformation',
        sa.Column('market_info_id', sa.Integer(), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('last_trading_price', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('closing_price', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('opening_price', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('adjusted_opening_price', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('days_range', sa.String(length=50), nullable=True),
        sa.Column('change', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('days_value', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('days_volume', sa.Integer(), nullable=True),
        sa.Column('days_trade', sa.Integer(), nullable=True),
        sa.Column('market_capitalization', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('yesterday_closing_price', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['company.id'], ),
        sa.PrimaryKeyConstraint('market_info_id')
    )
    op.create_index(op.f('ix_marketinformation_company_id'), 'marketinformation', ['company_id'], unique=False)
