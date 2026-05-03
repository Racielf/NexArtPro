import React from 'react';
import {
  Building2, FileText, Wrench, BookOpen,
  ClipboardList, CreditCard, Settings, ShieldCheck, BookMarked, Package, RotateCcw, Activity, FlaskConical, Brain, LayoutDashboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BASE_SECTIONS = [
  { id: 'company',   label: 'Company',              icon: Building2 },
  { id: 'documents', label: 'Documents',             icon: FileText },
  { id: 'services',  label: 'Services',              icon: Wrench },
  { id: 'pricebook', label: 'Price Book',            icon: BookOpen },
  { id: 'materials', label: 'Materials',              icon: Package },
  { id: 'labor',     label: 'Work Orders & Labor',   icon: ClipboardList },
  { id: 'payments',  label: 'Payments',              icon: CreditCard },
  { id: 'team',      label: 'Team & Access',         icon: ShieldCheck },
  { id: 'general',   label: 'General',               icon: Settings },
  { id: 'manual',    label: 'Manual del Sistema',    icon: BookMarked },
  { id: 'brain',     label: 'System Intelligence',   icon: Brain },
];

const ADMIN_SECTIONS = [
  { id: 'recovery',    label: 'Recovery Center',    icon: RotateCcw,        adminOnly: true },
  { id: 'security',    label: 'Security Log',       icon: Activity,         adminOnly: true },
  { id: 'agent_tests', label: 'Agent Test Runner',  icon: FlaskConical,     adminOnly: true },
  { id: 'sec_dashboard_link', label: 'Security Dashboard ↗', icon: LayoutDashboard, adminOnly: true, isLink: '/security-dashboard' },
];

/**
 * SettingsSidebar — supports two rendering modes:
 * - Default (vertical): Left sidebar for desktop
 * - horizontal={true}: Scrollable horizontal tabs for mobile
 */
export default function SettingsSidebar({ active, onChange, userRole, horizontal = false }) {
  const navigate = useNavigate();
  const sections = userRole === 'admin'
    ? [...BASE_SECTIONS, ...ADMIN_SECTIONS]
    : BASE_SECTIONS;

  // ─── Horizontal mode (mobile tabs) ──────────────────────────────
  if (horizontal) {
    return (
      <>
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.id;
          if (s.isLink) {
            return (
              <button
                key={s.id}
                onClick={() => navigate(s.isLink)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {s.label}
              </button>
            );
          }
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? s.adminOnly ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? (s.adminOnly ? 'text-red-500' : 'text-blue-500') : ''}`} />
              {s.label}
            </button>
          );
        })}
      </>
    );
  }

  // ─── Vertical mode (desktop sidebar) ────────────────────────────
  return (
    <div className="w-52 flex-shrink-0">
      <nav className="space-y-0.5">
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.id;
          if (s.isLink) {
            return (
              <button
                key={s.id}
                onClick={() => navigate(s.isLink)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {s.label}
              </button>
            );
          }
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? s.adminOnly ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? (s.adminOnly ? 'text-red-500' : 'text-blue-500') : ''}`} />
              {s.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}