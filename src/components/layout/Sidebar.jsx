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
} from 'lucide-react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import { isAdmin } from '@/lib/roleUtils';
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

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const cc = useCompanyConfig();

  return (
    <div className="w-[220px] flex-shrink-0 h-screen bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Branding */}
      <div className="px-4 py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          {cc.logo_url ? (
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center p-1">
              <img src={cc.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-9 h-9 bg-sidebar-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <Wrench className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sidebar-accent-foreground font-semibold text-[13px] leading-tight truncate">
              {cc.name || appConfig.appName}
            </p>
            <p className="text-sidebar-foreground text-[11px] leading-tight mt-0.5 truncate opacity-70">
              {cc.displayName || appConfig.company.displayName}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-3 overflow-y-auto space-y-3">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-widest px-3 mb-1.5 mt-1">
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0 opacity-75" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Settings + Logout */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-sidebar-border space-y-0.5">
        <Link
          to="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
            location.pathname === '/settings'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
          }`}
        >
          <Settings className="w-4 h-4 opacity-75" />
          Settings
        </Link>
        <button
          onClick={() => logout(navigate)}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-sidebar-foreground hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="w-4 h-4 opacity-75" />
          Logout
        </button>
      </div>
    </div>
  );
}
