import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'update_user_table'
down_revision = 'rename_app_user_to_user'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to the user table
    op.add_column('user', sa.Column('is_active', sa.Boolean, nullable=True))
    op.add_column('user', sa.Column("is_superuser", sa.Boolean(), nullable=False))


def downgrade():
    # Remove the columns from the user table
    op.drop_column('user', 'is_active')
    op.drop_column('user', 'is_superuser')
