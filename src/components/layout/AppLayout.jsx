import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useInactivityTimeout } from '@/lib/sessionManager';
import { Search } from 'lucide-react';

export default function AppLayout() {
  useInactivityTimeout();
  return (
    <div className="flex h-screen bg-background font-inter overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 h-12 bg-white border-b border-border flex items-center px-5">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search…"
              className="w-full pl-8 pr-4 h-8 rounded-lg bg-muted/60 text-sm placeholder:text-muted-foreground border border-border/60 outline-none focus:ring-1 focus:ring-ring transition"
            />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}