import React, { createContext, useContext, useState, useCallback } from 'react';

const TicketContext = createContext();

export const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
};

export const TicketProvider = ({ children }) => {
  const [tickets, setTickets] = useState([]);
  const [nextTicketNumber, setNextTicketNumber] = useState(1);

  const generateTicketNumber = useCallback(() => {
    const year = new Date().getFullYear();
    const ticketNum = `TKT-${year}-${String(nextTicketNumber).padStart(3, '0')}`;
    setNextTicketNumber(prev => prev + 1);
    return ticketNum;
  }, [nextTicketNumber]);

  const createTicket = useCallback((query, response) => {
    const ticketNumber = generateTicketNumber();
    const analysis = response.analysis || {};
    
    const newTicket = {
      id: Date.now(),
      ticketNumber,
      query: query,
      topic: analysis.topic || 'General Inquiry',
      sentiment: analysis.sentiment || 'Neutral',
      priority: analysis.priority || 'P3',
      response: response.answer || 'No response generated',
      fullResponse: response, // Store complete response for modal
      createdAt: new Date().toISOString(),
      status: 'Resolved',
      sources: response.sources || []
    };

    setTickets(prev => [newTicket, ...prev]); // Add to beginning of list
    return newTicket;
  }, [generateTicketNumber]);

  const updateTicket = useCallback((ticketId, updates) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === ticketId 
        ? { ...ticket, ...updates }
        : ticket
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
    setNextTicketNumber(1);
  }, []);

  const getTicketStats = useCallback(() => {
    const total = tickets.length;
    const byStatus = tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});
    
    const byPriority = tickets.reduce((acc, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
      return acc;
    }, {});

    const bySentiment = tickets.reduce((acc, ticket) => {
      acc[ticket.sentiment] = (acc[ticket.sentiment] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      byStatus,
      byPriority,
      bySentiment
    };
  }, [tickets]);

  const value = {
    tickets,
    createTicket,
    updateTicket,
    deleteTicket,
    getTicketById,
    getTicketsByStatus,
    getTicketsByPriority,
    clearAllTickets,
    getTicketStats
  };

  return (
    <TicketContext.Provider value={value}>
      {children}
    </TicketContext.Provider>
  );
};
