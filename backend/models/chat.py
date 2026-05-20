# backend/models/chat.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func
from database import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id         = Column(Integer, primary_key=True)
    session_id = Column(String(36), unique=True, nullable=False, index=True)  # UUID from frontend
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at   = Column(DateTime(timezone=True), nullable=True)

    def to_dict(self):
        return {
            "id":        self.id,
            "sessionId": self.session_id,
            "startedAt": self.started_at.isoformat() if self.started_at else None,
            "endedAt":   self.ended_at.isoformat() if self.ended_at else None,
        }


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id          = Column(Integer, primary_key=True)
    session_id  = Column(String(36), ForeignKey("chat_sessions.session_id", ondelete="CASCADE"), nullable=False, index=True)
    role        = Column(String(20), nullable=False)    # "user" | "assistant"
    content     = Column(Text, nullable=False)
    is_thinking = Column(Boolean, default=False)
    is_error    = Column(Boolean, default=False)
    ticket_id   = Column(Integer, ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    def to_dict(self):
        return {
            "id":         self.id,
            "sessionId":  self.session_id,
            "role":       self.role,
            "content":    self.content,
            "isThinking": self.is_thinking,
            "isError":    self.is_error,
            "ticketId":   self.ticket_id,
            "createdAt":  self.created_at.isoformat() if self.created_at else None,
        }
