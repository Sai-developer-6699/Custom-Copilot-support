import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/api';

const TicketContext = createContext();

export const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
};

export const TicketProvider = ({ children }) => {
  // Seed from localStorage instantly so the UI isn't empty while DB loads
  const [tickets, setTickets] = useState(() => {
    try {
      const saved = localStorage.getItem('atlan_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // ---- Load tickets from DB on mount ----
  const fetchTicketsFromDB = useCallback(async () => {
    setIsLoadingTickets(true);
    try {
      const dbTickets = await apiService.getTickets();
      setTickets(dbTickets);
      // Update localStorage cache
      localStorage.setItem('atlan_tickets', JSON.stringify(dbTickets));
    } catch (err) {
      console.warn('Could not reach backend — showing cached tickets:', err.message);
      // Keep localStorage data — already loaded in useState initializer above
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    fetchTicketsFromDB();
  }, [fetchTicketsFromDB]);

  // ---- Optimistically add a ticket after a RAG response ----
  // The ticket is already saved to DB by the backend /rag endpoint.
  // We just add it to local state so the UI updates immediately without re-fetching.
  const addTicketFromResponse = useCallback((query, response) => {
    const newTicket = {
      id:           response.ticketId   || Date.now(),
      ticketNumber: response.ticketNumber || `TKT-LOCAL-${Date.now()}`,
      query:        query,
      topic:        response.analysis?.topic     || 'General Inquiry',
      sentiment:    response.analysis?.sentiment || 'Neutral',
      priority:     response.analysis?.priority  || 'P2',
      status:       'Resolved',
      response:     response.answer || 'No response generated',
      fullResponse: response,
      sources:      response.sources || [],
      createdAt:    new Date().toISOString(),
    };

    setTickets(prev => {
      const updated = [newTicket, ...prev];
      try { localStorage.setItem('atlan_tickets', JSON.stringify(updated)); } catch {}
      return updated;
    });

    return newTicket;
  }, []);

  const updateTicket = useCallback((ticketId, updates) => {
    setTickets(prev => prev.map(ticket =>
      ticket.id === ticketId ? { ...ticket, ...updates } : ticket
    ));
  }, []);

  const deleteTicket = useCallback((ticketId) => {
    setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
  }, []);

  const getTicketById = useCallback((ticketId) => {
    return tickets.find(ticket => ticket.id === ticketId);
  }, [tickets]);

  const getTicketsByStatus = useCallback((status) => {
    return tickets.filter(ticket => ticket.status === status);
  }, [tickets]);

  const getTicketsByPriority = useCallback((priority) => {
    return tickets.filter(ticket => ticket.priority === priority);
  }, [tickets]);

  const clearAllTickets = useCallback(() => {
    setTickets([]);
    localStorage.removeItem('atlan_tickets');
    localStorage.removeItem('atlan_ticket_counter');
  }, []);

  const getTicketStats = useCallback(() => {
    const total = tickets.length;
    const byStatus   = tickets.reduce((acc, t) => { acc[t.status]    = (acc[t.status]    || 0) + 1; return acc; }, {});
    const byPriority = tickets.reduce((acc, t) => { acc[t.priority]  = (acc[t.priority]  || 0) + 1; return acc; }, {});
    const bySentiment = tickets.reduce((acc, t) => { acc[t.sentiment] = (acc[t.sentiment] || 0) + 1; return acc; }, {});
    return { total, byStatus, byPriority, bySentiment };
  }, [tickets]);

  const value = {
    tickets,
    isLoadingTickets,
    addTicketFromResponse,
    fetchTicketsFromDB,
    updateTicket,
    deleteTicket,
    getTicketById,
    getTicketsByStatus,
    getTicketsByPriority,
    clearAllTickets,
    getTicketStats,
  };

  return (
    <TicketContext.Provider value={value}>
      {children}
    </TicketContext.Provider>
  );
};
