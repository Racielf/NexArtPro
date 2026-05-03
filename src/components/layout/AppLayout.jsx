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
    <div className="app-layout">
      <Sidebar />
      <div className="app-main-area">
        {/* ⚡ Instant Security Toasts */}
        <SecurityToastListener />

        {/* 💰 Money Brain Alerts */}
        <GlobalMoneyBrainBanner />

        {/* 🔔 Global Security Banner */}
        <GlobalSecurityAlertBanner />

        <header className="app-topbar">
          <GlobalSearchBar />
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
