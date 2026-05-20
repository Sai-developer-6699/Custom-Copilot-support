import React, { useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/layout/Header";
import TicketTable from "./components/tickets/TicketTable";
import ChatSidebar from "./components/chat/ChatSidebar";
import ResponseModal from "./components/chat/ResponseModal";
import BackendTerminal from "./components/terminal/BackendTerminal";
import TerminalToggle from "./components/terminal/TerminalToggle";
import { Toaster } from "./components/ui/toaster";
import { BackendProvider } from "./contexts/BackendContext";
import { TicketProvider } from "./contexts/TicketContext";

const Dashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentResponse, setCurrentResponse] = useState(null);
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);
  const [isChatSidebarVisible, setIsChatSidebarVisible] = useState(false);

  const handleQuerySubmit = (query, response = null) => {
    setCurrentQuery(query);
    setCurrentResponse(response);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setCurrentQuery('');
    setCurrentResponse(null);
  };

  const handleTicketClick = (ticket) => {
    setCurrentQuery(ticket.query);
    setCurrentResponse(ticket.fullResponse);
    setIsModalOpen(true);
  };

  const toggleTerminal = () => {
    setIsTerminalVisible(!isTerminalVisible);
  };

  const toggleChatSidebar = () => {
    setIsChatSidebarVisible(!isChatSidebarVisible);
  };


  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-500/30 selection:text-blue-200">
      {/* Header */}
      <Header />
      
      {/* Main Layout */}
      <div className="flex relative">
        {/* Main Content */}
        <div className="flex-1 min-w-0 lg:pr-96">
          <main className="px-4 sm:px-6 py-8 max-w-7xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-400 bg-clip-text text-transparent tracking-tight mb-2">
                  Support Tickets Dashboard
                </h2>
                <p className="text-zinc-400 text-sm">
                  Monitor and analyze customer support interactions with AI-powered insights.
                </p>
              </div>
              {/* Mobile Chat Toggle Button */}
              <button
                onClick={toggleChatSidebar}
                className="lg:hidden fixed bottom-6 right-6 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-3.5 rounded-full shadow-xl shadow-blue-500/30 z-50 transition-all duration-200 hover:scale-105"
                title="Open AI Assistant"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            </div>
            
            <TicketTable onTicketClick={handleTicketClick} />
          </main>
        </div>

        {/* Chat Sidebar */}
        <div className="lg:block">
          <ChatSidebar onSubmit={handleQuerySubmit} onClose={toggleChatSidebar} isOpen={isChatSidebarVisible} />
        </div>
        
        {/* Mobile Overlay */}
        {isChatSidebarVisible && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={toggleChatSidebar}
          />
        )}
      </div>
      
      {/* Terminal Toggle Button */}
      <TerminalToggle isVisible={isTerminalVisible} onToggle={toggleTerminal} />
      
      {/* Backend Terminal */}
      <BackendTerminal isVisible={isTerminalVisible} onToggle={toggleTerminal} />
      
      <ResponseModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        query={currentQuery}
        response={currentResponse}
      />
      
      <Toaster />
    </div>
  );
};

function App() {
  return (
    <div className="App dark bg-zinc-950 min-h-screen">
      <TicketProvider>
        <BackendProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
            </Routes>
          </BrowserRouter>
        </BackendProvider>
      </TicketProvider>
    </div>
  );
}

export default App;
