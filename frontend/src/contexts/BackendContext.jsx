import React, { createContext, useContext, useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { useTickets } from './TicketContext';

const BackendContext = createContext();

export const useBackend = () => {
  const context = useContext(BackendContext);
  if (!context) {
    throw new Error('useBackend must be used within a BackendProvider');
  }
  return context;
};

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const BackendProvider = ({ children }) => {
  const [sessionId] = useState(() => {
    try {
      const existingSessionId = localStorage.getItem('atlan_chat_session_id');
      if (existingSessionId) {
        return existingSessionId;
      }
      const newSessionId = generateUUID();
      localStorage.setItem('atlan_chat_session_id', newSessionId);
      return newSessionId;
    } catch {
      return generateUUID();
    }
  });
  const [logs, setLogs] = useState([
    {
      id: 1,
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'Backend context initialized',
      type: 'system'
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const { addTicketFromResponse } = useTickets();

  const addLog = useCallback((message, level = 'INFO', type = 'api') => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      level,
      message,
      type
    };
    setLogs(prev => [...prev.slice(-50), newLog]); // Keep last 50 logs
  }, []);

  const processQuery = useCallback(async (query, fileIds = [], options = {}) => {
    if (!query.trim()) return null;

    setIsProcessing(true);
    addLog(`Processing query: "${query}"`, 'INFO', 'user');
    const onChunk = typeof options.onChunk === 'function' ? options.onChunk : null;

    try {
      // Add classification log
      addLog('Starting ticket classification...', 'INFO', 'system');
      const classification = await apiService.classifyTicket(query);
      addLog(`Classification completed: ${JSON.stringify(classification)}`, 'INFO', 'system');

      // Add RAG processing log
      addLog('Generating RAG response...', 'INFO', 'system');
      if (fileIds.length > 0) {
        addLog(`Including OCR text from ${fileIds.length} screenshot(s)`, 'INFO', 'system');
      }
      const response = await apiService.streamRAGResponse(
        query,
        fileIds,
        sessionId,
        (chunk) => {
          if (onChunk) {
            onChunk(chunk);
          }
        }
      );
      addLog(`RAG response generated successfully`, 'INFO', 'system');

      // Log the response details
      addLog(`Response: ${response.answer.substring(0, 100)}...`, 'INFO', 'response');
      
      if (response.analysis?.priority === 'P0') {
        addLog('HIGH PRIORITY ticket detected - escalating to human agent', 'WARN', 'escalation');
      }

      // Add ticket to local state (already persisted to DB by backend /rag)
      const ticket = addTicketFromResponse(query, response);
      addLog(`Ticket created: ${ticket.ticketNumber}`, 'INFO', 'system');

      setLastResponse(response);
      return response;

    } catch (error) {
      addLog(`Error processing query: ${error.message}`, 'ERROR', 'error');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setLogs([
      {
        id: 1,
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'Logs cleared',
        type: 'system'
      }
    ]);
  }, []);

  const getLogsByType = useCallback((type) => {
    return logs.filter(log => log.type === type);
  }, [logs]);

  const value = {
    logs,
    isProcessing,
    lastResponse,
    sessionId,
    addLog,
    processQuery,
    clearLogs,
    getLogsByType
  };

  return (
    <BackendContext.Provider value={value}>
      {children}
    </BackendContext.Provider>
  );
};
