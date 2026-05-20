# rag_pipeline.py
import numpy as np
import pickle
import faiss
import os
import re
from pathlib import Path
from data_loader import DataLoader
from dotenv import load_dotenv

load_dotenv()

# ---- Groq client (used for answer GENERATION — fast, generous free tier) ----
from groq import Groq as _Groq

_groq_client = _Groq(api_key=os.getenv("GROQ_API_KEY"))
GROQ_MODEL   = os.getenv("GROQ_MODEL_FAST", "llama-3.1-8b-instant")

# ---- Local embedding model (sentence-transformers, runs on CPU) ----
# Downloaded once (~90MB) from HuggingFace on first use,
# then cached locally forever — no API key, no billing, no internet needed.
_embedding_model = None
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"   # 384-dim, ~20ms per query on CPU
EMBED_DIM = 384


def _get_embedding_model():
    """Lazy singleton — model loads into RAM only once per process."""
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        print(f"Loading embedding model '{EMBED_MODEL_NAME}' "
              f"(first run: downloads ~90MB, then cached)...")
        _embedding_model = SentenceTransformer(EMBED_MODEL_NAME)
        print("Embedding model ready.")
    return _embedding_model


class RAGPipeline:
    def __init__(self, vectorstore_dir="vectorstore"):
        self.vectorstore_dir = Path(vectorstore_dir)
        self.vectorstore_dir.mkdir(exist_ok=True)
        self.index_path = self.vectorstore_dir / "index.faiss"
        self.meta_path  = self.vectorstore_dir / "meta.pkl"
        self.data_loader = DataLoader()
        self.index = None
        self.docs  = None

    # ------------------------------------------------------------------
    # Embedding helpers
    # ------------------------------------------------------------------
    def _chunk_text(self, text: str, chunk_size: int = 900, overlap: int = 160) -> list[str]:
        """Split long documents into overlapping chunks for better retrieval."""
        normalised = " ".join(text.split())
        if len(normalised) <= chunk_size:
            return [normalised]

        chunks: list[str] = []
        start = 0
        text_length = len(normalised)

        while start < text_length:
            end = min(text_length, start + chunk_size)
            if end < text_length:
                boundary = normalised.rfind(" ", start + int(chunk_size * 0.7), end)
                if boundary > start:
                    end = boundary

            chunk = normalised[start:end].strip()
            if chunk:
                chunks.append(chunk)

            if end >= text_length:
                break

            start = max(end - overlap, start + 1)

        return chunks or [normalised]

    def embed_text(self, text: str) -> list:
        """Embed a single string locally (no API call)."""
        model = _get_embedding_model()
        return model.encode(text, normalize_embeddings=True).tolist()

    def embed_batch(self, texts: list) -> list:
        """Embed a list of strings in one forward pass — much faster than
        calling embed_text() in a loop. Inputs are explicitly cast to str
        to prevent sentence-transformers v5+ multimodal detection."""
        model = _get_embedding_model()
        safe_texts = [t if isinstance(t, str) else str(t) for t in texts]
        return model.encode(
            safe_texts,
            normalize_embeddings=True,
            batch_size=32,
            show_progress_bar=True
        ).tolist()

    # ------------------------------------------------------------------
    # Index management
    # ------------------------------------------------------------------
    def load_index(self):
        """Load existing FAISS index and metadata from disk."""
        if self.index_path.exists() and self.meta_path.exists():
            self.index = faiss.read_index(str(self.index_path))
            with open(self.meta_path, "rb") as f:
                self.docs = pickle.load(f)
            print(f"Loaded existing index with {len(self.docs)} documents")
        else:
            print("No existing index found — call build_index() to create one.")
            self.index = None
            self.docs  = []

    def build_index(self, force_rebuild=False):
        """Build (or rebuild) the FAISS index using batch embeddings."""
        if not force_rebuild and self.index is not None:
            print("Index already exists, skipping rebuild.")
            return

        print("Building FAISS index...")
        documents = self.data_loader.get_all_documents()
        print(f"Found {len(documents)} documents to index.")

        if not documents:
            print("No documents found to index.")
            return

        chunk_records: list[dict] = []
        for doc_index, document in enumerate(documents):
            chunks = self._chunk_text(document)
            total_chunks = len(chunks)
            for chunk_index, chunk_text in enumerate(chunks):
                chunk_records.append({
                    "text": chunk_text,
                    "source": f"document_{doc_index}",
                    "parent_source": f"document_{doc_index}",
                    "chunk_index": chunk_index,
                    "chunk_count": total_chunks,
                    "index": len(chunk_records),
                })

        # Batch embed all documents in one call (much faster than one-by-one)
        print("Generating embeddings (local sentence-transformers)...")
        try:
            all_embeddings = self.embed_batch([record["text"] for record in chunk_records])
        except Exception as e:
            print(f"Batch embedding failed ({e}), falling back to one-by-one...")
            all_embeddings = []
            for i, record in enumerate(chunk_records):
                try:
                    all_embeddings.append(self.embed_text(record["text"]))
                except Exception as e2:
                    print(f"  Skipping document {i}: {e2}")

        if not all_embeddings:
            print("No valid embeddings generated.")
            return

        docs_metadata = chunk_records

        # Build FAISS IndexFlatIP (inner product = cosine sim after L2 norm)
        print("Creating FAISS index...")
        embeddings_array = np.array(all_embeddings).astype("float32")
        faiss.normalize_L2(embeddings_array)          # already normalised, but safe

        self.index = faiss.IndexFlatIP(embeddings_array.shape[1])
        self.index.add(embeddings_array)

        # Persist to disk
        faiss.write_index(self.index, str(self.index_path))
        with open(self.meta_path, "wb") as f:
            pickle.dump(docs_metadata, f)

        self.docs = docs_metadata
        print(f"Index built with {len(docs_metadata)} chunks "
              f"(dim={embeddings_array.shape[1]}).")

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------
    def _token_set(self, text: str) -> set[str]:
        return set(re.findall(r"[a-z0-9]+", text.lower()))

    def _lexical_overlap(self, query: str, text: str) -> float:
        query_tokens = self._token_set(query)
        if not query_tokens:
            return 0.0
        text_tokens = self._token_set(text)
        if not text_tokens:
            return 0.0
        return len(query_tokens & text_tokens) / len(query_tokens)

    def retrieve(self, query: str, top_k: int = 5, min_score: float = 0.25):
        """Return top-k relevant docs with hybrid semantic + lexical reranking."""
        if self.index is None or self.docs is None:
            raise ValueError("Index not loaded. Call load_index() first.")

        qvec = np.array([self.embed_text(query)]).astype("float32")
        faiss.normalize_L2(qvec)

        candidate_count = min(max(top_k * 4, top_k), len(self.docs))
        distances, indices = self.index.search(qvec, candidate_count)

        results = []
        for score, idx in zip(distances[0], indices[0]):
            if float(score) >= min_score and idx < len(self.docs):
                doc = dict(self.docs[idx])
                semantic_score = float(score)
                lexical_score = self._lexical_overlap(query, doc["text"])
                rerank_score = (0.72 * semantic_score) + (0.28 * lexical_score)
                doc["semantic_score"] = round(semantic_score, 4)
                doc["lexical_score"] = round(lexical_score, 4)
                doc["rerank_score"] = round(rerank_score, 4)
                doc["relevance_score"] = doc["rerank_score"]
                results.append(doc)

        results.sort(key=lambda item: item.get("rerank_score", 0.0), reverse=True)
        return results[:top_k], distances[0]

    def _build_prompt(self, query: str, retrieved: list[dict]) -> tuple[str, str]:
        MAX_CHUNK_CHARS = 800
        context_blocks = []
        for i, doc in enumerate(retrieved, 1):
            source_label = doc.get("parent_source") or doc.get("source", f"document_{i}")
            chunk_label = None
            if doc.get("chunk_count"):
                chunk_label = f"chunk {doc.get('chunk_index', 0) + 1}/{doc['chunk_count']}"
            score_bits = []
            if doc.get("semantic_score") is not None:
                score_bits.append(f"semantic={doc['semantic_score']}")
            if doc.get("lexical_score") is not None:
                score_bits.append(f"lexical={doc['lexical_score']}")
            if doc.get("rerank_score") is not None:
                score_bits.append(f"rerank={doc['rerank_score']}")

            header_parts = [f"[{i}] Source: {source_label}"]
            if chunk_label:
                header_parts.append(f"({chunk_label})")
            if score_bits:
                header_parts.append(f"[{', '.join(score_bits)}]")

            context_blocks.append(
                f"{' '.join(header_parts)}\n{doc['text'][:MAX_CHUNK_CHARS]}"
            )

        context = "\n\n---\n\n".join(context_blocks)

        system_prompt = """You are Atlas, Atlan's intelligent support assistant. Atlan is a modern data catalog platform used by data teams to discover, document, and govern their data assets.

Your role:
- Answer support questions accurately using ONLY the provided knowledge base context
- Be concise but complete — include all steps needed to resolve the issue
- Cite sources using [1], [2], [3] notation matching the numbered context blocks

Response format:
1. Direct answer (1-2 sentences)
2. Step-by-step instructions if applicable (numbered list)
3. Code example if relevant (use markdown code blocks)
4. Source citations at the end: "Sources: [1], [2]"

Constraints:
- NEVER invent features or steps not present in the context
- If context is insufficient: "Based on available documentation, [partial answer]. For complete guidance, contact support@atlan.com"
- Do not mention competitors
- Keep answers under 400 words unless detail is required
- If you see "Screenshot Content:" in the query, use it to understand the user's specific error state"""

        user_prompt = f"""Knowledge Base Context:
{context}

---
User Question: {query}

Provide a helpful, accurate answer based strictly on the context above."""

        return system_prompt, user_prompt

    def _build_response_payload(self, query: str, answer: str, retrieved: list[dict], distances):
        # Normalize retrieved documents into a stable `sources` array of objects
        normalized = []
        for doc in (retrieved or []):
            # Prefer the most meaningful score available
            raw_score = (
                doc.get("relevance_score")
                or doc.get("rerank_score")
                or doc.get("semantic_score")
                or doc.get("score")
                or 0.0
            )
            try:
                score = round(float(raw_score), 4)
            except Exception:
                score = 0.0

            # Prefer explicit title, fall back to parent_source or source label
            doc_title = doc.get("title") or doc.get("parent_source") or doc.get("source")

            # Derive a doc_url when available (explicit `url` field or absolute `source`)
            doc_url = None
            if doc.get("url"):
                doc_url = doc.get("url")
            elif isinstance(doc.get("source"), str) and doc.get("source").startswith("http"):
                doc_url = doc.get("source")

            normalized.append({
                "chunk": doc.get("text") or "",
                "score": score,
                "doc_title": doc_title,
                "doc_url": doc_url,
            })

        return {
            "query": query,
            "answer": answer,
            "sources": normalized,  # always present; may be empty list
            "retrieved": retrieved or [],
            "distances": distances.tolist() if hasattr(distances, "tolist") else list(distances or []),
        }

    # ------------------------------------------------------------------
    # Generation (still uses GPT-4o-mini)
    # ------------------------------------------------------------------
    def generate_answer(self, query: str, top_k: int = 5, min_score: float = 0.25):
        """Full RAG pipeline: retrieve docs → assemble prompt → generate answer."""
        if self.index is None or self.docs is None:
            return {
                "query":     query,
                "answer":    "The knowledge base is not available. Please try again later.",
                "sources":   [],
                "retrieved": [],
                "distances": []
            }

        try:
            retrieved, distances = self.retrieve(query, top_k, min_score)

            if not retrieved:
                return {
                    "query":  query,
                    "answer": (
                        "I couldn't find sufficiently relevant information in the knowledge base "
                        "to answer your question. Please try rephrasing, or contact "
                        "Atlan support at support@atlan.com."
                    ),
                    "sources":   [],
                    "retrieved": [],
                    "distances": distances.tolist()
                }

            system_prompt, user_prompt = self._build_prompt(query, retrieved)

            resp = _groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=400       # keep total request < 6k TPM free tier limit
            )

            answer  = resp.choices[0].message.content
            return self._build_response_payload(query, answer, retrieved, distances)

        except Exception as e:
            print(f"Error in RAG pipeline: {e}")
            return {
                "query":     query,
                "answer":    "I encountered an error while processing your question. Please try again.",
                "sources":   [],
                "retrieved": [],
                "distances": []
            }

    def stream_generate_answer(self, query: str, top_k: int = 5, min_score: float = 0.25):
        """Yield streamed answer chunks and finish with a final response payload."""
        if self.index is None or self.docs is None:
            yield {
                "type": "done",
                "response": {
                    "query": query,
                    "answer": "The knowledge base is not available. Please try again later.",
                    "sources": [],
                    "retrieved": [],
                    "distances": [],
                },
            }
            return

        try:
            retrieved, distances = self.retrieve(query, top_k, min_score)

            if not retrieved:
                yield {
                    "type": "done",
                    "response": {
                        "query": query,
                        "answer": (
                            "I couldn't find sufficiently relevant information in the knowledge base "
                            "to answer your question. Please try rephrasing, or contact "
                            "Atlan support at support@atlan.com."
                        ),
                        "sources": [],
                        "retrieved": [],
                        "distances": distances.tolist(),
                    },
                }
                return

            system_prompt, user_prompt = self._build_prompt(query, retrieved)
            response_stream = _groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
                max_tokens=400,
                stream=True,
            )

            answer_parts = []
            for chunk in response_stream:
                delta = getattr(chunk.choices[0].delta, "content", None)
                if delta:
                    answer_parts.append(delta)
                    yield {"type": "chunk", "delta": delta}

            answer = "".join(answer_parts).strip()
            yield {
                "type": "done",
                "response": self._build_response_payload(query, answer, retrieved, distances),
            }

        except Exception as e:
            print(f"Error in streaming RAG pipeline: {e}")
            yield {
                "type": "done",
                "response": {
                    "query": query,
                    "answer": "I encountered an error while processing your question. Please try again.",
                    "sources": [],
                    "retrieved": [],
                    "distances": [],
                },
            }

    def get_stats(self):
        """Stats for the /health endpoint."""
        if self.docs is None:
            return {"total_documents": 0, "index_loaded": False}
        return {
            "total_documents": len(self.docs),
            "index_loaded":    self.index is not None,
            "vectorstore_dir": str(self.vectorstore_dir),
            "embedding_model": EMBED_MODEL_NAME,
            "embedding_dim":   EMBED_DIM
        }


# Backward-compatible alias
EnhancedRAGPipeline = RAGPipeline

# Global singleton used by main.py
rag_pipeline = RAGPipeline()


def generate_answer(query: str, top_k: int = 5) -> dict:
    return rag_pipeline.generate_answer(query, top_k)

def rebuild_index():
    rag_pipeline.build_index(force_rebuild=True)

def load_index():
    rag_pipeline.load_index()


# On import by FastAPI — load existing index (or build if missing)
if __name__ == "__main__":
    print("Testing RAG Pipeline...")
    rag_pipeline.load_index()
    if rag_pipeline.index is None:
        rag_pipeline.build_index()
    result = rag_pipeline.generate_answer("How does Atlan connect with Snowflake?")
    print("Answer:", result["answer"][:200])
    print("Stats:", rag_pipeline.get_stats())
else:
    rag_pipeline.load_index()
    if rag_pipeline.index is None:
        print("No existing index — building now...")
        rag_pipeline.build_index()
