"""Rename app_user table to user

Revision ID: rename_app_user_to_user
Revises: auto_migrate_schema_sql
Create Date: 2024-08-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'rename_app_user_to_user'
down_revision = 'auto_migrate_schema_sql'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the foreign key constraint from item table
    op.drop_constraint('item_owner_id_fkey', 'item', type_='foreignkey')

    # Rename app_user table to user
    op.rename_table('app_user', 'user')

    # Recreate the foreign key constraint with the new table name
    op.create_foreign_key('item_owner_id_fkey', 'item', 'user', ['owner_id'], ['user_id'], ondelete='CASCADE')


def downgrade():
    # Drop the foreign key constraint from item table
    op.drop_constraint('item_owner_id_fkey', 'item', type_='foreignkey')

    # Rename user table back to app_user
    op.rename_table('user', 'app_user')

    # Recreate the foreign key constraint with the original table name
    op.create_foreign_key('item_owner_id_fkey', 'item', 'app_user', ['owner_id'], ['user_id'], ondelete='CASCADE')
