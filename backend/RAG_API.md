RAG API Contract

POST /rag
POST /rag/stream (NDJSON streaming)

Response contract (final payload):

- `query`: string — original user query
- `analysis`: object — classification metadata (topic, sentiment, priority)
- `answer`: string — final generated answer
- `sources`: array of objects — normalized source entries (guaranteed present, may be empty)
  - `chunk`: string — snippet of the retrieved document used in answer
  - `score`: number|null — readable similarity score (rounded to 4 decimals)
  - `doc_title`: string|null — human-friendly title or source label
  - `doc_url`: string|null — URL to original documentation if available
- `sourceMetadata`: array — raw retrieved metadata (kept for backward compatibility)
- `screenshotUsed`: bool
- `fromCache`: bool
- `ticketNumber`, `ticketId`, `sessionId`: optional metadata

Example `sources` entry:

{
  "chunk": "Content: Atlan integrates with Snowflake using secure OAuth authentication...",
  "score": 0.7295,
  "doc_title": "Set up Snowflake",
  "doc_url": "https://docs.atlan.com/product/capabilities/connectors/snowflake"
}

Notes:
- The `sources` array is the primary, normalized contract consumers should rely on.
- The server will continue to provide `sourceMetadata` for compatibility, but frontend should prefer `sources`.
- If no matches are found, `sources` will be an empty array `[]`.
- Streaming endpoint `/rag/stream` yields NDJSON events with types `chunk` and a final `done` event containing the same final payload shape.
