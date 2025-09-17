import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/layout/Header";
import TicketTable from "./components/tickets/TicketTable";
import ChatSidebar from "./components/chat/ChatSidebar";
import ResponseModal from "./components/chat/ResponseModal";
import BackendTerminal from "./components/terminal/BackendTerminal";
import TerminalToggle from "./components/terminal/TerminalToggle";
import { Toaster } from "./components/ui/toaster";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);
  const [isChatSidebarVisible, setIsChatSidebarVisible] = useState(false);

  const handleQuerySubmit = (query) => {
    setCurrentQuery(query);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setCurrentQuery('');
  };

  const toggleTerminal = () => {
    setIsTerminalVisible(!isTerminalVisible);
  };

  const toggleChatSidebar = () => {
    setIsChatSidebarVisible(!isChatSidebarVisible);
  };

  // Test backend connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await axios.get(`${API}/`);
        console.log('Backend connected:', response.data.message);
      } catch (e) {
        console.error('Backend connection failed:', e);
      }
    };
    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />
      
      {/* Main Layout */}
      <div className="flex relative">
        {/* Main Content */}
        <div className="flex-1 min-w-0 lg:pr-96">
          <main className="px-4 sm:px-6 py-8 max-w-7xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Support Tickets Dashboard
                </h2>
                <p className="text-gray-600">
                  Monitor and analyze customer support interactions with AI-powered insights.
                </p>
              </div>
              {/* Mobile Chat Toggle Button */}
              <button
                onClick={toggleChatSidebar}
                className="lg:hidden fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg z-50 transition-colors"
                title="Open AI Assistant"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            </div>
            
            <TicketTable />
          </main>
        </div>

        {/* Chat Sidebar */}
        <div className={`lg:block ${isChatSidebarVisible ? 'block' : 'hidden'}`}>
          <ChatSidebar onSubmit={handleQuerySubmit} onClose={toggleChatSidebar} />
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
      />
      
      <Toaster />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
