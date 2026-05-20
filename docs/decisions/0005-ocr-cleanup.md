# ADR 0005: OCR Post-Processing for Screenshot Inputs

Status: Accepted

## Context

Raw OCR from UI screenshots often includes button labels, repeated chrome, and symbol-heavy noise.

## Decision

Keep OCR in `backend/ocr_service.py` lazy-loaded and apply cleanup heuristics before the extracted text reaches the classifier or RAG pipeline.

## Consequences

- OCR output is less noisy and more useful for retrieval.
- Screenshot-based requests can be merged with user text more safely.
- The preprocessing remains lightweight and easy to reason about.
