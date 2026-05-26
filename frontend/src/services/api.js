import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api', // This will be proxied to http://localhost:8000
  timeout: 120000, // 120 seconds timeout to accommodate Render Free Tier cold starts (50-90s)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`Response received from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error('Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Health check
  async healthCheck() {
    try {
      const response = await api.get('/');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  },

  // Classify ticket
  async classifyTicket(text) {
    try {
      const response = await api.post('/classify', { text });
      return response.data;
    } catch (error) {
      throw new Error(`Classification failed: ${error.message}`);
    }
  },

  // Get RAG response — optionally include OCR'd image fileIds
  async getRAGResponse(text, fileIds = [], sessionId = null) {
    try {
      const response = await api.post('/rag', { text, file_ids: fileIds, session_id: sessionId });
      return response.data;
    } catch (error) {
      throw new Error(`RAG response failed: ${error.message}`);
    }
  },

  async streamRAGResponse(text, fileIds = [], sessionId = null, onChunk = () => {}) {
    try {
      const response = await fetch('/api/rag/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, file_ids: fileIds, session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Streaming response body is not available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResponse = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const event = JSON.parse(trimmed);
          if (event.type === 'chunk') {
            onChunk(event.delta || '');
          } else if (event.type === 'done') {
            finalResponse = event.response;
          }
        }
      }

      const trailingLine = buffer.trim();
      if (trailingLine) {
        const event = JSON.parse(trailingLine);
        if (event.type === 'chunk') {
          onChunk(event.delta || '');
        } else if (event.type === 'done') {
          finalResponse = event.response;
        }
      }

      if (!finalResponse) {
        throw new Error('Stream completed without a final response');
      }

      return finalResponse;
    } catch (error) {
      throw new Error(`Streamed RAG response failed: ${error.message}`);
    }
  },

  // Fetch all tickets from the database
  async getTickets(skip = 0, limit = 100) {
    try {
      const response = await api.get(`/tickets?skip=${skip}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch tickets: ${error.message}`);
    }
  },

  // Fetch a single ticket by ticket number
  async getTicket(ticketNumber) {
    try {
      const response = await api.get(`/tickets/${ticketNumber}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch ticket ${ticketNumber}: ${error.message}`);
    }
  },
};

export default api;
