import React from 'react';

export default function SettingsRow({ label, description, children, last = false }) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 gap-6 ${!last ? 'border-b border-slate-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  );
}