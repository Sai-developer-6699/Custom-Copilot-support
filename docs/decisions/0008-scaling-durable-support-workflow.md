# ADR 0008: Scaling the Copilot for Support Workflows

Status: Accepted

## Context

Support copilots fail when they are only optimized for a single-user demo. The system needs to handle repeated questions, long documents, screenshots, and persistent support context.

## Decision

Scale the system with a layered approach:

- Cache repeated text-only answers.
- Index chunked documents instead of monolithic pages.
- Persist tickets, sessions, and messages in PostgreSQL.
- Keep OCR processing isolated to upload time.
- Preserve a fallback path when Redis or external services are unavailable.

## Why this matters

- Caching reduces repeated LLM work on common support questions.
- Chunking and reranking improve retrieval without requiring a larger model.
- Database persistence gives the product a support-system memory model.
- OCR at upload time keeps query-time latency lower and makes screenshot handling predictable.

## Tradeoffs

- More persistence means more schema and migration work.
- Rebuilding a chunked index is heavier than rebuilding a small one.
- Streaming and persistence add orchestration complexity, but they make the product feel much closer to an industry system.

## Consequences

- The app now demonstrates scaling thinking across compute, storage, and response latency.
- It is easier to talk about failure modes in interviews: cache misses, model latency, index rebuild time, and database recovery.
- The architecture is more credible for production discussion because it shows durable state, not just in-memory state.