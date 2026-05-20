# Architecture Decisions

This directory captures the major architectural, engineering, and scaling decisions behind the Atlan AI copilot.

## Decision Log

- [0001-classifier-json-mode-and-few-shot.md](0001-classifier-json-mode-and-few-shot.md) - Structured JSON classification with few-shot prompting.
- [0002-rag-prompt-and-relevance-threshold.md](0002-rag-prompt-and-relevance-threshold.md) - Grounded RAG prompting and low-confidence filtering.
- [0003-response-cache-and-health-endpoint.md](0003-response-cache-and-health-endpoint.md) - Cache visibility and health observability.
- [0004-index-metadata-and-batched-embeddings.md](0004-index-metadata-and-batched-embeddings.md) - Metadata preservation and batched embeddings.
- [0005-ocr-cleanup.md](0005-ocr-cleanup.md) - OCR cleanup for screenshot handling.
- [0006-architecture-rag-chunking-hybrid-reranking-streaming-history.md](0006-architecture-rag-chunking-hybrid-reranking-streaming-history.md) - Chunking, reranking, streaming, and ticket history.
- [0007-engineering-groq-sentence-transformers-redis.md](0007-engineering-groq-sentence-transformers-redis.md) - Groq generation, local embeddings, and Redis-ready caching.
- [0008-scaling-durable-support-workflow.md](0008-scaling-durable-support-workflow.md) - Durable support workflow and scaling choices.

## Reading Order

Start with 0006 for the retrieval and history flow, then 0007 for the provider and cache strategy, and 0008 for the scaling story.