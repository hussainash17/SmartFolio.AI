import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "rename_id_from_user_id"
down_revision = "add_full_name_at_user"

branch_labels = None
depends_on = None


def upgrade():
    # need to delete and recreate the foreign key of item table
    op.drop_constraint("item_owner_id_fkey", "item", type_="foreignkey")
    op.alter_column(
        "user",
        "user_id",
        new_column_name="id",
    )
    op.create_foreign_key(
        "item_owner_id_fkey",
        "item",
        "user",
        ["owner_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade():
    op.alter_column(
        "user",
        "id",
        new_column_name="user_id",
    )
