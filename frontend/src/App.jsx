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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Support Tickets Dashboard
            </h2>
            <p className="text-gray-600">
              Monitor and analyze customer support interactions with AI-powered insights.
            </p>
          </div>
          
          <TicketTable />
        </main>
      </div>

      {/* Chat Sidebar */}
      <ChatSidebar onSubmit={handleQuerySubmit} />
      
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
