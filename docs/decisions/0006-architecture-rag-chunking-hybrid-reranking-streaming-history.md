# ADR 0006: Chunked Retrieval, Hybrid Reranking, Streaming Answers, and Ticket History

Status: Accepted

## Context

The assistant needs to answer from long technical documents, surface the best evidence quickly, and preserve a full conversation trail for each ticket.

## Decision

Use overlapping document chunking in `backend/rag_pipeline.py`, rank retrieval candidates with a hybrid semantic + lexical score, stream Groq responses through `/rag/stream`, and persist each user/assistant turn to `chat_sessions` and `chat_messages`.

## Why this matters

- Chunking reduces information loss when a single source page is too large for one embedding.
- Hybrid reranking improves precision when the semantic match is good but the exact terminology is slightly different.
- Streaming makes the assistant feel responsive and keeps perceived latency low.
- Ticket history turns the copilot into a traceable support workflow instead of a stateless demo.

## Tradeoffs

- More chunks increase the index size, so rebuild time and storage go up.
- Reranking adds CPU work per query, but the candidate set stays small and bounded.
- Streaming complicates the frontend contract, so the client must buffer and finalize responses correctly.
- Persisting chat messages requires a stable session id and one extra round trip to the database.

## Consequences

- Retrieval quality is better on long-form documentation and permission-heavy pages.
- The UI can show partial answers while generation is still running.
- Support conversations can be audited later through ticket history.
- The architecture now supports product-style demos and interview questions about latency, observability, and traceability.