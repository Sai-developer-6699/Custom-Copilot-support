# 🗄️ Database Design — Atlan AI Customer Support Copilot

## Overview

This document describes the database tables required to migrate from the current
**in-memory / localStorage** state to a persistent **PostgreSQL** backend using
SQLAlchemy ORM.

**Recommended Stack**
| Layer | Choice | Reason |
|-------|--------|--------|
| Database | PostgreSQL 15+ | JSONB support, full-text search, free on Render/Supabase |
| ORM | SQLAlchemy 2.x | Native FastAPI integration, async support |
| Migrations | Alembic | Industry standard for SQLAlchemy |
| Free Hosting | Supabase or Neon | Generous free tier, no credit card needed |

---

## Current State vs. Target State

| Data | Current (What we built) | Target (Database) |
|------|--------------------------|-------------------|
| Tickets | React Context + `localStorage` | `tickets` table |
| Chat messages | Component `useState` (lost on refresh) | `chat_messages` table |
| Uploaded files | Saved to `backend/uploads/` folder | `uploaded_files` table |
| Knowledge base docs | FAISS `.pkl` file | `knowledge_documents` table |
| Vector index | `backend/vectorstore/index.faiss` | Still FAISS (keep as-is, too large for DB) |

> **Note:** The FAISS vector index should **stay as a file** on disk. Only the
> document metadata (source, content, timestamps) moves into the database.

---

## Table Definitions

---

### 1. `tickets`

**Purpose:** Stores every support ticket created when a user submits a query.
Currently this data lives in `TicketContext.jsx` and `localStorage`.

```sql
CREATE TABLE tickets (
    id              SERIAL PRIMARY KEY,
    ticket_number   VARCHAR(30)  NOT NULL UNIQUE,   -- e.g. "TKT-2026-001"
    query           TEXT         NOT NULL,           -- original user question
    topic           VARCHAR(100) NOT NULL,           -- Classifier output: "API/SDK", "SSO", etc.
    sentiment       VARCHAR(50)  NOT NULL,           -- "Frustrated", "Curious", "Angry", "Neutral"
    priority        VARCHAR(10)  NOT NULL,           -- "P0", "P1", "P2"
    status          VARCHAR(30)  NOT NULL DEFAULT 'Resolved',
    ai_response     TEXT,                            -- The answer text returned by RAG
    sources         JSONB        DEFAULT '[]',       -- Array of source strings from RAG
    full_response   JSONB,                           -- Full API response object (for the modal)
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tickets_priority   ON tickets (priority);
CREATE INDEX idx_tickets_topic      ON tickets (topic);
CREATE INDEX idx_tickets_status     ON tickets (status);
CREATE INDEX idx_tickets_created_at ON tickets (created_at DESC);
```

**SQLAlchemy Model:**
```python
# backend/models/ticket.py
from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from database import Base

class Ticket(Base):
    __tablename__ = "tickets"

    id            = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(30), unique=True, nullable=False)
    query         = Column(Text, nullable=False)
    topic         = Column(String(100), nullable=False)
    sentiment     = Column(String(50), nullable=False)
    priority      = Column(String(10), nullable=False)
    status        = Column(String(30), nullable=False, default="Resolved")
    ai_response   = Column(Text)
    sources       = Column(JSONB, default=list)
    full_response = Column(JSONB)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Maps from:** `TicketContext.jsx` → `createTicket()` function

---

### 2. `chat_messages`

**Purpose:** Stores the full conversation history per chat session.
Currently lives only in `ChatSidebar.jsx` component state — lost on every refresh.

```sql
CREATE TABLE chat_sessions (
    id         SERIAL PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL UNIQUE,   -- UUID, generated client-side
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at   TIMESTAMPTZ
);

CREATE TABLE chat_messages (
    id          SERIAL PRIMARY KEY,
    session_id  VARCHAR(36)  NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT         NOT NULL,
    is_thinking BOOLEAN      NOT NULL DEFAULT FALSE,
    is_error    BOOLEAN      NOT NULL DEFAULT FALSE,
    ticket_id   INTEGER      REFERENCES tickets(id) ON DELETE SET NULL,  -- linked ticket if created
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_messages_session_id  ON chat_messages (session_id);
CREATE INDEX idx_chat_messages_created_at  ON chat_messages (created_at);
```

**SQLAlchemy Model:**
```python
# backend/models/chat.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func
from database import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id         = Column(Integer, primary_key=True)
    session_id = Column(String(36), unique=True, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at   = Column(DateTime(timezone=True), nullable=True)

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id          = Column(Integer, primary_key=True)
    session_id  = Column(String(36), ForeignKey("chat_sessions.session_id"), nullable=False)
    role        = Column(String(20), nullable=False)   # "user" | "assistant"
    content     = Column(Text, nullable=False)
    is_thinking = Column(Boolean, default=False)
    is_error    = Column(Boolean, default=False)
    ticket_id   = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
```

**Maps from:** `ChatSidebar.jsx` → `messages` state array

---

### 3. `uploaded_files`

**Purpose:** Tracks every file uploaded through the `/upload` endpoint.
Currently files are saved to `backend/uploads/` but there is no database record
— meaning uploaded docs are "invisible" after a server restart.

```sql
CREATE TABLE uploaded_files (
    id              SERIAL PRIMARY KEY,
    file_id         VARCHAR(36)   NOT NULL UNIQUE,   -- UUID generated in main.py
    original_name   VARCHAR(255)  NOT NULL,
    stored_filename VARCHAR(255)  NOT NULL,           -- UUID-based filename on disk
    file_path       TEXT          NOT NULL,           -- absolute path on server
    content_type    VARCHAR(100)  NOT NULL,
    size_bytes      INTEGER       NOT NULL,
    extracted_text  TEXT,                             -- content extracted from PDF/DOCX etc.
    is_indexed      BOOLEAN       NOT NULL DEFAULT FALSE,  -- added to FAISS index?
    indexed_at      TIMESTAMPTZ,
    uploaded_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_uploaded_files_is_indexed ON uploaded_files (is_indexed);
```

**SQLAlchemy Model:**
```python
# backend/models/uploaded_file.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, func
from database import Base

class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id               = Column(Integer, primary_key=True)
    file_id          = Column(String(36), unique=True, nullable=False)
    original_name    = Column(String(255), nullable=False)
    stored_filename  = Column(String(255), nullable=False)
    file_path        = Column(Text, nullable=False)
    content_type     = Column(String(100), nullable=False)
    size_bytes       = Column(Integer, nullable=False)
    extracted_text   = Column(Text, nullable=True)
    is_indexed       = Column(Boolean, default=False)
    indexed_at       = Column(DateTime(timezone=True), nullable=True)
    uploaded_at      = Column(DateTime(timezone=True), server_default=func.now())
```

**Maps from:** `main.py` → `/upload` endpoint → `process_uploaded_file()`

---

### 4. `knowledge_documents`

**Purpose:** Tracks every document that has been embedded and added to the FAISS
index. Currently the only metadata is in `backend/vectorstore/meta.pkl`.
Storing it in a database makes the knowledge base auditable and manageable.

```sql
CREATE TABLE knowledge_documents (
    id          SERIAL PRIMARY KEY,
    source_type VARCHAR(50)   NOT NULL,   -- "scraped", "uploaded", "static"
    source_url  TEXT,                     -- URL if scraped from the web
    file_id     VARCHAR(36),              -- FK to uploaded_files if uploaded
    title       VARCHAR(500),
    content     TEXT          NOT NULL,
    faiss_index INTEGER,                  -- position in the FAISS index array
    content_hash VARCHAR(64) NOT NULL,    -- SHA-256 to detect duplicates
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (content_hash)                 -- prevent re-indexing same doc
);

-- Index
CREATE INDEX idx_knowledge_docs_source_type ON knowledge_documents (source_type);
CREATE INDEX idx_knowledge_docs_content_hash ON knowledge_documents (content_hash);
```

**SQLAlchemy Model:**
```python
# backend/models/knowledge_document.py
from sqlalchemy import Column, Integer, String, Text, DateTime, func, UniqueConstraint
from database import Base

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id           = Column(Integer, primary_key=True)
    source_type  = Column(String(50), nullable=False)   # "scraped" | "uploaded" | "static"
    source_url   = Column(Text, nullable=True)
    file_id      = Column(String(36), nullable=True)
    title        = Column(String(500), nullable=True)
    content      = Column(Text, nullable=False)
    faiss_index  = Column(Integer, nullable=True)
    content_hash = Column(String(64), nullable=False, unique=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
```

**Maps from:** `enhanced_rag_pipeline.py` → `build_index()` → `docs_metadata`

---

## Entity Relationship Diagram

```
chat_sessions
    │ (1 session has many messages)
    └──< chat_messages
              │ (message may create a ticket)
              └──> tickets

uploaded_files
    │ (uploaded file may become a knowledge doc)
    └──> knowledge_documents
```

---

## Setup Instructions

### Step 1 — Install Dependencies

```bash
cd backend
pip install sqlalchemy asyncpg alembic psycopg2-binary python-dotenv
```

Add to `requirements.txt`:
```
sqlalchemy==2.0.30
alembic==1.13.1
asyncpg==0.29.0
psycopg2-binary==2.9.9
```

### Step 2 — Create `database.py`

```python
# backend/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/atlan_ai")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI dependency — yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Step 3 — Add to `.env`

```bash
# backend/.env  (add this line)
DATABASE_URL=postgresql://postgres:password@localhost:5432/atlan_ai
```

### Step 4 — Initialize Alembic

```bash
cd backend
alembic init migrations
# Edit alembic.ini and migrations/env.py to use DATABASE_URL from .env
alembic revision --autogenerate -m "initial tables"
alembic upgrade head
```

### Step 5 — Wire into `main.py`

```python
# Add to main.py
from database import engine, Base

# Create tables on startup (for dev; use Alembic in production)
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
```

---

## Free Hosting Options for PostgreSQL

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| **Supabase** | 500MB, 2 projects | Best free option, has a web UI |
| **Neon** | 512MB, unlimited projects | Serverless, auto-sleep |
| **Render** | 90-day free PostgreSQL | Expires, good for demos |
| **Railway** | $5 credit/month | Simple, easy setup |

**Recommended for portfolio:** Use **Supabase** — it gives you a visual table editor
that you can screenshot for your LinkedIn post.

---

## Migration Priority Order

When implementing, build the tables in this order to avoid foreign key issues:

1. `chat_sessions` ← no dependencies
2. `knowledge_documents` ← no dependencies
3. `uploaded_files` ← no dependencies
4. `tickets` ← no dependencies
5. `chat_messages` ← depends on `chat_sessions` and `tickets`

---

## What This Unlocks

Once the database is in place, you can add:

- 📊 **Analytics endpoint** — tickets per day, priority breakdown, top topics
- 🔍 **Search** — full-text search across all ticket queries
- 📤 **CSV Export** — download all tickets as a report
- 🔄 **Pagination** — load tickets in pages instead of all at once
- 🔐 **Auth** — associate tickets with logged-in users
- 📈 **Dashboard metrics** — real numbers for your LinkedIn post screenshots
