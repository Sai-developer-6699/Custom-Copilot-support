# ADR 0007: Groq Generation, Local Embeddings, and Redis-Ready Caching

Status: Accepted

## Context

The project should be inexpensive to run, reproducible in interviews, and aligned with the current codebase rather than older paid-provider assumptions.

## Decision

Use Groq for classification and answer generation, `sentence-transformers` for local embeddings, and a Redis-backed response cache with memory fallback.

## Why this matters

- Groq removes the need for OpenAI API credits for generation and triage.
- Local embeddings keep the retrieval stack fast, private, and cheap.
- Redis makes the cache durable across restarts and safer for multi-worker deployment.
- Memory fallback keeps local development simple when Redis is not available.

## Tradeoffs

- Local embedding models must be downloaded and loaded on first use.
- Redis introduces one more operational dependency when running in production.
- The cache adds complexity around invalidation and freshness, but the support Q&A workload is repetitive enough to justify it.

## Consequences

- The repo is more realistic for a demo: fast generation, no paid embeddings, and durable caching.
- The system can be deployed with a minimal infrastructure footprint.
- The dependency list and `.env` files stay honest about the actual runtime stack.