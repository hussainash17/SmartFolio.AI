"""add_scraper_log_table

Revision ID: 2025_11_06_0002
Revises: 2025_11_06_0001
Create Date: 2025-11-06 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_11_06_0002'
down_revision = '2025_11_06_0001'
branch_labels = None
depends_on = None


def upgrade():
    # Create scraper_log table
    op.create_table(
        'scraper_log',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('scraper_type', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=255), nullable=False),
        sa.Column('companies_processed', sa.Integer(), nullable=True),
        sa.Column('companies_failed', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('host_ip', sa.String(length=255), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Indexes
    op.create_index('idx_scraper_log_scraper_type', 'scraper_log', ['scraper_type'], unique=False)
    op.create_index('idx_scraper_log_status', 'scraper_log', ['status'], unique=False)
    op.create_index('idx_scraper_log_started_at', 'scraper_log', [sa.text('started_at DESC')], unique=False)

    # Comments
    op.execute("COMMENT ON TABLE scraper_log IS 'Stores execution logs for data scraper operations'")
    op.execute("COMMENT ON COLUMN scraper_log.id IS 'Unique identifier for the log entry'")
    op.execute("COMMENT ON COLUMN scraper_log.scraper_type IS 'Type of scraper that was executed'")
    op.execute("COMMENT ON COLUMN scraper_log.status IS 'Current status of the scraper execution (e.g., RUNNING, COMPLETED, FAILED)'")
    op.execute("COMMENT ON COLUMN scraper_log.companies_processed IS 'Number of companies successfully processed'")
    op.execute("COMMENT ON COLUMN scraper_log.companies_failed IS 'Number of companies that failed processing'")
    op.execute("COMMENT ON COLUMN scraper_log.error_message IS 'Error message if scraper failed'")
    op.execute("COMMENT ON COLUMN scraper_log.host_ip IS 'IP address of the host running the scraper'")
    op.execute("COMMENT ON COLUMN scraper_log.started_at IS 'Timestamp when scraper execution started'")
    op.execute("COMMENT ON COLUMN scraper_log.completed_at IS 'Timestamp when scraper execution completed'")
    op.execute("COMMENT ON COLUMN scraper_log.duration_seconds IS 'Duration of scraper execution in seconds'")


def downgrade():
    # Drop indexes first
    op.drop_index('idx_scraper_log_started_at', table_name='scraper_log')
    op.drop_index('idx_scraper_log_status', table_name='scraper_log')
    op.drop_index('idx_scraper_log_scraper_type', table_name='scraper_log')

    # Drop table
    op.drop_table('scraper_log')


