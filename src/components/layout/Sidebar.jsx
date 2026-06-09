import React, { useState, useEffect } from 'react';
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
  Menu,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { isAdmin } from '@/lib/roleUtils';
import { useAuth } from '@/lib/AuthContext';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';

const navGroups = [
  { items: [{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
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

/* Bottom nav items for mobile — the 4 most-used + More */
const bottomNavItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/work-orders', label: 'WO', icon: ClipboardList },
  { path: '/estimates', label: 'Estimates', icon: FileText },
  { path: '/invoices', label: 'Invoices', icon: Receipt },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  // Sidebar must not depend on async company settings; keep it render-safe.
  const cc = {
    name: appConfig.company?.name || appConfig.appName || 'NexArtPro',
    displayName: appConfig.company?.displayName || '',
    logo_url: appConfig.company?.logo_url || appConfig.app?.logo_url || '',
  };
  const { user } = useAuth();
  const canAccessAdmin = user?.role === 'admin' || isAdmin();
  const visibleNavGroups = canAccessAdmin ? [...navGroups, adminNavGroup] : navGroups;
  const sidebarLogoUrl = cc.logo_url || appConfig.company.logo_url || '';

  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent scroll when sidebar is open on mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isBottomNavActive = (path) => location.pathname === path;

  return (
    <>
      {/* ═══════════════════════════════════════ */}
      {/* MOBILE TOP BAR — visible on < lg only  */}
      {/* ═══════════════════════════════════════ */}
      <div className="sidebar-mobile-topbar">
        <button
          onClick={() => setMobileOpen(true)}
          className="sidebar-hamburger"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="sidebar-mobile-brand">
          {sidebarLogoUrl ? (
            <img src={sidebarLogoUrl} alt="Logo" className="sidebar-mobile-logo" />
          ) : (
            <div className="sidebar-mobile-logo-fallback">
              <Wrench className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          <span className="sidebar-mobile-name">{cc.name || appConfig.appName}</span>
        </div>
        <div style={{ width: 40 }} /> {/* spacer for centering */}
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* MOBILE OVERLAY                          */}
      {/* ═══════════════════════════════════════ */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ═══════════════════════════════════════ */}
      {/* SIDEBAR — slides in on mobile           */}
      {/* ═══════════════════════════════════════ */}
      <div className={`sidebar-container ${mobileOpen ? 'sidebar-open' : ''}`}>
        {/* Close button — mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="sidebar-close-btn"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-inner">
            {sidebarLogoUrl ? (
              <div className="sidebar-brand-logo">
                <img src={sidebarLogoUrl} alt="Company logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="sidebar-brand-logo-fallback">
                <Wrench className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="sidebar-brand-name">{cc.name || appConfig.appName}</p>
              <p className="sidebar-brand-sub">{cc.displayName || appConfig.company.displayName}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {visibleNavGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
              {group.label && <p className="sidebar-group-label">{group.label}</p>}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                    >
                      <Icon className="sidebar-link-icon" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <Link
            to="/settings"
            className={`sidebar-link ${location.pathname === '/settings' ? 'sidebar-link-active' : ''}`}
          >
            <Settings className="sidebar-link-icon" />
            <span>Settings</span>
          </Link>
          <button
            onClick={() => {
              sessionStorage.clear();
              navigate('/login');
            }}
            className="sidebar-link sidebar-link-logout"
          >
            <LogOut className="sidebar-link-icon" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* MOBILE BOTTOM NAV                       */}
      {/* ═══════════════════════════════════════ */}
      <nav className="sidebar-bottom-nav">
        {bottomNavItems.map(item => {
          const Icon = item.icon;
          const active = isBottomNavActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-bottom-item ${active ? 'sidebar-bottom-item-active' : ''}`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMobileOpen(true)}
          className="sidebar-bottom-item"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}