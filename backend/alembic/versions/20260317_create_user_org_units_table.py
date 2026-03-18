"""create user_org_units table

Revision ID: c1f4e9a8d2b3
Revises: 20260317_add_issue_types
Create Date: 2026-03-17 01:25:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1f4e9a8d2b3"
down_revision: Union[str, None] = "20260317_add_issue_types"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "user_org_units" not in inspector.get_table_names():
        op.create_table(
            "user_org_units",
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("org_unit_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["org_unit_id"], ["org_units.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("user_id", "org_unit_id"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "user_org_units" in inspector.get_table_names():
        op.drop_table("user_org_units")
