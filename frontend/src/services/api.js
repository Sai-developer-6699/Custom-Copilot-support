import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api', // This will be proxied to http://localhost:8000
  timeout: 30000, // 30 seconds timeout
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

  // Get RAG response
  async getRAGResponse(text) {
    try {
      const response = await api.post('/rag', { text });
      return response.data;
    } catch (error) {
      throw new Error(`RAG response failed: ${error.message}`);
    }
  },
};

export default api;
