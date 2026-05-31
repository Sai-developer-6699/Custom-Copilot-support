import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Header = () => {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-40 shadow-lg shadow-zinc-950/30">
      <div className="px-4 sm:px-6 py-3 max-w-7xl mx-auto flex items-center justify-between">

        {/* ── Logo + Brand ── */}
        <Link
          to="/"
          className="flex items-center space-x-2.5 hover:opacity-90 transition-opacity flex-shrink-0"
          onClick={() => setMobileMenuOpen(false)}
        >
          {/* Logo icon — uses the generated PNG, falls back to a styled div */}
          <div className="h-9 w-9 rounded-xl overflow-hidden flex-shrink-0 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/30">
            <img
              src="/atlas-logo.png"
              alt="Atlas Copilot Logo"
              className="h-full w-full object-cover"
              onError={(e) => {
                // Fallback: hide broken img, show gradient div behind it
                e.target.style.display = 'none';
              }}
            />
          </div>

          {/* Brand name */}
          <div className="flex flex-col leading-none">
            <span className="text-base sm:text-lg font-extrabold bg-gradient-to-r from-indigo-300 via-violet-300 to-purple-400 bg-clip-text text-transparent tracking-tight">
              Atlas Copilot
            </span>
            <span className="text-[9px] font-semibold text-zinc-500 tracking-widest uppercase hidden sm:block">
              AI Support Intelligence
            </span>
          </div>
        </Link>

        {/* ── Desktop Nav ── */}
        <div className="hidden md:flex items-center space-x-6">
          <nav className="flex items-center space-x-5 text-sm font-medium">
            <Link
              to="/"
              className={`transition-colors hover:text-zinc-50 ${
                !isDashboard ? 'text-zinc-50 font-semibold' : 'text-zinc-400'
              }`}
            >
              Architecture Brief
            </Link>
            <Link
              to="/dashboard"
              className={`transition-colors hover:text-zinc-50 ${
                isDashboard ? 'text-zinc-50 font-semibold' : 'text-zinc-400'
              }`}
            >
              Interactive Copilot
            </Link>
          </nav>

          <span className="h-4 w-px bg-zinc-800" />

          {/* Live status indicator */}
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase">
              System Online
            </span>
          </div>
        </div>

        {/* ── Mobile: status dot + hamburger ── */}
        <div className="flex md:hidden items-center space-x-3">
          {/* Compact status on mobile */}
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>

          {/* Hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Dropdown Menu ── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-900 bg-zinc-950/95 backdrop-blur-md px-4 py-4 space-y-1">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              !isDashboard
                ? 'bg-zinc-900 text-zinc-50 font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
            }`}
          >
            Architecture Brief
          </Link>
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isDashboard
                ? 'bg-zinc-900 text-zinc-50 font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
            }`}
          >
            Interactive Copilot
          </Link>
          <div className="pt-2 px-3 flex items-center space-x-2 text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>System Online</span>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;