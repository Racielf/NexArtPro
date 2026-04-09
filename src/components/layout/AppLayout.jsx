import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useInactivityTimeout } from '@/lib/sessionManager';

export default function AppLayout() {
  useInactivityTimeout();
  return (
    <div className="flex min-h-screen bg-background font-inter">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}