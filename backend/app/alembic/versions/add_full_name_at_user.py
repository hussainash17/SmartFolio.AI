import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "add_full_name_at_user"
down_revision = "update_user_table"

branch_labels = None
depends_on = None


def upgrade():
    # Add full_name column to user table
    op.add_column(
        "user",
        sa.Column("full_name", sa.String(), nullable=True)
    )
    op.alter_column(
        "user",
        "is_active",
        existing_type=sa.Boolean,
        nullable=False,
        server_default=False
    )


def downgrade():
    # Remove full_name column from user table
    op.drop_column("user", "full_name")
    op.alter_column(
        "user",
        "is_active",
        existing_type=sa.Boolean,
        nullable=True,
        server_default=False
    )
