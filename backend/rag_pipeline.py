# rag_pipeline.py
import numpy as np
import pickle
import faiss
import os
from openai import OpenAI

# Load API key from environment
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

# Initialize OpenAI client
client = OpenAI(api_key=api_key)


# ----------- Load FAISS Index + Metadata -----------

def load_index(index_path="vectorstore/index.faiss", meta_path="vectorstore/meta.pkl"):
    """Load FAISS index and metadata"""
    index = faiss.read_index(index_path)
    with open(meta_path, "rb") as f:
        docs = pickle.load(f)
    return index, docs

# Load index + docs once when module is imported
index, docs = load_index()

# ----------- Embedding Function -----------

def embed_text(text: str):
    """Generate embedding for text using OpenAI"""
    resp = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return resp.data[0].embedding

# ----------- Retrieval Function -----------

def retrieve(query: str, top_k=3):
    """Retrieve top-k similar docs from FAISS index"""
    qvec = np.array([embed_text(query)]).astype("float32")
    distances, indices = index.search(qvec, top_k)

    results = []
    for idx in indices[0]:
        results.append(docs[idx])
    return results, distances[0]

# ----------- RAG Generation Function -----------

def generate_answer(query: str, top_k=3):
    """Full RAG pipeline: retrieve docs + generate grounded answer"""
    retrieved, distances = retrieve(query, top_k)

    # Build context string for LLM
    context = "\n\n".join(
        [f"{r['text']}\n[source: {r['source']}]" for r in retrieved]
    )

    # Prompt template
    messages = [
        {
            "role": "system",
            "content": "You are Atlan's support assistant. "
                       "Use ONLY the context provided to answer. "
                       "Always cite sources. "
                       "If not in context, say you don’t know."
        },
        {
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {query}"
        }
    ]

    # Call OpenAI chat model
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.0
    )

    answer = resp.choices[0].message.content
    sources = list({r["source"] for r in retrieved})  # deduplicate sources

    return {
        "query": query,
        "answer": answer,
        "sources": sources,
        "retrieved": retrieved,
        "distances": distances.tolist()
    }

# ----------- Debug Run -----------

if __name__ == "__main__":
    q = "How does Atlan connect with Snowflake?"
    result = generate_answer(q)
    print("Q:", q)
    print("\nAnswer:", result["answer"])
    print("\nSources:", result["sources"])
