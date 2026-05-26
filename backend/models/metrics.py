# backend/models/metrics.py
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime, func
from sqlalchemy.orm import relationship
from database import Base


class TicketEvaluationMetric(Base):
    __tablename__ = "ticket_metrics"

    id                    = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id             = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    retrieval_latency_ms  = Column(Integer, nullable=False)
    generation_latency_ms = Column(Integer, nullable=False)
    faithfulness          = Column(Float, nullable=True)
    answer_relevance      = Column(Float, nullable=True)
    created_at            = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    ticket           = relationship("Ticket", back_populates="metrics")
    retrieved_chunks = relationship("RetrievedChunkSource", back_populates="metric", cascade="all, delete-orphan")


class RetrievedChunkSource(Base):
    __tablename__ = "retrieved_chunks"

    id                    = Column(Integer, primary_key=True, autoincrement=True)
    metric_id             = Column(Integer, ForeignKey("ticket_metrics.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index           = Column(Integer, nullable=False)
    vector_database_uuid  = Column(String(255), nullable=False)
    text_content          = Column(Text, nullable=False)
    rerank_score          = Column(Float, nullable=True)

    # Relationships
    metric = relationship("TicketEvaluationMetric", back_populates="retrieved_chunks")
