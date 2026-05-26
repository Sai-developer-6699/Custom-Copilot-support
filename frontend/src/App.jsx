import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BackendProvider } from "./contexts/BackendContext";
import { TicketProvider } from "./contexts/TicketContext";
import LandingPage from "./components/layout/LandingPage";
import Dashboard from "./components/layout/Dashboard";

function App() {
  return (
    <div className="App dark bg-zinc-950 min-h-screen">
      <TicketProvider>
        <BackendProvider>
          <BrowserRouter>
            <Routes>
              {/* Public portfolio page */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Internal Copilot dashboard */}
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Wildcard fallback redirection */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </BackendProvider>
      </TicketProvider>
    </div>
  );
}

export default App;

