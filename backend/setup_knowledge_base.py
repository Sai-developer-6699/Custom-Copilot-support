#!/usr/bin/env python3
"""
Setup script for Atlan AI Knowledge Base
This script scrapes documentation and builds the knowledge base index
"""

import os
import sys
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

from web_scraper import scrape_atlan_docs
from enhanced_rag_pipeline import EnhancedRAGPipeline
from enhanced_data_loader import EnhancedDataLoader

def main():
    print("🚀 Setting up Atlan AI Knowledge Base...")
    print("=" * 50)
    
    # Step 1: Scrape documentation
    print("\n📚 Step 1: Scraping Atlan Documentation...")
    try:
        scrape_result = scrape_atlan_docs()
        print(f"✅ Scraping completed!")
        print(f"   - Product docs: {scrape_result['product_pages']} pages")
        print(f"   - API docs: {scrape_result['api_pages']} pages")
    except Exception as e:
        print(f"❌ Error during scraping: {e}")
        return False
    
    # Step 2: Build knowledge base index
    print("\n🔍 Step 2: Building Knowledge Base Index...")
    try:
        rag_pipeline = EnhancedRAGPipeline()
        rag_pipeline.build_index(force_rebuild=True)
        
        stats = rag_pipeline.get_stats()
        print(f"✅ Index built successfully!")
        print(f"   - Total documents: {stats['total_documents']}")
        print(f"   - Index loaded: {stats['index_loaded']}")
    except Exception as e:
        print(f"❌ Error building index: {e}")
        return False
    
    # Step 3: Test the knowledge base
    print("\n🧪 Step 3: Testing Knowledge Base...")
    try:
        test_queries = [
            "How does Atlan connect with Snowflake?",
            "What is Atlan's API?",
            "How do I set up data governance in Atlan?"
        ]
        
        for query in test_queries:
            print(f"\n   Testing: {query}")
            result = rag_pipeline.generate_answer(query)
            print(f"   Answer: {result['answer'][:100]}...")
            print(f"   Sources: {len(result['sources'])} found")
        
        print("✅ Knowledge base test completed!")
    except Exception as e:
        print(f"❌ Error testing knowledge base: {e}")
        return False
    
    # Step 4: Show data loader stats
    print("\n📊 Step 4: Data Sources Summary...")
    try:
        data_loader = EnhancedDataLoader()
        stats = data_loader.get_document_stats()
        
        print(f"   - Total documents: {stats['total_documents']}")
        print(f"   - Content length: {stats['total_content_length']:,} characters")
        print(f"   - Document types:")
        for doc_type, count in stats['by_type'].items():
            print(f"     * {doc_type}: {count} documents")
        
        print("✅ Data sources summary completed!")
    except Exception as e:
        print(f"❌ Error getting data stats: {e}")
        return False
    
    print("\n🎉 Knowledge Base Setup Complete!")
    print("=" * 50)
    print("Your Atlan AI system is ready to use!")
    print("\nNext steps:")
    print("1. Start the backend server: python -m uvicorn main:app --reload")
    print("2. Start the frontend: npm run dev")
    print("3. Test queries in the chat interface")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
