# ADR 0002: Grounded RAG Prompt and Retrieval Threshold

Status: Accepted

## Context

The assistant should answer only from approved knowledge base content and avoid low-confidence retrievals.

## Decision

Keep the RAG system prompt strict about persona, citation format, and answer constraints in `backend/rag_pipeline.py`, and apply a minimum similarity score of `0.25` in retrieval.

## Consequences

- The assistant is more likely to stay grounded in source content.
- Low-score matches are filtered before generation.
- Empty retrievals produce a deliberate fallback instead of a hallucinated answer.
