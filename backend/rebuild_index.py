from rag_pipeline import rag_pipeline

print("Building index with sentence-transformers...")
rag_pipeline.build_index(force_rebuild=True)

stats = rag_pipeline.get_stats()
print()
print("=== Index Build Complete ===")
print("Documents indexed :", stats["total_documents"])
print("Embedding model   :", stats["embedding_model"])
print("Embedding dim     :", stats["embedding_dim"])
print("Index loaded      :", stats["index_loaded"])
