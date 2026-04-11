import React from 'react';
import {
  Building2, FileText, Wrench, BookOpen,
  ClipboardList, CreditCard, Settings, ShieldCheck, BookMarked
} from 'lucide-react';

const sections = [
  { id: 'company',   label: 'Company',              icon: Building2 },
  { id: 'documents', label: 'Documents',             icon: FileText },
  { id: 'services',  label: 'Services',              icon: Wrench },
  { id: 'pricebook', label: 'Price Book',            icon: BookOpen },
  { id: 'labor',     label: 'Work Orders & Labor',   icon: ClipboardList },
  { id: 'payments',  label: 'Payments',              icon: CreditCard },
  { id: 'team',      label: 'Team & Access',         icon: ShieldCheck },
  { id: 'general',   label: 'General',               icon: Settings },
  { id: 'manual',    label: 'Manual del Sistema',    icon: BookMarked },
];

export default function SettingsSidebar({ active, onChange }) {
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
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-500' : ''}`} />
              {s.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}