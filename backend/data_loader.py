# data_loader.py
import os, pickle, faiss, numpy as np
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI()

# 1. Chunk text into smaller parts
def chunk_text(text, chunk_size=40, overlap=10):
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunk = " ".join(words[i:i+chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks

# 2. Load .txt files from /data
def load_txt_files(folder="./data"):
    docs = []
    for fname in os.listdir(folder):
        if fname.endswith(".txt"):
            with open(os.path.join(folder, fname), "r", encoding="utf-8") as f:
                text = f.read()
            for i, chunk in enumerate(chunk_text(text)):
                docs.append({
                    "text": chunk,
                    "source": fname,
                    "chunk_id": f"{fname}#{i}"
                })
    return docs

# 3. Create embeddings with OpenAI
def embed_text(text: str):
    resp = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return resp.data[0].embedding

# 4. Build FAISS index
def build_faiss_index(docs, save_path="./vectorstore/index.faiss", meta_path="./vectorstore/meta.pkl"):
    vectors = [embed_text(d["text"]) for d in docs]
    dim = len(vectors[0])
    index = faiss.IndexFlatL2(dim)
    index.add(np.array(vectors).astype("float32"))

    # Save index + docs metadata
    os.makedirs("vectorstore", exist_ok=True)
    faiss.write_index(index, save_path)
    with open(meta_path, "wb") as f:
        pickle.dump(docs, f)

if __name__ == "__main__":
    docs = load_txt_files("data")
    build_faiss_index(docs)
    print(f"✅ Built FAISS index with {len(docs)} chunks")

