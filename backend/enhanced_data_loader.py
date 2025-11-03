import os
import json
from pathlib import Path
from typing import List, Dict, Any
import re

class EnhancedDataLoader:
    def __init__(self, data_dir="data", scraped_dir="scraped_data"):
        self.data_dir = Path(data_dir)
        self.scraped_dir = Path(scraped_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.scraped_dir.mkdir(exist_ok=True)
        
    def load_existing_data(self) -> List[Dict[str, Any]]:
        """Load existing data from data directory"""
        documents = []
        
        # Load snowflake.txt
        snowflake_file = self.data_dir / "snowflake.txt"
        if snowflake_file.exists():
            with open(snowflake_file, 'r', encoding='utf-8') as f:
                content = f.read()
                documents.append({
                    'source': 'snowflake.txt',
                    'content': content,
                    'type': 'existing_data'
                })
        
        return documents
    
    def load_scraped_data(self) -> List[Dict[str, Any]]:
        """Load scraped data from scraped_data directory"""
        documents = []
        
        # Load product docs
        product_file = self.scraped_dir / "product_docs" / "atlan_product_docs.json"
        if product_file.exists():
            with open(product_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for item in data:
                    documents.append({
                        'source': f"product_docs/{item['url']}",
                        'content': item['content'],
                        'title': item['title'],
                        'sections': item.get('sections', []),
                        'code_blocks': item.get('code_blocks', []),
                        'type': 'product_docs'
                    })
        
        # Load API docs
        api_file = self.scraped_dir / "api_docs" / "atlan_api_docs.json"
        if api_file.exists():
            with open(api_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for item in data:
                    documents.append({
                        'source': f"api_docs/{item['url']}",
                        'content': item['content'],
                        'title': item['title'],
                        'sections': item.get('sections', []),
                        'code_blocks': item.get('code_blocks', []),
                        'type': 'api_docs'
                    })
        
        return documents
    
    def load_uploaded_files(self, uploads_dir="uploads") -> List[Dict[str, Any]]:
        """Load uploaded files from uploads directory"""
        documents = []
        uploads_path = Path(uploads_dir)
        
        if uploads_path.exists():
            for file_path in uploads_path.glob("*"):
                if file_path.is_file():
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            documents.append({
                                'source': f"uploaded/{file_path.name}",
                                'content': content,
                                'type': 'uploaded_file'
                            })
                    except Exception as e:
                        print(f"Error loading uploaded file {file_path}: {e}")
        
        return documents
    
    def process_document(self, doc: Dict[str, Any]) -> str:
        """Process a document and return formatted text for embedding"""
        content_parts = []
        
        # Add title if available
        if doc.get('title'):
            content_parts.append(f"Title: {doc['title']}")
        
        # Add main content
        if doc.get('content'):
            content_parts.append(f"Content: {doc['content']}")
        
        # Add sections if available
        if doc.get('sections'):
            sections_text = []
            for section in doc['sections']:
                level = section.get('level', 1)
                text = section.get('text', '')
                if text:
                    sections_text.append(f"{'#' * level} {text}")
            
            if sections_text:
                content_parts.append("Sections:\n" + "\n".join(sections_text))
        
        # Add code blocks if available
        if doc.get('code_blocks'):
            code_text = []
            for i, code in enumerate(doc['code_blocks'], 1):
                code_text.append(f"Code Block {i}:\n```\n{code}\n```")
            
            if code_text:
                content_parts.append("Code Examples:\n" + "\n".join(code_text))
        
        # Add source information
        source_info = f"Source: {doc['source']} (Type: {doc['type']})"
        content_parts.append(source_info)
        
        return "\n\n".join(content_parts)
    
    def get_all_documents(self) -> List[str]:
        """Get all documents as processed text for embedding"""
        all_docs = []
        
        # Load existing data
        existing_docs = self.load_existing_data()
        all_docs.extend(existing_docs)
        
        # Load scraped data
        scraped_docs = self.load_scraped_data()
        all_docs.extend(scraped_docs)
        
        # Load uploaded files
        uploaded_docs = self.load_uploaded_files()
        all_docs.extend(uploaded_docs)
        
        # Process all documents
        processed_docs = []
        for doc in all_docs:
            processed_text = self.process_document(doc)
            if processed_text.strip():
                processed_docs.append(processed_text)
        
        return processed_docs
    
    def get_document_stats(self) -> Dict[str, Any]:
        """Get statistics about loaded documents"""
        all_docs = []
        all_docs.extend(self.load_existing_data())
        all_docs.extend(self.load_scraped_data())
        all_docs.extend(self.load_uploaded_files())
        
        stats = {
            'total_documents': len(all_docs),
            'by_type': {},
            'total_content_length': 0,
            'sources': []
        }
        
        for doc in all_docs:
            doc_type = doc.get('type', 'unknown')
            stats['by_type'][doc_type] = stats['by_type'].get(doc_type, 0) + 1
            
            content_length = len(doc.get('content', ''))
            stats['total_content_length'] += content_length
            
            if doc.get('source'):
                stats['sources'].append(doc['source'])
        
        return stats

def main():
    """Test the enhanced data loader"""
    loader = EnhancedDataLoader()
    
    print("Loading all documents...")
    documents = loader.get_all_documents()
    
    print(f"Loaded {len(documents)} documents")
    
    # Get statistics
    stats = loader.get_document_stats()
    print(f"Statistics: {json.dumps(stats, indent=2)}")
    
    # Show sample document
    if documents:
        print(f"\nSample document (first 500 chars):")
        print(documents[0][:500] + "...")

if __name__ == "__main__":
    main()
