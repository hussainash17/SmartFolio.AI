"""Add KYC and UserAccount tables

Revision ID: 2024_08_03_1600
Revises: 2024_01_20_1000
Create Date: 2024-08-03 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2024_08_03_1600'
down_revision = '2024_01_20_1000'
branch_labels = None
depends_on = None


def upgrade():
    # Create KYCInformation table
    op.create_table('kycinformation',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('first_name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('last_name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('date_of_birth', sa.DateTime(), nullable=False),
        sa.Column('ssn_last_four', sqlmodel.sql.sqltypes.AutoString(length=4), nullable=False),
        sa.Column('phone_number', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('street_address', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
        sa.Column('city', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('state', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('zip_code', sqlmodel.sql.sqltypes.AutoString(length=10), nullable=False),
        sa.Column('country', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('employer_name', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=True),
        sa.Column('occupation', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('annual_income', sa.Integer(), nullable=True),
        sa.Column('employment_status', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column('net_worth', sa.Integer(), nullable=True),
        sa.Column('liquid_net_worth', sa.Integer(), nullable=True),
        sa.Column('investment_experience', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column('kyc_status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('verification_date', sa.DateTime(), nullable=True),
        sa.Column('expiry_date', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('documents', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create UserAccount table
    op.create_table('useraccount',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('account_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('account_name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('account_number', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column('joint_holder_name', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=True),
        sa.Column('joint_holder_ssn', sqlmodel.sql.sqltypes.AutoString(length=11), nullable=True),
        sa.Column('contribution_limit', sa.Integer(), nullable=True),
        sa.Column('current_year_contributions', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create UserInvestmentGoal table
    op.create_table('userinvestmentgoal',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('goal_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('target_amount', sa.Integer(), nullable=True),
        sa.Column('target_date', sa.DateTime(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    # Drop tables in reverse order
    op.drop_table('userinvestmentgoal')
    op.drop_table('useraccount')
    op.drop_table('kycinformation')