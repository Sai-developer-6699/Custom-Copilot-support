import faiss
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer

# Load index and metadata
index = faiss.read_index("vectorstore/index.faiss")
with open("vectorstore/meta.pkl", "rb") as f:
    docs = pickle.load(f)

# Load the local embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

query = "How does Atlan connect to Snowflake?"
print(f"Query: '{query}'")

# Generate query vector (normalize to match index)
qvec = model.encode(query, normalize_embeddings=True)
distances, indices = index.search(np.array([qvec]).astype("float32"), 3)

print("\nTop matches:")
for idx, dist in zip(indices[0], distances[0]):
    if idx < len(docs):
        print(f"\nDistance: {dist:.4f}")
        print(f"Source: {docs[idx].get('source', 'Unknown')}")
        print(f"Text Snippet:\n{docs[idx].get('text', '')[:300]}...")
