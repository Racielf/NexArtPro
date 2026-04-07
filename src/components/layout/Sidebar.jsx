import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  BarChart2
} from 'lucide-react';

const navGroups = [
  {
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Operations',
    items: [
      { path: '/customers', label: 'Customers', icon: UserSquare },
      { path: '/appointments', label: 'Appointments', icon: Calendar },
      { path: '/estimates', label: 'Estimates', icon: FileText },
    ]
  },
  {
    label: 'Execution',
    items: [
      { path: '/work-orders', label: 'Work Orders', icon: ClipboardList },
      { path: '/assignments', label: 'Assignments', icon: UserCheck },
      { path: '/workers', label: 'Workers', icon: HardHat },
      { path: '/time-tracking', label: 'Time Tracking', icon: Clock },
    ]
  },
  {
    label: 'Finance',
    items: [
      { path: '/invoices', label: 'Invoices', icon: Receipt },
      { path: '/payments', label: 'Payments', icon: CreditCard },
      { path: '/income-expenses', label: 'Income & Expenses', icon: TrendingUp },
      { path: '/payroll', label: 'Payroll', icon: DollarSign },
      { path: '/reports', label: 'Reports', icon: BarChart2 },
    ]
  },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-56 min-h-screen bg-gray-900 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">NexArt Pro</p>
            <p className="text-gray-400 text-xs">R.C Art Construction</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-3 mb-1">{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-700">
        <Link
          to="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            location.pathname === '/settings'
              ? 'bg-primary text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}