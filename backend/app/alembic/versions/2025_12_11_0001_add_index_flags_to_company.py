"""add index flags to company

Revision ID: 2025_12_11_0001
Revises: 2025_12_05_0001
Create Date: 2025-12-11 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_12_11_0001'
down_revision = '2025_12_05_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add index flag columns to company table
    op.add_column('company', sa.Column('is_dsex', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('company', sa.Column('is_ds30', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('company', sa.Column('is_dses', sa.Boolean(), nullable=True, server_default='false'))
    
    # Create indexes for efficient querying
    op.create_index(op.f('ix_company_is_dsex'), 'company', ['is_dsex'], unique=False)
    op.create_index(op.f('ix_company_is_ds30'), 'company', ['is_ds30'], unique=False)
    op.create_index(op.f('ix_company_is_dses'), 'company', ['is_dses'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_company_is_dses'), table_name='company')
    op.drop_index(op.f('ix_company_is_ds30'), table_name='company')
    op.drop_index(op.f('ix_company_is_dsex'), table_name='company')
    
    # Remove index flag columns
    op.drop_column('company', 'is_dses')
    op.drop_column('company', 'is_ds30')
    op.drop_column('company', 'is_dsex')

