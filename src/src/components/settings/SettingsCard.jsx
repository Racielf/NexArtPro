import React from 'react';

export default function SettingsCard({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}