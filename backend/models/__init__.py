# backend/models/__init__.py
# Import all models here so Alembic can detect them during autogenerate

from .ticket import Ticket
from .chat import ChatSession, ChatMessage
from .uploaded_file import UploadedFile
