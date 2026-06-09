import React from 'react';

const DEFAULT_INVOICE_VIEW_SETTINGS = {
  show_client_address: true,
  show_client_phone: true,
  show_client_email: true,
  show_notes: true,
  show_terms: true,
  show_tax: true,
  show_linked_records: true,
};

const SETTINGS = [
  { key: 'show_client_address', label: 'Client address' },
  { key: 'show_client_phone', label: 'Client phone' },
  { key: 'show_client_email', label: 'Client email' },
  { key: 'show_notes', label: 'Notes' },
  { key: 'show_terms', label: 'Payment terms' },
  { key: 'show_tax', label: 'Tax line' },
  { key: 'show_linked_records', label: 'Linked records' },
];

export function getInvoiceViewSettings(invoice) {
  return {
    ...DEFAULT_INVOICE_VIEW_SETTINGS,
    ...(invoice?.view_settings || {}),
  };
}

export default function InvoiceVisibilityPanel({ invoice, saving = false, onChange }) {
  const settings = getInvoiceViewSettings(invoice);

  return (
    <div className="px-4 py-3.5 border-b border-slate-100 bg-white space-y-3">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customize Invoice</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Control what appears on the invoice document.</p>
      </div>

      <div className="space-y-2">
        {SETTINGS.map(item => (
          <label key={item.key} className="flex items-center justify-between gap-3 text-xs text-slate-600">
            <span className="font-medium">{item.label}</span>
            <input
              type="checkbox"
              checked={!!settings[item.key]}
              disabled={saving}
              onChange={e => onChange?.(item.key, e.target.checked)}
              className="rounded accent-blue-600"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
