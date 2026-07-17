import React from 'react';
import { Compass, Bookmark, Bell, Share2, Sparkles, Search, Menu } from 'lucide-react';
import soraLogo from "../assets/images/sorapath-logo.png";

export default function Navbar({ currentPage, setCurrentPage, toggleSidebar, onOpenChat }) {
  return (
    <header className="sticky top-0 z-[9999] w-full border-b border-travel-accent-gray bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        
        {/* Logo and Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={toggleSidebar} 
            className="rounded-xl p-2 text-travel-text-primary hover:bg-travel-bg-soft transition"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div 
            onClick={() => setCurrentPage('home')} 
            className="flex cursor-pointer items-center gap-2 font-display text-lg font-black tracking-tight text-travel-text-primary"
          >
          <img
            src={soraLogo}
            alt="Sora AI"
            className="h-12 w-auto object-contain"
          />
          </div>
        </div>

        {/* Search Bar - Center */}
        <div className="hidden md:flex flex-1 max-w-md relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-travel-text-muted" />
          <input
            type="text"
            placeholder="Ask AI anything about your trip..."
            className="w-full pl-10 pr-4 py-2 border border-travel-accent-gray rounded-xl bg-travel-bg-soft/40 focus:bg-white text-xs font-semibold outline-none transition focus:border-travel-button-dark focus:ring-1 focus:ring-travel-button-dark"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* AI Assistant Button */}
          <button
            onClick={onOpenChat}
            className="btn-premium btn-premium-dark"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>AI Assistant</span>
          </button>

          {/* Share Button */}
          <button className="rounded-xl border border-travel-accent-gray hover:border-travel-text-muted text-travel-text-muted hover:text-travel-text-primary p-2 transition hover:bg-travel-bg-soft cursor-pointer">
            <Share2 className="h-4.5 w-4.5" />
          </button>
        </div>

      </div>
    </header>
  );
}

