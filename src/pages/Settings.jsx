import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeUserRole } from '@/lib/utils';
import SettingsSidebar from '@/components/settings/SettingsSidebar';
import CompanyPanel from '@/components/settings/CompanyPanel';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsRow from '@/components/settings/SettingsRow';
import SettingsToggle from '@/components/settings/SettingsToggle';
import ServicesCatalogSection from '@/components/settings/services/ServicesCatalogSection';
import PriceBookSection from '@/components/settings/pricebook/PriceBookSection';
import MaterialsCatalogSection from '@/components/settings/materials/MaterialsCatalogSection';
import TeamAccessPanel from '@/components/settings/TeamAccessPanel';
import ManualDelSistemaPanel from '@/components/settings/ManualDelSistemaPanel';
import BrainCommandCenterPanel from '@/components/settings/BrainCommandCenterPanel';
import RecoveryCenterPanel from '@/components/settings/RecoveryCenterPanel';
import SecurityLogPanel from '@/components/settings/SecurityLogPanel';
import AgentTestRunnerPanel from '@/components/settings/AgentTestRunnerPanel';

export default function Settings() {
  const [activeSection, setActiveSection] = useState('company');
  const [userRole, setUserRole] = useState(() => sessionStorage.getItem('user_role') || 'user');

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        if (u && u.role) {
          const role = normalizeUserRole(u.role);
          sessionStorage.setItem('user_role', role);
          setUserRole(role);
        }
      })
      .catch(() => {});
  }, []);

  const [documents, setDocuments] = useState({ template: 'pro', showLogo: true, showStatus: true, estimateFormat: 'EST-{number}', invoiceFormat: 'INV-{number}', defaultNotes: '' });
  const [labor, setLabor] = useState({ payPolicy: 'employee_unpaid_break', breakMinutes: 30, breakPaid: false, allowManualAdjustments: true });
  const [payments, setPayments] = useState({ methods: ['Cash', 'Check', 'Card', 'Zelle'], autoReceipt: false });
  const [general, setGeneral] = useState({ timezone: 'America/Los_Angeles', dateFormat: 'MM/DD/YYYY', currency: 'USD' });

  const panels = {
    company: <CompanyPanel />,

    documents: (
      <SettingsSection title="Documents" description="Configure how estimates and invoices are generated and displayed.">
        <SettingsCard title="Branding">
          <SettingsToggle label="Show company logo" description="Display your logo on all documents" checked={documents.showLogo} onChange={v => setDocuments(d => ({ ...d, showLogo: v }))} />
          <SettingsToggle label="Show status badge" description="Show estimate/invoice status on documents" checked={documents.showStatus} onChange={v => setDocuments(d => ({ ...d, showStatus: v }))} />
        </SettingsCard>
        <SettingsCard title="Numbering">
          <SettingsRow label="Estimate format" description="e.g. EST-{number}">
            <input className="h-9 border border-input rounded-md px-3 text-sm w-48 bg-background" value={documents.estimateFormat} onChange={e => setDocuments(d => ({ ...d, estimateFormat: e.target.value }))} />
          </SettingsRow>
          <SettingsRow label="Invoice format" description="e.g. INV-{number}">
            <input className="h-9 border border-input rounded-md px-3 text-sm w-48 bg-background" value={documents.invoiceFormat} onChange={e => setDocuments(d => ({ ...d, invoiceFormat: e.target.value }))} />
          </SettingsRow>
        </SettingsCard>
        <SettingsCard title="Defaults">
          <SettingsRow label="Default notes" description="Appears on new estimates by default">
            <textarea className="border border-input rounded-md px-3 py-2 text-sm w-full bg-background h-24 resize-none" value={documents.defaultNotes} onChange={e => setDocuments(d => ({ ...d, defaultNotes: e.target.value }))} placeholder="e.g. Thank you for your business!" />
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>
    ),

    services: <ServicesCatalogSection />,

    pricebook: <PriceBookSection />,

    materials: <MaterialsCatalogSection />,

    labor: (
      <SettingsSection title="Work Orders & Labor" description="Configure how work orders and labor tracking behave.">
        <SettingsCard title="Break Policy">
          <SettingsRow label="Break duration (minutes)" description="Default break time deducted per shift">
            <input type="number" className="h-9 border border-input rounded-md px-3 text-sm w-24 bg-background" value={labor.breakMinutes} onChange={e => setLabor(l => ({ ...l, breakMinutes: Number(e.target.value) }))} min={0} />
          </SettingsRow>
          <SettingsToggle label="Paid breaks" description="Include break time in billable hours" checked={labor.breakPaid} onChange={v => setLabor(l => ({ ...l, breakPaid: v }))} />
        </SettingsCard>
        <SettingsCard title="Time Tracking">
          <SettingsToggle label="Allow manual time adjustments" description="Let team members edit time entries after the fact" checked={labor.allowManualAdjustments} onChange={v => setLabor(l => ({ ...l, allowManualAdjustments: v }))} />
        </SettingsCard>
      </SettingsSection>
    ),

    payments: (
      <SettingsSection title="Payments" description="Configure accepted payment methods and receipt settings.">
        <SettingsCard title="Accepted Methods">
          <div className="grid grid-cols-2 gap-2">
            {['Cash', 'Check', 'Card', 'Zelle', 'ACH', 'Wire'].map(method => (
              <label key={method} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={payments.methods.includes(method)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...payments.methods, method]
                      : payments.methods.filter(m => m !== method);
                    setPayments(p => ({ ...p, methods: next }));
                  }}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">{method}</span>
              </label>
            ))}
          </div>
        </SettingsCard>
        <SettingsCard title="Receipts">
          <SettingsToggle label="Auto-send receipts" description="Automatically email receipts when payment is recorded" checked={payments.autoReceipt} onChange={v => setPayments(p => ({ ...p, autoReceipt: v }))} />
        </SettingsCard>
      </SettingsSection>
    ),

    team: <TeamAccessPanel />,

    general: (
      <SettingsSection title="General" description="Configure regional and display preferences.">
        <SettingsCard title="Regional">
          <SettingsRow label="Timezone" description="Used for scheduling and timestamps">
            <select className="h-9 border border-input rounded-md px-3 text-sm bg-background w-56" value={general.timezone} onChange={e => setGeneral(g => ({ ...g, timezone: e.target.value }))}>
              <option value="America/Los_Angeles">Pacific (LA)</option>
              <option value="America/Denver">Mountain (Denver)</option>
              <option value="America/Chicago">Central (Chicago)</option>
              <option value="America/New_York">Eastern (New York)</option>
            </select>
          </SettingsRow>
          <SettingsRow label="Date format">
            <select className="h-9 border border-input rounded-md px-3 text-sm bg-background w-48" value={general.dateFormat} onChange={e => setGeneral(g => ({ ...g, dateFormat: e.target.value }))}>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </SettingsRow>
          <SettingsRow label="Currency">
            <select className="h-9 border border-input rounded-md px-3 text-sm bg-background w-32" value={general.currency} onChange={e => setGeneral(g => ({ ...g, currency: e.target.value }))}>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="MXN">MXN ($)</option>
            </select>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>
    ),

    manual: <ManualDelSistemaPanel />,

    brain: <BrainCommandCenterPanel />,

    recovery: <RecoveryCenterPanel />,

    security: <SecurityLogPanel />,

    agent_tests: <AgentTestRunnerPanel />,
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-slate-100 px-4 sm:px-8 py-4 sm:py-5 flex-shrink-0">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage your account and application preferences</p>
      </div>

      {/* Mobile: Horizontal scrollable tabs */}
      <div className="lg:hidden flex-shrink-0 bg-white border-b border-slate-100 overflow-x-auto scrollbar-none">
        <div className="flex px-2 py-1 gap-0.5 min-w-max">
          <SettingsSidebar active={activeSection} onChange={setActiveSection} userRole={userRole} horizontal />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Desktop: Sidebar */}
        <div className="hidden lg:block w-64 flex-shrink-0 bg-white border-r border-slate-100 p-4 overflow-y-auto">
          <SettingsSidebar active={activeSection} onChange={setActiveSection} userRole={userRole} />
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-10 py-4 sm:py-8 pb-16">
          {panels[activeSection] || (
            <div className="text-sm text-slate-400 text-center mt-20">Select a section from the sidebar.</div>
          )}
        </div>
      </div>
    </div>
  );
}
