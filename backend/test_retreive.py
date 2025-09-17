import faiss, pickle, numpy as np
from openai import OpenAI
import os
from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI()
index = faiss.read_index("vectorstore/index.faiss")
with open("vectorstore/meta.pkl", "rb") as f:
    docs = pickle.load(f)

query = "How does Atlan connect to Snowflake?"
qvec = client.embeddings.create(model="text-embedding-3-small", input=query).data[0].embedding
distances, indices = index.search(np.array([qvec]).astype("float32"), 2)

print("Top matches:")
for idx in indices[0]:
    print(docs[idx])
