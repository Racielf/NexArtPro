import React from 'react';
import {
  Building2, FileText, Wrench, BookOpen,
  ClipboardList, CreditCard, Settings, ShieldCheck, BookMarked, Package, RotateCcw, Activity, FlaskConical, Brain
} from 'lucide-react';

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
  { id: 'recovery',    label: 'Recovery Center',    icon: RotateCcw,     adminOnly: true },
  { id: 'security',    label: 'Security Log',       icon: Activity,      adminOnly: true },
  { id: 'agent_tests', label: 'Agent Test Runner',  icon: FlaskConical,  adminOnly: true },
];

export default function SettingsSidebar({ active, onChange, userRole }) {
  const sections = userRole === 'admin'
    ? [...BASE_SECTIONS, ...ADMIN_SECTIONS]
    : BASE_SECTIONS;
  return (
    <div className="w-52 flex-shrink-0">
      <nav className="space-y-0.5">
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.id;
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