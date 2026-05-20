# ADR 0004: Structured Index Metadata and Batched Embeddings

Status: Accepted

## Context

The vector index needs better throughput and better provenance than the previous placeholder metadata.

## Decision

Preserve structured document fields from `backend/data_loader.py` through `backend/rag_pipeline.py`, store meaningful metadata with each indexed record, and batch embedding requests during index builds.

## Consequences

- Index rebuilds make fewer embedding API calls.
- Retrieved matches can carry source, title, type, and relevance information.
- The UI and future debugging flows can show where an answer came from.
