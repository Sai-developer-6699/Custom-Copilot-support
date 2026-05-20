import React from 'react';
import { Sparkles } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-40 shadow-lg shadow-zinc-950/20">
      <div className="px-6 py-5 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-400 bg-clip-text text-transparent tracking-tight">
            Atlan Customer Support Copilot
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">System Online</span>
        </div>
      </div>
    </header>
  );
};

export default Header;