# backend/models/uploaded_file.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, func
from database import Base


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id              = Column(Integer, primary_key=True)
    file_id         = Column(String(36), unique=True, nullable=False, index=True)  # UUID from main.py
    original_name   = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_path       = Column(Text, nullable=False)
    content_type    = Column(String(100), nullable=False)
    size_bytes      = Column(Integer, nullable=False)
    extracted_text  = Column(Text, nullable=True)          # content pulled from PDF/CSV/etc.
    is_indexed      = Column(Boolean, default=False)       # True once added to FAISS
    indexed_at      = Column(DateTime(timezone=True), nullable=True)
    uploaded_at     = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "fileId":        self.file_id,
            "filename":      self.original_name,
            "contentType":   self.content_type,
            "sizeBytes":     self.size_bytes,
            "isIndexed":     self.is_indexed,
            "uploadedAt":    self.uploaded_at.isoformat() if self.uploaded_at else None,
        }
