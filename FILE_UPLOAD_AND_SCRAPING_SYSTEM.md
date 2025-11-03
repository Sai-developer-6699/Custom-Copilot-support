# File Upload and Web Scraping System

This document explains the comprehensive file upload system and web scraping functionality implemented for the Atlan AI system.

## Overview

The system now supports:
1. **File Upload** - Users can upload various file types through the chat interface
2. **Web Scraping** - Automatic scraping of Atlan documentation
3. **Enhanced RAG** - Knowledge base that includes multiple data sources
4. **Real-time Processing** - Files are processed and indexed automatically

## File Upload System

### Frontend Implementation

**Location**: `frontend/src/components/chat/ChatSidebar.jsx`

**Features**:
- **Multi-file Upload**: Support for multiple files at once
- **File Validation**: Size limits (10MB) and type restrictions
- **Real-time Status**: Upload progress and status indicators
- **File Preview**: Visual preview with file icons and status
- **Auto-upload**: Files are automatically uploaded when selected

**Supported File Types**:
```javascript
const allowedTypes = [
  'text/plain',           // .txt
  'text/csv',             // .csv
  'application/pdf',      // .pdf
  'application/msword',   // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/json',     // .json
  'text/markdown',        // .md
  'image/jpeg',           // .jpg, .jpeg
  'image/png',            // .png
  'image/gif'             // .gif
];
```

**File Upload Flow**:
1. User selects files via file input
2. Files are validated (size, type)
3. Files are automatically uploaded to backend
4. Upload progress and status are displayed
5. Processed content is stored for RAG indexing

### Backend Implementation

**Location**: `backend/main.py`

**Endpoints**:
- `POST /upload` - Upload and process files
- `POST /rebuild-index` - Rebuild knowledge base index
- `POST /scrape-docs` - Scrape documentation and rebuild index
- `GET /index-stats` - Get knowledge base statistics

**File Processing**:
```python
async def process_uploaded_file(file_path: Path, content_type: str) -> str:
    """Process uploaded file and extract text content"""
    if content_type.startswith('text/'):
        # Handle text files
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            return await f.read()
    
    elif content_type == 'application/json':
        # Handle JSON files
        # ... JSON processing logic
    
    elif content_type == 'application/pdf':
        # Handle PDF files with PyPDF2
        # ... PDF processing logic
    
    # ... other file types
```

## Web Scraping System

### Implementation

**Location**: `backend/web_scraper.py`

**Features**:
- **Multi-site Scraping**: Scrapes both product docs and API docs
- **Content Extraction**: Extracts text, headings, code blocks, and links
- **Respectful Scraping**: Includes delays and proper headers
- **Data Organization**: Saves content in structured JSON format

**Scraped Sources**:
1. **Product Documentation**: https://docs.atlan.com/
2. **API/SDK Documentation**: https://developer.atlan.com/

**Scraping Process**:
```python
def scrape_site(self, max_pages=50, delay=1):
    """Scrape the entire site starting from base URL"""
    urls_to_visit = [self.base_url]
    
    while urls_to_visit and len(self.visited_urls) < max_pages:
        current_url = urls_to_visit.pop(0)
        content = self.scrape_page(current_url)
        
        if content:
            # Add new links to visit
            new_links = [link['url'] for link in content['links']]
            urls_to_visit.extend(new_links)
        
        time.sleep(delay)  # Be respectful
```

**Content Structure**:
```json
{
  "url": "https://docs.atlan.com/getting-started",
  "title": "Getting Started with Atlan",
  "content": "Full page content...",
  "sections": [
    {"level": 1, "text": "Introduction"},
    {"level": 2, "text": "Prerequisites"}
  ],
  "code_blocks": ["code example 1", "code example 2"],
  "links": [
    {"text": "Next Steps", "url": "https://docs.atlan.com/next-steps"}
  ]
}
```

## Enhanced Data Loader

### Implementation

**Location**: `backend/enhanced_data_loader.py`

**Data Sources**:
1. **Existing Data**: `data/snowflake.txt`
2. **Scraped Data**: `scraped_data/product_docs/` and `scraped_data/api_docs/`
3. **Uploaded Files**: `uploads/`

**Features**:
- **Multi-source Loading**: Combines all data sources
- **Content Processing**: Formats content for embedding
- **Statistics**: Provides detailed data statistics
- **Flexible Structure**: Easy to add new data sources

**Data Processing**:
```python
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
    
    # Add source information
    source_info = f"Source: {doc['source']} (Type: {doc['type']})"
    content_parts.append(source_info)
    
    return "\n\n".join(content_parts)
```

## Enhanced RAG Pipeline

### Implementation

**Location**: `backend/enhanced_rag_pipeline.py`

**Features**:
- **Dynamic Index Building**: Can rebuild index with new data
- **Multiple Data Sources**: Integrates all available data
- **Improved Retrieval**: Better similarity search
- **Enhanced Prompts**: More detailed and helpful responses

**Index Management**:
```python
def build_index(self, force_rebuild=False):
    """Build or rebuild the FAISS index with all available data"""
    # Get all documents from data loader
    documents = self.data_loader.get_all_documents()
    
    # Generate embeddings
    embeddings = []
    for doc_text in documents:
        embedding = self.embed_text(doc_text)
        embeddings.append(embedding)
    
    # Create FAISS index
    dimension = len(embeddings[0])
    self.index = faiss.IndexFlatIP(dimension)
    
    # Normalize embeddings for cosine similarity
    embeddings_array = np.array(embeddings).astype("float32")
    faiss.normalize_L2(embeddings_array)
    
    # Add embeddings to index
    self.index.add(embeddings_array)
    
    # Save index and metadata
    faiss.write_index(self.index, str(self.index_path))
    with open(self.meta_path, "wb") as f:
        pickle.dump(docs_metadata, f)
```

## Setup and Usage

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**New Dependencies Added**:
- `aiofiles` - Async file operations
- `PyPDF2` - PDF text extraction
- `beautifulsoup4` - Web scraping
- `requests` - HTTP requests
- `lxml` - XML/HTML parsing

### 2. Setup Knowledge Base

```bash
cd backend
python setup_knowledge_base.py
```

This script will:
1. Scrape Atlan documentation
2. Build the knowledge base index
3. Test the system
4. Show statistics

### 3. Start the System

```bash
# Backend
cd backend
python -m uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm run dev
```

### 4. Test File Upload

1. Open the chat interface
2. Click the paperclip icon
3. Select files to upload
4. Watch upload progress
5. Submit a query to test RAG with uploaded content

## API Endpoints

### File Upload
```http
POST /upload
Content-Type: multipart/form-data

file: [binary file data]
filename: "document.pdf"
```

**Response**:
```json
{
  "fileId": "uuid-string",
  "filename": "document.pdf",
  "filePath": "uploads/uuid-string.pdf",
  "contentType": "application/pdf",
  "size": 1024000,
  "content": "Extracted text content..."
}
```

### Index Management
```http
POST /rebuild-index
```

**Response**:
```json
{
  "message": "Knowledge base index rebuilt successfully"
}
```

### Documentation Scraping
```http
POST /scrape-docs
```

**Response**:
```json
{
  "message": "Documentation scraped and index rebuilt successfully",
  "result": {
    "product_docs": "path/to/product_docs.json",
    "api_docs": "path/to/api_docs.json",
    "product_pages": 25,
    "api_pages": 18
  }
}
```

### Index Statistics
```http
GET /index-stats
```

**Response**:
```json
{
  "total_documents": 150,
  "index_loaded": true,
  "vectorstore_dir": "vectorstore"
}
```

## File Processing Details

### Text Files (.txt, .md, .csv)
- Direct text extraction
- UTF-8 encoding support
- Preserves formatting

### JSON Files (.json)
- Parsed and pretty-printed
- Structured data extraction
- Error handling for malformed JSON

### PDF Files (.pdf)
- Text extraction using PyPDF2
- Multi-page support
- Handles various PDF formats

### Images (.jpg, .png, .gif)
- Basic file information
- OCR processing not implemented yet
- Placeholder for future enhancement

### Office Documents (.doc, .docx, .xls, .xlsx)
- Basic file information
- Content extraction not implemented yet
- Placeholder for future enhancement

## Data Flow

```
User Uploads File
    ↓
Frontend Validation
    ↓
Backend Processing
    ↓
Content Extraction
    ↓
Storage in uploads/
    ↓
Enhanced Data Loader
    ↓
RAG Pipeline Index
    ↓
Query Processing
    ↓
Response Generation
```

## Monitoring and Maintenance

### Index Statistics
- Total documents indexed
- Data source breakdown
- Content length statistics
- Index health status

### File Management
- Automatic file cleanup (optional)
- Storage usage monitoring
- File type distribution

### Performance Monitoring
- Query response times
- Index build times
- Memory usage
- Error rates

## Future Enhancements

### File Processing
- **OCR Support**: Extract text from images
- **Office Documents**: Full support for Word/Excel files
- **Audio/Video**: Transcribe audio and video content
- **Archives**: Extract content from ZIP/RAR files

### Web Scraping
- **Scheduled Updates**: Automatic periodic re-scraping
- **Change Detection**: Only scrape updated pages
- **More Sources**: Additional documentation sites
- **Content Filtering**: Better content relevance filtering

### RAG Improvements
- **Hybrid Search**: Combine semantic and keyword search
- **Query Expansion**: Improve query understanding
- **Context Window**: Better context management
- **Source Ranking**: Prioritize more relevant sources

## Troubleshooting

### Common Issues

1. **File Upload Fails**:
   - Check file size (max 10MB)
   - Verify file type is supported
   - Check backend logs for errors

2. **Scraping Fails**:
   - Check internet connection
   - Verify target sites are accessible
   - Check for rate limiting

3. **Index Build Fails**:
   - Check OpenAI API key
   - Verify sufficient disk space
   - Check for corrupted data files

4. **Poor Query Results**:
   - Rebuild index with latest data
   - Check data quality
   - Verify query relevance

### Debug Commands

```bash
# Test data loader
python -c "from enhanced_data_loader import EnhancedDataLoader; loader = EnhancedDataLoader(); print(loader.get_document_stats())"

# Test RAG pipeline
python -c "from enhanced_rag_pipeline import EnhancedRAGPipeline; rag = EnhancedRAGPipeline(); print(rag.get_stats())"

# Test web scraper
python -c "from web_scraper import scrape_atlan_docs; print(scrape_atlan_docs())"
```

## Conclusion

The file upload and web scraping system provides a comprehensive knowledge base that can:
- Accept user-uploaded files
- Automatically scrape documentation
- Process multiple data sources
- Provide intelligent responses
- Scale with additional content

This system makes the Atlan AI assistant much more powerful and capable of handling a wide variety of user queries with up-to-date information from multiple sources.
