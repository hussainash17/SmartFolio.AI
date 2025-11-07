"""remove_order_updated_at_trigger

Revision ID: 3d8b4ce437f4
Revises: 2025_11_06_0002
Create Date: 2025-11-07 19:24:10.458353

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '3d8b4ce437f4'
down_revision = '2025_11_06_0002'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the trigger that tries to update updated_at on order table
    # The order table doesn't have an updated_at column
    op.execute("""
        DROP TRIGGER IF EXISTS update_order_updated_at ON "order";
    """)


def downgrade():
    # Recreate the trigger if needed (though order table doesn't have updated_at)
    op.execute("""
        DROP TRIGGER IF EXISTS update_order_updated_at ON "order";
        CREATE TRIGGER update_order_updated_at
            BEFORE UPDATE ON "order"
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)
