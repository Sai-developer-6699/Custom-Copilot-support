"""
test_gemini_rebuild.py
Tests Gemini embeddings using the NEW google-genai SDK (not the deprecated google-generativeai).
Then triggers a FAISS index rebuild using the existing rag_pipeline.
"""
from dotenv import load_dotenv
import os
load_dotenv()

from google import genai                          # NEW SDK (google-genai package)
from google.genai import types

api_key = os.getenv('GEMINI_API_KEY')
print('GEMINI_API_KEY present:', bool(api_key))
if not api_key:
    raise SystemExit('No GEMINI_API_KEY found in .env — add GEMINI_API_KEY=your-key')

# Create client
client = genai.Client(api_key=api_key)

# ---- Test batch embedding ----
print('\nTesting batch embedding with gemini-embedding-001...')
try:
    result = client.models.embed_content(
        model='gemini-embedding-001',
        contents=['hello world', 'second sample'],
    )
    embeddings = result.embeddings          # list of ContentEmbedding objects
    print(f'  Number of embeddings: {len(embeddings)}')
    print(f'  Embedding dimension:  {len(embeddings[0].values)}')
    print('Embedding test PASSED\n')

except Exception as e:
    import traceback
    traceback.print_exc()
    raise SystemExit(f'Embedding test FAILED: {e}')

# ---- Rebuild FAISS index using rag_pipeline ----
print('-- Rebuilding FAISS index via rag_pipeline --\n')
try:
    import sys
    sys.path.insert(0, r'D:\CodingProjects\React Project\Atlan-AI\backend')
    from rag_pipeline import rebuild_index
    rebuild_index()
    print('\nRebuild completed successfully.')
except Exception as e:
    import traceback
    traceback.print_exc()
    raise SystemExit(f'Rebuild FAILED: {e}')
