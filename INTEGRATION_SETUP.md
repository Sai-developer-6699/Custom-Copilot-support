# Frontend-Backend Integration Setup

This document explains how to run the integrated Atlan AI application with both frontend and backend services.

## Prerequisites

- Python 3.8+ installed
- Node.js 16+ installed
- npm or yarn package manager

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

The backend will be available at: http://localhost:8000

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```

The frontend will be available at: http://localhost:3000

## Quick Start (Both Services)

### Windows
Run the batch file:
```bash
start-dev.bat
```

Or run the PowerShell script:
```powershell
.\start-dev.ps1
```

### Manual Start
1. Open two terminal windows
2. In the first terminal, start the backend (see Backend Setup)
3. In the second terminal, start the frontend (see Frontend Setup)

## API Integration

The frontend is configured to communicate with the backend through:

- **Proxy Configuration**: Vite is configured to proxy `/api/*` requests to `http://localhost:8000`
- **API Service**: Located at `frontend/src/services/api.js`
- **CORS**: Backend has CORS middleware enabled for cross-origin requests

### Available Endpoints

- `GET /` - Health check
- `POST /classify` - Classify a ticket
- `POST /rag` - Get RAG response with classification

### API Usage Example

```javascript
import { apiService } from './services/api';

// Classify a ticket
const classification = await apiService.classifyTicket("I need help with login");

// Get RAG response
const response = await apiService.getRAGResponse("How do I reset my password?");
```

## Configuration

### Backend Configuration
- **Port**: 8000 (configurable in main.py)
- **CORS**: Enabled for all origins (configured in main.py)
- **Dependencies**: Listed in requirements.txt

### Frontend Configuration
- **Port**: 3000 (configurable in vite.config.js)
- **Proxy**: Configured to forward /api requests to backend
- **Dependencies**: Listed in package.json

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the backend is running and CORS middleware is properly configured
2. **Connection Refused**: Check that both services are running on the correct ports
3. **Module Not Found**: Ensure all dependencies are installed in both frontend and backend

### Debugging

1. Check browser console for frontend errors
2. Check backend terminal for server errors
3. Verify API endpoints are accessible at http://localhost:8000/docs (FastAPI auto-generated docs)

## File Structure

```
Atlan-AI/
├── backend/
│   ├── main.py              # FastAPI application with CORS
│   ├── requirements.txt     # Python dependencies
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   │   └── api.js       # API service for backend communication
│   │   └── components/
│   │       └── chat/
│   │           └── ResponseModal.jsx  # Updated to use real API
│   ├── vite.config.js       # Vite configuration with proxy
│   └── package.json         # Node.js dependencies
├── start-dev.bat            # Windows batch script
├── start-dev.ps1            # PowerShell script
└── .gitignore               # Updated with Python patterns
```

## Next Steps

1. Test the integration by opening the frontend and submitting a query
2. Check the ResponseModal to see real API responses
3. Monitor both terminal windows for any errors
4. Customize the API endpoints and frontend components as needed
