import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserSquare,
  Calendar,
  FileText,
  ClipboardList,
  Receipt,
  Settings,
  Wrench,
  Clock,
  UserCheck,
  HardHat,
  CreditCard,
  TrendingUp,
  DollarSign,
  BarChart2,
  ScrollText,
  LogOut,
  RotateCcw,
  FileSignature,
} from 'lucide-react';
import { isAdmin } from '@/lib/roleUtils';
import { useAuth } from '@/lib/AuthContext';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import useCompanyConfig from '@/hooks/useCompanyConfig';
import { logout } from '@/lib/sessionManager';

const navGroups = [
  {
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/leads', label: 'Leads', icon: Users },
      { path: '/customers', label: 'Customers', icon: UserSquare },
      { path: '/appointments', label: 'Appointments', icon: Calendar },
      { path: '/estimates', label: 'Estimates', icon: FileText },
      { path: '/proposals', label: 'Proposals', icon: ScrollText },
    ],
  },
  {
    label: 'Execution',
    items: [
      { path: '/work-orders', label: 'Work Orders', icon: ClipboardList },
      { path: '/assignments', label: 'Assignments', icon: UserCheck },
      { path: '/workers', label: 'Workers', icon: HardHat },
      { path: '/time-tracking', label: 'Time Tracking', icon: Clock },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/invoices', label: 'Invoices', icon: Receipt },
      { path: '/payments', label: 'Payments', icon: CreditCard },
      { path: '/income-expenses', label: 'Income & Expenses', icon: TrendingUp },
      { path: '/payroll', label: 'Payroll', icon: DollarSign },
      { path: '/reports', label: 'Reports', icon: BarChart2 },
    ],
  },
];

const adminNavGroup = {
  label: 'Admin',
  items: [
    { path: '/nexartsign', label: 'NexArtSign', icon: FileSignature },
    { path: '/recovery-center', label: 'Recovery Center', icon: RotateCcw },
  ],
};

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const cc = useCompanyConfig();
  const { user } = useAuth();
  const canAccessAdmin = user?.role === 'admin' || isAdmin();
  const visibleNavGroups = canAccessAdmin ? [...navGroups, adminNavGroup] : navGroups;
  const appLogoUrl = cc.app_logo_url || appConfig.app.logo_url || '';

  return (
    <div
      className="w-[224px] flex-shrink-0 h-screen flex flex-col"
      style={{ background: '#1a2233', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="px-4 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          {appLogoUrl ? (
            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              <img src={appLogoUrl} alt="App logo" className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#2563EB' }}>
              <Wrench className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[13px] leading-tight truncate"
              style={{ color: '#f1f5f9' }}>
              {cc.name || appConfig.appName}
            </p>
            <p className="text-[11px] leading-tight mt-0.5 truncate"
              style={{ color: 'rgba(148,163,184,0.7)' }}>
              {cc.displayName || appConfig.company.displayName}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2.5 py-3 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {visibleNavGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
            {group.label && (
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] px-3 mb-2"
                style={{ color: 'rgba(100,116,139,0.8)' }}>
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={isActive ? {
                      background: 'rgba(37,99,235,0.18)',
                      color: '#93c5fd',
                      borderLeft: '2px solid #3b82f6',
                      paddingLeft: '10px',
                    } : {
                      color: 'rgba(148,163,184,0.85)',
                      borderLeft: '2px solid transparent',
                      paddingLeft: '10px',
                    }}
                    className={`flex items-center gap-3 pr-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                      isActive ? '' : 'hover:bg-white/[0.05] hover:text-slate-200'
                    }`}
                  >
                    <Icon
                      className="w-[15px] h-[15px] flex-shrink-0"
                      style={{ color: isActive ? '#60a5fa' : 'rgba(100,116,139,0.9)', strokeWidth: 1.75 }}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 px-2.5 py-3 space-y-0.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Link
          to="/settings"
          style={location.pathname === '/settings' ? {
            background: 'rgba(37,99,235,0.18)',
            color: '#93c5fd',
            borderLeft: '2px solid #3b82f6',
            paddingLeft: '10px',
          } : {
            color: 'rgba(148,163,184,0.85)',
            borderLeft: '2px solid transparent',
            paddingLeft: '10px',
          }}
          className={`flex items-center gap-3 pr-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
            location.pathname === '/settings' ? '' : 'hover:bg-white/[0.05] hover:text-slate-200'
          }`}
        >
          <Settings
            className="w-[15px] h-[15px] flex-shrink-0"
            style={{ color: location.pathname === '/settings' ? '#60a5fa' : 'rgba(100,116,139,0.9)', strokeWidth: 1.75 }}
          />
          <span>Settings</span>
        </Link>
        <button
          onClick={() => logout(navigate)}
          className="flex w-full items-center gap-3 pr-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 hover:bg-red-500/10"
          style={{ color: 'rgba(148,163,184,0.7)', paddingLeft: '12px' }}
          onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(148,163,184,0.7)'}
        >
          <LogOut className="w-[15px] h-[15px] flex-shrink-0" style={{ strokeWidth: 1.75 }} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}