# backend/models/ticket.py
from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id            = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(30), unique=True, nullable=False, index=True)
    query         = Column(Text, nullable=False)
    topic         = Column(String(100), nullable=False)
    sentiment     = Column(String(50), nullable=False)
    priority      = Column(String(10), nullable=False, index=True)
    status        = Column(String(30), nullable=False, default="Resolved", index=True)
    ai_response   = Column(Text, nullable=True)
    sources       = Column(JSONB, default=list)        # e.g. ["document_1", "document_3"]
    full_response = Column(JSONB, nullable=True)       # full RAG response object for modal
    created_at    = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        """Serialize to dict for API responses — matches the frontend's ticket shape."""
        return {
            "id":            self.id,
            "ticketNumber":  self.ticket_number,
            "query":         self.query,
            "topic":         self.topic,
            "sentiment":     self.sentiment,
            "priority":      self.priority,
            "status":        self.status,
            "response":      self.ai_response,
            "sources":       self.sources or [],
            "fullResponse":  self.full_response,
            "createdAt":     self.created_at.isoformat() if self.created_at else None,
        }
