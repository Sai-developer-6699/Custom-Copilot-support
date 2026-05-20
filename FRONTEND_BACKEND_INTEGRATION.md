# Frontend-Backend Integration Documentation

This document explains the complete integration between the frontend ChatSidebar input and the BackendTerminal display system.

## Architecture Overview

The integration uses a React Context pattern to manage backend communication state and provides real-time logging and response handling.

### Key Components

1. **BackendContext** - Central state management for backend communication
2. **ChatSidebar** - Input component that sends queries to backend
3. **BackendTerminal** - Display component that shows real-time backend logs
4. **ResponseModal** - Modal that displays the final AI response
5. **App.jsx** - Main component that orchestrates the data flow

## Data Flow

```
User Input (ChatSidebar) 
    ↓
BackendContext.processQuery()
    ↓
API Service (api.js)
    ↓
Backend API (FastAPI)
    ↓
Response + Logs (BackendTerminal)
    ↓
Final Display (ResponseModal)
```

## Component Details

### BackendContext (`frontend/src/contexts/BackendContext.jsx`)

**Purpose**: Central state management for all backend communication

**Key Features**:
- Manages logs array with different types (user, system, api, error, escalation, response)
- Provides `processQuery()` function that handles the complete backend flow
- Real-time log updates during processing
- Error handling and logging

**State**:
```javascript
{
  logs: [],           // Array of log entries
  isProcessing: false, // Processing state
  lastResponse: null,  // Last API response
}
```

**Methods**:
- `processQuery(query)` - Main function to process user queries
- `addLog(message, level, type)` - Add log entries
- `clearLogs()` - Clear all logs
- `getLogsByType(type)` - Filter logs by type

### ChatSidebar (`frontend/src/components/chat/ChatSidebar.jsx`)

**Purpose**: User input interface that sends queries to backend

**Key Features**:
- Real-time query processing through BackendContext
- Loading states during processing
- Error handling and display
- File attachment support
- Chat history management

**Integration**:
- Uses `useBackend()` hook to access context
- Calls `processQuery()` on form submission
- Updates chat messages with real responses
- Passes response data to parent component

### BackendTerminal (`frontend/src/components/terminal/BackendTerminal.jsx`)

**Purpose**: Real-time display of backend processing logs

**Key Features**:
- Live log display with different types and colors
- Filter controls (All, User, System, API, Errors, Escalations, Responses)
- Processing status indicator
- Clear logs functionality
- Minimize/maximize functionality

**Log Types**:
- **USER** (Blue) - User queries and actions
- **SYSTEM** (Cyan) - System initialization and status
- **API** (Green) - API calls and responses
- **ERROR** (Red) - Error messages and exceptions
- **ESCALATION** (Orange) - High priority ticket escalations
- **RESPONSE** (Purple) - AI-generated responses

### ResponseModal (`frontend/src/components/chat/ResponseModal.jsx`)

**Purpose**: Display the final AI analysis and response

**Key Features**:
- Uses response data passed from parent (no duplicate API calls)
- Displays classification results (topic, sentiment, priority)
- Shows AI-generated response with sources
- Fallback to API call if no response provided

## Usage Example

### 1. User Input Flow

```javascript
// User types in ChatSidebar
const handleSubmit = async (e) => {
  // Process query through BackendContext
  const response = await processQuery(userQuery);
  
  // Update chat with response
  setMessages(prev => [...prev, responseMessage]);
  
  // Pass to ResponseModal
  onSubmit(userQuery, response);
};
```

### 2. Backend Processing

```javascript
// BackendContext.processQuery()
const processQuery = async (query) => {
  addLog(`Processing query: "${query}"`, 'INFO', 'user');
  
  // Classification
  const classification = await apiService.classifyTicket(query);
  addLog(`Classification: ${JSON.stringify(classification)}`, 'INFO', 'system');
  
  // RAG Response
  const response = await apiService.getRAGResponse(query);
  addLog(`Response generated successfully`, 'INFO', 'response');
  
  return response;
};
```

### 3. Terminal Display

```javascript
// BackendTerminal shows real-time logs
{filteredLogs.map((log) => (
  <div key={log.id}>
    <span className={getLevelColor(log.level)}>[{log.level}]</span>
    <span className={getTypeColor(log.type)}>[{log.type}]</span>
    <span>{log.message}</span>
  </div>
))}
```

## Configuration

### Environment Variables

```bash
# Frontend (.env)
VITE_BACKEND_URL=http://localhost:8000
```

### API Proxy Configuration

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
```

## Error Handling

### Frontend Error Handling

1. **API Errors**: Caught in BackendContext and logged
2. **Network Errors**: Displayed in ChatSidebar and terminal
3. **Processing Errors**: Shown in terminal with ERROR level

### Backend Error Handling

1. **CORS**: Configured in FastAPI main.py
2. **Validation**: Pydantic models for request validation
3. **Logging**: All operations logged with appropriate levels

## Testing the Integration

### 1. Start Both Services

```bash
# Terminal 1 - Backend
cd backend
python -m uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Test Flow

1. Open frontend at `http://localhost:3000`
2. Open BackendTerminal (click terminal icon)
3. Type a query in ChatSidebar
4. Watch real-time logs in BackendTerminal
5. View final response in ResponseModal

### 3. Expected Behavior

- **Input**: User types "How do I reset my password?"
- **Terminal Logs**:
  ```
  [INFO] [USER] Processing query: "How do I reset my password?"
  [INFO] [SYSTEM] Starting ticket classification...
  [INFO] [SYSTEM] Classification completed: {"topic": "How-to", "priority": "P2"}
  [INFO] [SYSTEM] Generating RAG response...
  [INFO] [RESPONSE] Response generated successfully
  ```
- **Response**: Modal shows classification and AI-generated answer

## Troubleshooting

### Common Issues

1. **No logs appearing**: Check if BackendContext is properly wrapped around App
2. **API errors**: Verify backend is running and CORS is configured
3. **Slow responses**: Check network tab for API call timing
4. **Missing responses**: Ensure response is passed from ChatSidebar to ResponseModal

### Debug Steps

1. Check browser console for errors
2. Verify BackendTerminal shows processing logs
3. Check Network tab for API calls
4. Verify backend logs in terminal

## Future Enhancements

1. **WebSocket Integration**: Real-time updates without polling
2. **Log Persistence**: Save logs to localStorage or database
3. **Advanced Filtering**: More granular log filtering options
4. **Performance Metrics**: Display processing times and performance data
5. **Error Recovery**: Automatic retry mechanisms for failed requests
