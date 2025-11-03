# enhanced_rag_pipeline.py
import numpy as np
import pickle
import faiss
import os
from openai import OpenAI
from pathlib import Path
from enhanced_data_loader import EnhancedDataLoader

# Load API key from environment
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

class EnhancedRAGPipeline:
    def __init__(self, vectorstore_dir="vectorstore"):
        self.vectorstore_dir = Path(vectorstore_dir)
        self.vectorstore_dir.mkdir(exist_ok=True)
        self.index_path = self.vectorstore_dir / "index.faiss"
        self.meta_path = self.vectorstore_dir / "meta.pkl"
        self.data_loader = EnhancedDataLoader()
        self.index = None
        self.docs = None
        
    def embed_text(self, text: str):
        """Generate embedding for text using OpenAI"""
        resp = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return resp.data[0].embedding
    
    def load_index(self):
        """Load existing FAISS index and metadata"""
        if self.index_path.exists() and self.meta_path.exists():
            self.index = faiss.read_index(str(self.index_path))
            with open(self.meta_path, "rb") as f:
                self.docs = pickle.load(f)
            print(f"Loaded existing index with {len(self.docs)} documents")
        else:
            print("No existing index found, will create new one")
            self.index = None
            self.docs = []
    
    def build_index(self, force_rebuild=False):
        """Build or rebuild the FAISS index with all available data"""
        if not force_rebuild and self.index is not None:
            print("Index already exists, skipping rebuild")
            return
        
        print("Building FAISS index...")
        
        # Get all documents
        documents = self.data_loader.get_all_documents()
        print(f"Found {len(documents)} documents to index")
        
        if not documents:
            print("No documents found to index")
            return
        
        # Generate embeddings
        print("Generating embeddings...")
        embeddings = []
        docs_metadata = []
        
        for i, doc_text in enumerate(documents):
            if i % 10 == 0:
                print(f"Processing document {i+1}/{len(documents)}")
            
            try:
                embedding = self.embed_text(doc_text)
                embeddings.append(embedding)
                
                # Create metadata for this document
                doc_metadata = {
                    'text': doc_text,
                    'source': f'document_{i}',
                    'index': i
                }
                docs_metadata.append(doc_metadata)
                
            except Exception as e:
                print(f"Error processing document {i}: {e}")
                continue
        
        if not embeddings:
            print("No valid embeddings generated")
            return
        
        # Create FAISS index
        print("Creating FAISS index...")
        dimension = len(embeddings[0])
        self.index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
        
        # Normalize embeddings for cosine similarity
        embeddings_array = np.array(embeddings).astype("float32")
        faiss.normalize_L2(embeddings_array)
        
        # Add embeddings to index
        self.index.add(embeddings_array)
        
        # Save index and metadata
        faiss.write_index(self.index, str(self.index_path))
        with open(self.meta_path, "wb") as f:
            pickle.dump(docs_metadata, f)
        
        self.docs = docs_metadata
        print(f"Index built successfully with {len(docs_metadata)} documents")
    
    def retrieve(self, query: str, top_k=3):
        """Retrieve top-k similar docs from FAISS index"""
        if self.index is None or self.docs is None:
            raise ValueError("Index not loaded. Call load_index() first.")
        
        qvec = np.array([self.embed_text(query)]).astype("float32")
        faiss.normalize_L2(qvec)  # Normalize query vector
        
        distances, indices = self.index.search(qvec, top_k)
        
        results = []
        for idx in indices[0]:
            if idx < len(self.docs):
                results.append(self.docs[idx])
        
        return results, distances[0]
    
    def generate_answer(self, query: str, top_k=3):
        """Full RAG pipeline: retrieve docs + generate grounded answer"""
        if self.index is None or self.docs is None:
            return {
                "query": query,
                "answer": "Sorry, the knowledge base is not available. Please try again later.",
                "sources": [],
                "retrieved": [],
                "distances": []
            }
        
        try:
            retrieved, distances = self.retrieve(query, top_k)
            
            if not retrieved:
                return {
                    "query": query,
                    "answer": "I couldn't find relevant information in the knowledge base to answer your question.",
                    "sources": [],
                    "retrieved": [],
                    "distances": []
                }
            
            # Build context string for LLM
            context = "\n\n".join(
                [f"{r['text']}\n[source: {r['source']}]" for r in retrieved]
            )
            
            # Enhanced prompt template
            messages = [
                {
                    "role": "system",
                    "content": """You are Atlan's AI support assistant. Your role is to help users with questions about Atlan's products, APIs, and services.

Guidelines:
- Use ONLY the context provided to answer questions
- Always cite sources when providing information
- If the context doesn't contain enough information, say so clearly
- Be helpful, accurate, and professional
- For technical questions, provide specific details and examples when available
- If asked about features not in the context, suggest contacting Atlan support

Context information may include:
- Product documentation
- API/SDK documentation  
- User guides and tutorials
- Code examples
- Configuration instructions"""
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
                temperature=0.1,
                max_tokens=1000
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
            
        except Exception as e:
            print(f"Error in RAG pipeline: {e}")
            return {
                "query": query,
                "answer": f"Sorry, I encountered an error while processing your question: {str(e)}",
                "sources": [],
                "retrieved": [],
                "distances": []
            }
    
    def get_stats(self):
        """Get statistics about the current index"""
        if self.docs is None:
            return {"total_documents": 0, "index_loaded": False}
        
        return {
            "total_documents": len(self.docs),
            "index_loaded": self.index is not None,
            "vectorstore_dir": str(self.vectorstore_dir)
        }

# Global instance
rag_pipeline = EnhancedRAGPipeline()

def generate_answer(query: str, top_k=3):
    """Convenience function for backward compatibility"""
    return rag_pipeline.generate_answer(query, top_k)

def rebuild_index():
    """Rebuild the index with all available data"""
    rag_pipeline.build_index(force_rebuild=True)

def load_index():
    """Load the existing index"""
    rag_pipeline.load_index()

# Initialize on import
if __name__ == "__main__":
    # Test the enhanced RAG pipeline
    print("Testing Enhanced RAG Pipeline...")
    
    # Load or build index
    rag_pipeline.load_index()
    if rag_pipeline.index is None:
        print("Building new index...")
        rag_pipeline.build_index()
    
    # Test query
    query = "How does Atlan connect with Snowflake?"
    result = rag_pipeline.generate_answer(query)
    
    print(f"Query: {query}")
    print(f"Answer: {result['answer']}")
    print(f"Sources: {result['sources']}")
    print(f"Stats: {rag_pipeline.get_stats()}")
else:
    # Auto-load index when module is imported
    rag_pipeline.load_index()
    if rag_pipeline.index is None:
        print("No existing index found, building new one...")
        rag_pipeline.build_index()
