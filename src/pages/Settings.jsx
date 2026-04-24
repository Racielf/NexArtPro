import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeUserRole } from '@/lib/utils';
import SettingsSidebar from '@/components/settings/SettingsSidebar';
import BrainCommandCenterPanel from '@/components/settings/BrainCommandCenterPanel';
// ...rest unchanged

export default function Settings() {
  const [activeSection, setActiveSection] = useState('company');
  const [userRole, setUserRole] = useState(() => sessionStorage.getItem('user_role') || 'user');

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        const role = normalizeUserRole(u?.role);
        sessionStorage.setItem('user_role', role);
        setUserRole(role);
      })
      .catch(() => {});
  }, []);

  const [documents, setDocuments] = useState({ template: 'pro', showLogo: true, showStatus: true, estimateFormat: 'EST-{number}', invoiceFormat: 'INV-{number}', defaultNotes: '' });
  const [labor, setLabor] = useState({ payPolicy: 'employee_unpaid_break', breakMinutes: 30, breakPaid: false, allowManualAdjustments: true });
  const [payments, setPayments] = useState({ methods: ['Cash', 'Check', 'Card', 'Zelle'], autoReceipt: false });
  const [general, setGeneral] = useState({ timezone: 'America/Los_Angeles', dateFormat: 'MM/DD/YYYY', currency: 'USD' });

  const panels = {
    // existing panels...
    brain: <BrainCommandCenterPanel />,
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-slate-100 px-8 py-5 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage your account and application preferences</p>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-64 flex-shrink-0 bg-white border-r border-slate-100 p-4 overflow-y-auto">
          <SettingsSidebar active={activeSection} onChange={setActiveSection} userRole={userRole} />
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-8 pb-16">
          {panels[activeSection]}
        </div>
      </div>
    </div>
  );
}