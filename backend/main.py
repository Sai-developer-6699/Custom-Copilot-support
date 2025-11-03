
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from enhanced_rag_pipeline import generate_answer, rebuild_index, load_index
from classifier import classify_ticket
import os
import uuid
import aiofiles
from pathlib import Path
import mimetypes


app = FastAPI()

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    text: str

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Allowed file types
ALLOWED_TYPES = {
    'text/plain', 'text/csv', 'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json', 'text/markdown', 'image/jpeg', 'image/png', 'image/gif'
}

@app.get("/")
def root():
    return {"message": "✅ Customer Support Copilot Backend running"}

# ---- File Upload Endpoint ----
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Validate file type
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=400, 
                detail=f"File type {file.content_type} not allowed"
            )
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix
        filename = f"{file_id}{file_extension}"
        file_path = UPLOAD_DIR / filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Process file content based on type
        processed_content = await process_uploaded_file(file_path, file.content_type)
        
        return {
            "fileId": file_id,
            "filename": file.filename,
            "filePath": str(file_path),
            "contentType": file.content_type,
            "size": len(content),
            "content": processed_content
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def process_uploaded_file(file_path: Path, content_type: str) -> str:
    """Process uploaded file and extract text content"""
    try:
        if content_type.startswith('text/'):
            # Handle text files
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                return await f.read()
        
        elif content_type == 'application/json':
            # Handle JSON files
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                content = await f.read()
                import json
                data = json.loads(content)
                return json.dumps(data, indent=2)
        
        elif content_type == 'application/pdf':
            # Handle PDF files (requires PyPDF2 or similar)
            try:
                import PyPDF2
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    text = ""
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
                    return text
            except ImportError:
                return "PDF processing not available. Please install PyPDF2."
        
        elif content_type.startswith('image/'):
            # Handle images (basic info for now)
            return f"Image file: {file_path.name} (OCR processing not implemented yet)"
        
        else:
            # For other file types, return basic info
            return f"File uploaded: {file_path.name} (Content extraction not implemented for this file type)"
            
    except Exception as e:
        return f"Error processing file: {str(e)}"

# ---- Classification Endpoint ----
@app.post("/classify")
def classify(req: QueryRequest):
    return classify_ticket(req.text)

# ---- RAG Endpoint with escalation ----
@app.post("/rag")
def rag_endpoint(req: QueryRequest):
    # Step 1: classify the ticket
    cls = classify_ticket(req.text)

    # Step 2: if priority is P0 → escalate to human
    if cls["priority"] == "P0":
        return {
            "query": req.text,
            "analysis": cls,
            "answer": "⚠️ This ticket has been marked HIGH PRIORITY (P0). Redirecting to a human support agent immediately.",
            "sources": []
        }

    # Step 3: if topic is not eligible for RAG → just route
    if cls["topic"] not in ["How-to", "Product", "API/SDK", "SSO", "Best practices"]:
        return {
            "query": req.text,
            "analysis": cls,
            "answer": f"This ticket has been classified as '{cls['topic']}' and routed to the appropriate team.",
            "sources": []
        }
    if cls["topic"] == "unknown":
        return{
            "query": req.text,
            "analysis" : cls,
            "answer" : "❌ Sorry, I couldn’t understand your request. Please refine your question.",    
            "sources" : []
        }

    # Step 4: run normal RAG pipeline
    result = generate_answer(req.text)
    return {
        "query": req.text,
        "analysis": cls,
        "answer": result["answer"],
        "sources": result["sources"]
    }

# ---- Index Management Endpoints ----
@app.post("/rebuild-index")
def rebuild_knowledge_index():
    """Rebuild the knowledge base index with all available data"""
    try:
        rebuild_index()
        return {"message": "Knowledge base index rebuilt successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scrape-docs")
def scrape_documentation():
    """Scrape Atlan documentation and rebuild index"""
    try:
        from web_scraper import scrape_atlan_docs
        result = scrape_atlan_docs()
        rebuild_index()  # Rebuild index with new data
        return {
            "message": "Documentation scraped and index rebuilt successfully",
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/index-stats")
def get_index_stats():
    """Get statistics about the knowledge base index"""
    try:
        from enhanced_rag_pipeline import rag_pipeline
        stats = rag_pipeline.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
