import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useInactivityTimeout } from '@/lib/sessionManager';
import GlobalSecurityAlertBanner from '@/components/security/GlobalSecurityAlertBanner';
import GlobalSearchBar from './GlobalSearchBar';
import SecurityToastListener from '@/components/security/SecurityToastListener';
import GlobalMoneyBrainBanner from '@/components/finance/GlobalMoneyBrainBanner';

export default function AppLayout() {
  useInactivityTimeout();
  return (
    <div className="flex h-screen bg-background font-inter overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ⚡ Instant Security Toasts */}
        <SecurityToastListener />

        {/* 💰 Money Brain Alerts */}
        <GlobalMoneyBrainBanner />

        {/* 🔔 Global Security Banner */}
        <GlobalSecurityAlertBanner />

        <header className="flex-shrink-0 h-12 bg-white border-b border-border flex items-center px-5">
          <GlobalSearchBar />
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
