import React from 'react';
import { APP_CONFIG } from '@/lib/appConfig';
import { LogOut } from 'lucide-react';

export default function ClientPortalHeader({ clientName, onLogout }) {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 40 40" className="w-4 h-4" fill="none">
            <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{APP_CONFIG.appName}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Client Portal</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {clientName && (
          <span className="text-sm text-slate-600">Welcome, <strong>{clientName}</strong></span>
        )}
        {onLogout && (
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Exit
          </button>
        )}
      </div>
    </div>
  );
}