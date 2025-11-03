# Ticket Management System Documentation

This document explains the complete ticket management system that integrates with the query processing workflow.

## Overview

The ticket management system automatically creates tickets when users submit queries through the ChatSidebar, stores the complete backend response, and allows users to view detailed responses by clicking on tickets in the TicketTable.

## Architecture

### Components

1. **TicketContext** - Central state management for tickets
2. **BackendContext** - Creates tickets when queries are processed
3. **TicketTable** - Displays tickets with clickable response column
4. **ChatSidebar** - Shows responses in chat after processing
5. **ResponseModal** - Displays detailed ticket information

### Data Flow

```
User Query (ChatSidebar) 
    ↓
Backend Processing (BackendContext)
    ↓
Ticket Creation (TicketContext)
    ↓
Response Display (ChatSidebar + TicketTable)
    ↓
Detailed View (ResponseModal on click)
```

## Component Details

### TicketContext (`frontend/src/contexts/TicketContext.jsx`)

**Purpose**: Central state management for all ticket operations

**Key Features**:
- Automatic ticket number generation (TKT-YYYY-XXX format)
- Complete ticket lifecycle management
- Ticket statistics and filtering
- Integration with backend responses

**State**:
```javascript
{
  tickets: [],           // Array of ticket objects
  nextTicketNumber: 1    // Counter for ticket numbering
}
```

**Ticket Object Structure**:
```javascript
{
  id: number,                    // Unique ticket ID
  ticketNumber: string,          // Formatted ticket number (TKT-2024-001)
  query: string,                 // Original user query
  topic: string,                 // Classified topic
  sentiment: string,             // Detected sentiment
  priority: string,              // Priority level (P0, P1, P2, P3)
  response: string,              // Truncated response for table display
  fullResponse: object,          // Complete backend response
  createdAt: string,             // ISO timestamp
  status: string,                // Ticket status
  sources: array                 // Response sources
}
```

**Methods**:
- `createTicket(query, response)` - Create new ticket from query and response
- `updateTicket(ticketId, updates)` - Update existing ticket
- `deleteTicket(ticketId)` - Remove ticket
- `getTicketById(ticketId)` - Retrieve specific ticket
- `getTicketsByStatus(status)` - Filter tickets by status
- `getTicketsByPriority(priority)` - Filter tickets by priority
- `clearAllTickets()` - Remove all tickets
- `getTicketStats()` - Get ticket statistics

### BackendContext Integration

**Ticket Creation Process**:
```javascript
const processQuery = async (query) => {
  // ... backend processing ...
  
  // Create ticket with the response
  const ticket = createTicket(query, response);
  addLog(`Ticket created: ${ticket.ticketNumber}`, 'INFO', 'system');
  
  return response;
};
```

**Automatic Features**:
- Tickets created automatically for every processed query
- Complete backend response stored in ticket
- Ticket creation logged in BackendTerminal
- Integration with existing logging system

### TicketTable (`frontend/src/components/tickets/TicketTable.jsx`)

**Purpose**: Display tickets in a table format with interactive response column

**Key Features**:
- Real-time ticket display from TicketContext
- Clickable response column with eye icon
- Priority and sentiment color coding
- Empty state with helpful message
- Responsive design with hover effects

**Interactive Elements**:
- **Response Column**: Clickable with eye icon indicator
- **Priority Badges**: Color-coded (P0=Red, P1=Yellow, P2/P3=Green)
- **Sentiment Badges**: Color-coded (Positive=Green, Negative=Red, Neutral=Gray)
- **Hover Effects**: Visual feedback on interaction

**Empty State**:
- Shows when no tickets exist
- Encourages user to submit first query
- Clean, friendly design

### ChatSidebar Integration

**Response Display**:
- Shows full AI response in chat after processing
- Updates thinking message with actual response
- Maintains chat history with responses
- Error handling for failed requests

**Current Implementation**:
```javascript
// Update thinking message with actual response
setMessages(prev => prev.map(msg => 
  msg.id === thinkingMessage.id 
    ? {
        ...msg,
        content: response.answer,
        isThinking: false,
        response: response
      }
    : msg
));
```

### ResponseModal Integration

**Ticket Click Handling**:
- Opens modal with ticket's original query
- Displays complete backend response
- Shows classification and analysis details
- Maintains same UI as direct query responses

**Implementation**:
```javascript
const handleTicketClick = (ticket) => {
  setCurrentQuery(ticket.query);
  setCurrentResponse(ticket.fullResponse);
  setIsModalOpen(true);
};
```

## Usage Workflow

### 1. Query Submission

1. User types query in ChatSidebar
2. Query sent to BackendContext.processQuery()
3. Backend processes query and returns response
4. Ticket automatically created with response
5. Response displayed in chat
6. Ticket appears in TicketTable

### 2. Ticket Management

1. View all tickets in TicketTable
2. Click on response column to view details
3. ResponseModal opens with complete information
4. View classification, sentiment, priority, and full response

### 3. Ticket Information

**Displayed in Table**:
- Serial number
- Ticket number (TKT-YYYY-XXX)
- Topic classification
- Sentiment analysis
- Priority level
- Truncated response preview

**Displayed in Modal**:
- Original query
- Complete AI response
- Classification details
- Sources and references
- Processing information

## Configuration

### Provider Setup

```javascript
// App.jsx
<TicketProvider>
  <BackendProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  </BackendProvider>
</TicketProvider>
```

### Component Integration

```javascript
// Dashboard.jsx
const handleTicketClick = (ticket) => {
  setCurrentQuery(ticket.query);
  setCurrentResponse(ticket.fullResponse);
  setIsModalOpen(true);
};

// TicketTable with click handler
<TicketTable onTicketClick={handleTicketClick} />
```

## Features

### Automatic Ticket Creation

- **Trigger**: Every successful query processing
- **Data**: Complete backend response stored
- **Numbering**: Sequential ticket numbers (TKT-2024-001, TKT-2024-002, etc.)
- **Classification**: Automatic topic, sentiment, and priority assignment

### Real-time Updates

- **Table**: Updates immediately when new tickets created
- **Chat**: Shows response in chat after processing
- **Terminal**: Logs ticket creation process
- **Modal**: Opens with complete ticket information

### Data Persistence

- **Memory**: Tickets stored in React state
- **Session**: Persists during browser session
- **Reset**: Clears on page refresh (can be extended to localStorage)

## Error Handling

### Query Processing Errors

- **Backend Errors**: Logged in terminal, error shown in chat
- **Network Errors**: Graceful fallback with error messages
- **Validation Errors**: Handled by backend API

### Ticket Creation Errors

- **Context Errors**: Fallback to error logging
- **Data Validation**: Ensures required fields present
- **Duplicate Prevention**: Unique IDs prevent conflicts

## Testing the System

### 1. Start Services

```bash
# Backend
cd backend
python -m uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm run dev
```

### 2. Test Workflow

1. **Submit Query**: Type a query in ChatSidebar
2. **Watch Processing**: Monitor BackendTerminal for logs
3. **Check Chat**: Verify response appears in chat
4. **View Table**: See new ticket in TicketTable
5. **Click Response**: Click on response column
6. **View Details**: Verify ResponseModal opens with complete info

### 3. Expected Behavior

**Query**: "How do I reset my password?"

**Backend Logs**:
```
[INFO] [USER] Processing query: "How do I reset my password?"
[INFO] [SYSTEM] Starting ticket classification...
[INFO] [SYSTEM] Classification completed: {"topic": "Login Issue", "priority": "P2"}
[INFO] [SYSTEM] Generating RAG response...
[INFO] [RESPONSE] Response generated successfully
[INFO] [SYSTEM] Ticket created: TKT-2024-001
```

**Chat Display**:
- User message: "How do I reset my password?"
- AI response: Full password reset instructions

**Ticket Table**:
- New row with ticket TKT-2024-001
- Topic: "Login Issue"
- Priority: "P2"
- Clickable response preview

**Response Modal** (on click):
- Original query
- Complete AI response
- Classification details
- Sources and references

## Future Enhancements

### Data Persistence
- **localStorage**: Save tickets across browser sessions
- **Database**: Backend storage for ticket persistence
- **Export**: CSV/JSON export functionality

### Advanced Features
- **Ticket Status**: Open, In Progress, Resolved, Closed
- **Assignments**: Assign tickets to support agents
- **Comments**: Add comments and updates to tickets
- **Search**: Search and filter tickets
- **Bulk Operations**: Select and manage multiple tickets

### Analytics
- **Metrics**: Response times, resolution rates
- **Trends**: Topic distribution, sentiment analysis
- **Reports**: Generate ticket reports and insights

### Integration
- **Email**: Send ticket notifications
- **Slack**: Integration with team channels
- **CRM**: Connect with customer relationship management
- **API**: External ticket management systems

## Troubleshooting

### Common Issues

1. **Tickets not appearing**: Check if TicketProvider wraps BackendProvider
2. **Click not working**: Verify onTicketClick prop passed to TicketTable
3. **Response not showing**: Check if response is properly stored in ticket
4. **Modal not opening**: Ensure handleTicketClick is properly implemented

### Debug Steps

1. Check browser console for errors
2. Verify context providers are properly nested
3. Check BackendTerminal for ticket creation logs
4. Inspect ticket data in React DevTools
5. Verify click handlers are properly bound

## Conclusion

The ticket management system provides a complete workflow for handling user queries, from initial submission through backend processing to ticket creation and detailed response viewing. The system is designed to be intuitive, real-time, and easily extensible for future enhancements.
