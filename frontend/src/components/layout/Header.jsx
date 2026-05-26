import React from 'react';
import { Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';

  return (
    <header className="bg-zinc-950/85 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-40 shadow-lg shadow-zinc-950/20">
      <div className="px-6 py-4 max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-400 bg-clip-text text-transparent tracking-tight">
            Atlan Customer Support Copilot
          </h1>
        </Link>
        
        <div className="flex items-center space-x-6">
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              to="/"
              className={`transition-colors hover:text-zinc-50 ${
                !isDashboard ? "text-zinc-50 font-semibold" : "text-zinc-400"
              }`}
            >
              Architecture Brief
            </Link>
            <Link
              to="/dashboard"
              className={`transition-colors hover:text-zinc-50 ${
                isDashboard ? "text-zinc-50 font-semibold" : "text-zinc-400"
              }`}
            >
              Interactive Copilot
            </Link>
          </nav>

          <span className="h-4 w-px bg-zinc-800 hidden sm:block" />

          <div className="items-center space-x-2 hidden sm:flex">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase">System Online</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;