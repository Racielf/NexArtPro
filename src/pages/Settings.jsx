import React, { useState } from 'react';
import SettingsSidebar from '@/components/settings/SettingsSidebar';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsRow from '@/components/settings/SettingsRow';
import SettingsToggle from '@/components/settings/SettingsToggle';
import { Plus, Search } from 'lucide-react';

// ─── Shared input styles ──────────────────────────────────────────────────────
const inputCls = 'w-64 text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition';
const selectCls = 'w-64 text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition';

// ─── Section panels ───────────────────────────────────────────────────────────

function CompanyPanel({ state, set }) {
  return (
    <SettingsSection title="Company" description="Your business information shown on documents and emails.">
      <SettingsCard>
        <SettingsRow label="Company Name" description="Appears on all documents">
          <input className={inputCls} value={state.name} onChange={e => set({ ...state, name: e.target.value })} placeholder="FSM Pro LLC" />
        </SettingsRow>
        <SettingsRow label="Email">
          <input className={inputCls} type="email" value={state.email} onChange={e => set({ ...state, email: e.target.value })} placeholder="info@company.com" />
        </SettingsRow>
        <SettingsRow label="Phone">
          <input className={inputCls} value={state.phone} onChange={e => set({ ...state, phone: e.target.value })} placeholder="(503) 555-0100" />
        </SettingsRow>
        <SettingsRow label="Address">
          <input className={inputCls} value={state.address} onChange={e => set({ ...state, address: e.target.value })} placeholder="123 Main St, Portland OR" />
        </SettingsRow>
        <SettingsRow label="License Number">
          <input className={inputCls} value={state.license} onChange={e => set({ ...state, license: e.target.value })} placeholder="#CCB-000000" />
        </SettingsRow>
        <SettingsRow label="Logo" description="Upload your company logo" last>
          <button className="text-sm text-blue-500 font-medium hover:text-blue-600 transition border border-blue-200 rounded-lg px-4 py-1.5 bg-blue-50">
            Upload Logo
          </button>
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}

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
  const [search, setSearch] = useState('');
  return (
    <SettingsSection title="Services" description="Define the services you offer. These will power your estimate line items.">
      <div className="flex items-center justify-between mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
          <input
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-56 focus:outline-none focus:border-blue-400 transition"
            placeholder="Search services..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition rounded-lg px-4 py-2">
          <Plus className="w-3.5 h-3.5" /> Add Service
        </button>
      </div>
      <SettingsCard>
        <div className="px-5 py-12 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔧</span>
          </div>
          <p className="text-sm font-semibold text-slate-600 mb-1">Service catalog will appear here</p>
          <p className="text-xs text-slate-400">Add your first service to get started</p>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}

function PriceBookPanel() {
  return (
    <SettingsSection title="Price Book" description="Standardized prices generated from your services and estimates.">
      <div className="flex justify-end mb-3">
        <button className="flex items-center gap-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition rounded-lg px-4 py-2">
          <Plus className="w-3.5 h-3.5" /> Add Price
        </button>
      </div>
      <SettingsCard>
        <div className="px-5 py-12 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📖</span>
          </div>
          <p className="text-sm font-semibold text-slate-600 mb-1">Price Book is empty</p>
          <p className="text-xs text-slate-400">Prices will be generated from services and estimates</p>
        </div>
      </SettingsCard>
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

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function Settings() {
  const [activeSection, setActiveSection] = useState('company');

  // Local state per section (mock — no backend yet)
  const [company, setCompany] = useState({ name: 'FSM Pro', email: 'info@fsmpro.com', phone: '(503) 555-0100', address: 'Portland, OR 97201', license: '' });
  const [documents, setDocuments] = useState({ template: 'pro', showLogo: true, showStatus: true, estimateFormat: 'EST-{number}', invoiceFormat: 'INV-{number}', defaultNotes: '' });
  const [labor, setLabor] = useState({ payPolicy: 'employee_unpaid_break', breakMinutes: 30, breakPaid: false, allowManualAdjustments: true });
  const [payments, setPayments] = useState({ methods: ['Cash', 'Check', 'Card', 'Zelle'], autoReceipt: false });
  const [general, setGeneral] = useState({ timezone: 'America/Los_Angeles', dateFormat: 'MM/DD/YYYY', currency: 'USD' });

  const panels = {
    company:   <CompanyPanel   state={company}   set={setCompany}   />,
    documents: <DocumentsPanel state={documents} set={setDocuments} />,
    services:  <ServicesPanel />,
    pricebook: <PriceBookPanel />,
    labor:     <LaborPanel     state={labor}     set={setLabor}     />,
    payments:  <PaymentsPanel  state={payments}  set={setPayments}  />,
    general:   <GeneralPanel   state={general}   set={setGeneral}   />,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-8 py-5 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage your account and application preferences</p>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-slate-100 p-4 overflow-y-auto">
          <SettingsSidebar active={activeSection} onChange={setActiveSection} />
        </div>

        {/* Main Panel */}
        <div className="flex-1 overflow-y-auto px-10 py-8 max-w-3xl">
          {panels[activeSection]}
        </div>
      </div>
    </div>
  );
}