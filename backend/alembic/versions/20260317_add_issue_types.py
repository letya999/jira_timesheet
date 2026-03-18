"""add issue types

Revision ID: 20260317_add_issue_types
Revises: 6161318b8de2
Create Date: 2026-03-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260317_add_issue_types'
down_revision: Union[str, None] = '6161318b8de2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Create issue_types table
    op.create_table('issue_types',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('jira_id', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('icon_url', sa.String(length=1024), nullable=True),
        sa.Column('is_subtask', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('issue_types', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_issue_types_jira_id'), ['jira_id'], unique=True)

    # Update issues table to add issue_type_id
    with op.batch_alter_table('issues', schema=None) as batch_op:
        batch_op.add_column(sa.Column('issue_type_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_issues_issue_type_id', 'issue_types', ['issue_type_id'], ['id'])

def downgrade() -> None:
    with op.batch_alter_table('issues', schema=None) as batch_op:
        batch_op.drop_constraint('fk_issues_issue_type_id', type_='foreignkey')
        batch_op.drop_column('issue_type_id')

    with op.batch_alter_table('issue_types', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_issue_types_jira_id'))

    op.drop_table('issue_types')
