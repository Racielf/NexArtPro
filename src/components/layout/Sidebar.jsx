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
  HardHat
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/customers', label: 'Customers', icon: UserSquare },
  { path: '/appointments', label: 'Appointments', icon: Calendar },
  { path: '/estimates', label: 'Estimates', icon: FileText },
  { path: '/work-orders', label: 'Work Orders', icon: ClipboardList },
  { path: '/assignments', label: 'Assignments', icon: UserCheck },
  { path: '/workers', label: 'Workers', icon: HardHat },
  { path: '/invoices', label: 'Invoices', icon: Receipt },
  { path: '/time-tracking', label: 'Time Tracking', icon: Clock },
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
            <p className="text-white font-bold text-sm">FSM Pro</p>
            <p className="text-gray-400 text-xs">Field Service</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
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
      </nav>

      <div className="p-3 border-t border-gray-700">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}