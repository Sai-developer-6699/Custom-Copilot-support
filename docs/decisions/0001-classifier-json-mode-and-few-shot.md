# ADR 0001: Classifier Few-Shot Prompt and JSON Mode

Status: Accepted

## Context

Support triage needs predictable topic, sentiment, and priority labels so downstream routing stays deterministic.

## Decision

Use a focused few-shot system prompt and OpenAI JSON mode in `backend/classifier.py`.

## Consequences

- Classification output is constrained to valid JSON.
- Prompt examples improve consistency for common support cases.
- The backend can safely default missing or malformed fields.
