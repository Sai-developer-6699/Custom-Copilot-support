"""add_metrics_and_metadata_scope

Revision ID: 1bfd08eb168a
Revises: 701346a0b324
Create Date: 2026-05-24 13:36:26.581751

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1bfd08eb168a'
down_revision: Union[str, Sequence[str], None] = '701346a0b324'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('tickets', sa.Column('metadata_scope', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.create_table(
        'ticket_metrics',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('ticket_id', sa.Integer(), sa.ForeignKey('tickets.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('retrieval_latency_ms', sa.Integer(), nullable=False),
        sa.Column('generation_latency_ms', sa.Integer(), nullable=False),
        sa.Column('faithfulness', sa.Float(), nullable=True),
        sa.Column('answer_relevance', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_table(
        'retrieved_chunks',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('metric_id', sa.Integer(), sa.ForeignKey('ticket_metrics.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('vector_database_uuid', sa.String(length=255), nullable=False),
        sa.Column('text_content', sa.Text(), nullable=False),
        sa.Column('rerank_score', sa.Float(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('retrieved_chunks')
    op.drop_table('ticket_metrics')
    op.drop_column('tickets', 'metadata_scope')
