"""Rename password column to hashed_password in user table

Revision ID: rename_password_to_hashed_password
Revises: rename_id_from_user_id
Create Date: 2024-08-01 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'rename_password'
down_revision = 'rename_id_from_user_id'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('user', 'password', new_column_name='hashed_password',
                    type_=sa.String(length=255),
                    existing_type=sa.String(length=32),
                    existing_nullable=False)


def downgrade():
    op.alter_column('user', 'hashed_password', new_column_name='password',
                    type_=sa.String(length=32),
                    existing_type=sa.String(length=255),
                    existing_nullable=False)
