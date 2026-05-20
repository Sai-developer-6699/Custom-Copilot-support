# ADR 0003: In-Memory Response Cache and Health Endpoint

Status: Accepted

## Context

The application repeats common support questions and needs a cheap availability check for monitoring.

## Decision

Use a SHA-256 keyed in-memory cache with a one-hour TTL in `backend/cache.py`, and expose `/health` in `backend/main.py` with database, index, and cache status.

## Consequences

- Repeated text-only queries can skip model calls.
- Cache state is reset on restart, which keeps the implementation simple.
- Health checks can verify the app is usable without exercising the full chat flow.
