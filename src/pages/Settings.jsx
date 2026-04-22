import React, { useState, useEffect } from 'react';
import SettingsSidebar from '@/components/settings/SettingsSidebar';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsRow from '@/components/settings/SettingsRow';
import SettingsToggle from '@/components/settings/SettingsToggle';
import { Plus, Search, ShieldCheck } from 'lucide-react';
import ServicesCatalogSection from '@/components/settings/services/ServicesCatalogSection';
import PriceBookSection from '@/components/settings/pricebook/PriceBookSection';
import MaterialsCatalogSection from '@/components/settings/materials/MaterialsCatalogSection';
import { base44 } from '@/api/base44Client';
import CompanyPanel from '@/components/settings/CompanyPanel';
import { normalizeUserRole } from '@/lib/utils';
import { getUsers, createUser, toggleUserActive } from '@/lib/userStore';
import ManualDelSistemaPanel from '@/components/settings/ManualDelSistemaPanel';
import RecoveryCenterPanel from '@/components/settings/RecoveryCenterPanel';
import SecurityLogPanel from '@/components/settings/SecurityLogPanel';
import AgentTestRunnerPanel from '@/components/settings/AgentTestRunnerPanel';

// ─── Shared input styles ──────────────────────────────────────────────────────
const inputCls = 'w-64 text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition';
const selectCls = 'w-64 text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition';

// ─── Section panels ───────────────────────────────────────────────────────────

function DocumentsPanel({ state, set }) {
  return (
    <SettingsSection title="Documents" description="Default settings for estimates, invoices, and work orders.">
      <SettingsCard>
        <SettingsRow label="Default Template" description="Applied when creating new documents">
          <select className={selectCls} value={state.template} onChange={e => set({ ...state, template: e.target.value })}>
            <option value="pro">Professional (Pro)</option>
            <option value="standard">Standard</option>
            <option value="modern">Modern</option>
            <option value="executive">Executive</option>
            <option value="compact">Compact</option>
            <option value="minimal">Minimal</option>
          </select>
        </SettingsRow>
        <SettingsRow label="Show Logo on Documents">
          <SettingsToggle checked={state.showLogo} onChange={v => set({ ...state, showLogo: v })} />
        </SettingsRow>
        <SettingsRow label="Show Status Badge">
          <SettingsToggle checked={state.showStatus} onChange={v => set({ ...state, showStatus: v })} />
        </SettingsRow>
        <SettingsRow label="Estimate Number Format" description="e.g. EST-{number}">
          <input className={inputCls} value={state.estimateFormat} onChange={e => set({ ...state, estimateFormat: e.target.value })} placeholder="EST-{number}" />
        </SettingsRow>
        <SettingsRow label="Invoice Number Format" description="e.g. INV-{number}">
          <input className={inputCls} value={state.invoiceFormat} onChange={e => set({ ...state, invoiceFormat: e.target.value })} placeholder="INV-{number}" />
        </SettingsRow>
        <SettingsRow label="Default Notes" description="Pre-filled on new documents" last>
          <textarea
            className="w-64 text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition resize-none"
            rows={3}
            value={state.defaultNotes}
            onChange={e => set({ ...state, defaultNotes: e.target.value })}
            placeholder="Thank you for your business..."
          />
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}

function ServicesPanel() {
  return (
    <SettingsSection title="Services" description="Master catalog of services. Powers estimates, invoices, and work orders.">
      <ServicesCatalogSection />
    </SettingsSection>
  );
}

function PriceBookPanel() {
  return (
    <SettingsSection title="Price Book" description="Standardized pricing connected to your service catalog.">
      <PriceBookSection />
    </SettingsSection>
  );
}

function MaterialsPanel() {
  return (
    <SettingsSection title="Materials" description="Company materials database for construction and remodeling. Separate from service pricing.">
      <MaterialsCatalogSection />
    </SettingsSection>
  );
}

function LaborPanel({ state, set }) {
  return (
    <SettingsSection title="Work Orders & Labor" description="Default labor and execution settings for work orders.">
      <SettingsCard>
        <SettingsRow label="Default Pay Policy">
          <select className={selectCls} value={state.payPolicy} onChange={e => set({ ...state, payPolicy: e.target.value })}>
            <option value="employee_unpaid_break">Employee (Unpaid Break)</option>
            <option value="employee_paid_break">Employee (Paid Break)</option>
            <option value="subcontractor">Subcontractor</option>
            <option value="flat_rate">Flat Rate</option>
            <option value="custom">Custom</option>
          </select>
        </SettingsRow>
        <SettingsRow label="Default Break Duration" description="In minutes">
          <input
            className="w-24 text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
            type="number"
            min="0"
            value={state.breakMinutes}
            onChange={e => set({ ...state, breakMinutes: parseInt(e.target.value) || 0 })}
          />
        </SettingsRow>
        <SettingsRow label="Break Paid by Default">
          <SettingsToggle checked={state.breakPaid} onChange={v => set({ ...state, breakPaid: v })} />
        </SettingsRow>
        <SettingsRow label="Allow Manual Time Adjustments" last>
          <SettingsToggle checked={state.allowManualAdjustments} onChange={v => set({ ...state, allowManualAdjustments: v })} />
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}

function PaymentsPanel({ state, set }) {
  const methods = ['Cash', 'Check', 'Card', 'Zelle', 'Other'];
  const toggle = (m) => {
    const next = state.methods.includes(m) ? state.methods.filter(x => x !== m) : [...state.methods, m];
    set({ ...state, methods: next });
  };
  return (
    <SettingsSection title="Payments" description="Accepted payment methods and receipt settings.">
      <SettingsCard>
        <SettingsRow label="Accepted Payment Methods" description="Check all that apply">
          <div className="flex flex-col gap-2">
            {methods.map(m => (
              <label key={m} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.methods.includes(m)}
                  onChange={() => toggle(m)}
                  className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700">{m}</span>
              </label>
            ))}
          </div>
        </SettingsRow>
        <SettingsRow label="Auto Generate Receipt" description="Automatically on payment received" last>
          <SettingsToggle checked={state.autoReceipt} onChange={v => set({ ...state, autoReceipt: v })} />
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}

function GeneralPanel({ state, set }) {
  return (
    <SettingsSection title="General" description="Locale, formatting, and system defaults.">
      <SettingsCard>
        <SettingsRow label="Timezone">
          <select className={selectCls} value={state.timezone} onChange={e => set({ ...state, timezone: e.target.value })}>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/New_York">Eastern Time (ET)</option>
          </select>
        </SettingsRow>
        <SettingsRow label="Date Format">
          <select className={selectCls} value={state.dateFormat} onChange={e => set({ ...state, dateFormat: e.target.value })}>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </SettingsRow>
        <SettingsRow label="Currency" last>
          <select className={selectCls} value={state.currency} onChange={e => set({ ...state, currency: e.target.value })}>
            <option value="USD">USD — US Dollar</option>
            <option value="CAD">CAD — Canadian Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="MXN">MXN — Mexican Peso</option>
          </select>
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}

function TeamAccessPanel({ userRole }) {
  const isAdminUser = userRole === 'admin';
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'agent' });
  const [formError, setFormError] = useState('');

  const refresh = async () => { setUsers(await getUsers()); };

  useEffect(() => { refresh(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!newUser.username.trim() || !newUser.password.trim()) {
      setFormError('Username and password are required');
      return;
    }
    const result = await createUser(newUser);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setNewUser({ username: '', password: '', role: 'agent' });
    await refresh();
  };

  const handleToggle = async (id) => {
    await toggleUserActive(id);
    await refresh();
  };

  if (!isAdminUser) {
    return (
      <SettingsSection title="Team & Access" description="Manage authorized internal users and their access level.">
        <SettingsCard>
          <div className="px-5 py-8 text-center">
            <ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">Admin access required</p>
            <p className="text-xs text-slate-400 mt-1">Only administrators can manage team access.</p>
          </div>
        </SettingsCard>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="Team & Access" description="Manage authorized internal users and their access level.">
      {/* User list */}
      <SettingsCard>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="px-5 py-3">Username</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3 font-medium text-slate-800">{u.username}</td>
                <td className="px-5 py-3 capitalize text-slate-600">{u.role}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${u.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleToggle(u.id)}
                    className={`text-xs font-medium ${u.active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                  >
                    {u.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SettingsCard>

      {/* Create user form */}
      <SettingsCard>
        <div className="px-5 py-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Add Agent</p>
          <form onSubmit={handleCreate} className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Username</label>
              <input
                className={inputCls}
                value={newUser.username}
                onChange={e => { setNewUser({ ...newUser, username: e.target.value }); setFormError(''); }}
                placeholder="e.g. agent2"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Password</label>
              <input
                className={inputCls}
                type="password"
                value={newUser.password}
                onChange={e => { setNewUser({ ...newUser, password: e.target.value }); setFormError(''); }}
                placeholder="••••••"
              />
            </div>
            <button
              type="submit"
              className="h-9 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Create
            </button>
          </form>
          {formError && <p className="text-xs text-red-500 mt-2">{formError}</p>}
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function Settings() {
  const [activeSection, setActiveSection] = useState('company');
  // Single source of truth for role: resolved async from base44.auth.me()
  // sessionStorage fallback only until async resolves — then overwritten
  const [userRole, setUserRole] = useState(() => sessionStorage.getItem('user_role') || 'user');

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        const role = normalizeUserRole(u?.role);
        // Keep sessionStorage in sync so isAdmin() in child components agrees
        sessionStorage.setItem('user_role', role);
        setUserRole(role);
      })
      .catch(() => {});
  }, []);

  // Local state per section
  const [documents, setDocuments] = useState({ template: 'pro', showLogo: true, showStatus: true, estimateFormat: 'EST-{number}', invoiceFormat: 'INV-{number}', defaultNotes: '' });
  const [labor, setLabor] = useState({ payPolicy: 'employee_unpaid_break', breakMinutes: 30, breakPaid: false, allowManualAdjustments: true });
  const [payments, setPayments] = useState({ methods: ['Cash', 'Check', 'Card', 'Zelle'], autoReceipt: false });
  const [general, setGeneral] = useState({ timezone: 'America/Los_Angeles', dateFormat: 'MM/DD/YYYY', currency: 'USD' });

  const panels = {
    company:   <CompanyPanel />,
    documents: <DocumentsPanel state={documents} set={setDocuments} />,
    services:  <ServicesPanel />,
    pricebook: <PriceBookPanel />,
    materials: <MaterialsPanel />,
    labor:     <LaborPanel     state={labor}     set={setLabor}     />,
    payments:  <PaymentsPanel  state={payments}  set={setPayments}  />,
    team:      <TeamAccessPanel userRole={userRole} />,
    general:   <GeneralPanel   state={general}   set={setGeneral}   />,
    manual:    <ManualDelSistemaPanel />,
    recovery:    <RecoveryCenterPanel />,
    security:    <SecurityLogPanel />,
    agent_tests: <AgentTestRunnerPanel />,
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Header — fixed height */}
      <div className="bg-white border-b border-slate-100 px-8 py-5 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage your account and application preferences</p>
      </div>

      {/* Body — fills remaining height */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — static, own scroll */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-slate-100 p-4 overflow-y-auto">
          {/* Pass resolved userRole so sidebar uses same source of truth as this page */}
        <SettingsSidebar active={activeSection} onChange={setActiveSection} userRole={userRole} />
        </div>

        {/* Main Panel — own scroll */}
        <div className="flex-1 overflow-y-auto px-10 py-8 pb-16">
          {panels[activeSection]}
        </div>
      </div>
    </div>
  );
}