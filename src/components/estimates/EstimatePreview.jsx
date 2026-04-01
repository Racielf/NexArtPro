import React from 'react';

export default function EstimatePreview({ estimate }) {
  if (!estimate) return null;

  const items = estimate.line_items || [];

  return (
    <div id="estimate-print-area" className="bg-white font-inter text-sm" style={{ minHeight: '100%' }}>
      {/* Header Band */}
      <div className="bg-slate-900 px-10 py-7 flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold text-white tracking-tight">FSM Pro</div>
          <div className="text-slate-400 text-xs mt-0.5">Field Service Management</div>
          <div className="mt-4 text-slate-300 text-xs space-y-0.5">
            <div>Portland, OR</div>
            <div>info@fsmpro.com</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-white text-3xl font-bold tracking-tight">ESTIMATE</div>
          <div className="text-blue-400 text-xl font-semibold mt-1">#{estimate.estimate_number}</div>
          <div className="mt-3 space-y-1 text-xs text-slate-300">
            <div className="flex justify-end gap-4">
              <span className="text-slate-400">Date:</span>
              <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            {estimate.expiration_date && (
              <div className="flex justify-end gap-4">
                <span className="text-slate-400">Expires:</span>
                <span>{estimate.expiration_date}</span>
              </div>
            )}
            <div className="flex justify-end gap-4">
              <span className="text-slate-400">Status:</span>
              <span className={`font-semibold capitalize ${
                estimate.status === 'approved' ? 'text-green-400' :
                estimate.status === 'declined' ? 'text-red-400' :
                estimate.status === 'sent' ? 'text-blue-400' : 'text-slate-300'
              }`}>{estimate.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Blue accent line */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400" />

      {/* Body */}
      <div className="px-10 py-8">
        {/* Bill To */}
        <div className="flex gap-10 mb-8">
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Bill To</div>
            <div className="font-bold text-slate-900 text-base">{estimate.client_name}</div>
            {estimate.client_address && <div className="text-slate-500 text-sm mt-0.5">{estimate.client_address}</div>}
            {estimate.client_phone && <div className="text-slate-500 text-sm">{estimate.client_phone}</div>}
            {estimate.client_email && <div className="text-slate-500 text-sm">{estimate.client_email}</div>}
          </div>
          {estimate.title && (
            <div className="flex-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Project</div>
              <div className="font-semibold text-slate-900">{estimate.title}</div>
              {estimate.assigned_to && <div className="text-slate-500 text-sm mt-1">Technician: {estimate.assigned_to}</div>}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden border border-slate-200 mb-8">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide">Service / Description</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide w-20">Qty</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide w-28">Unit Price</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-900">{item.name}</div>
                    {item.description && <div className="text-slate-400 text-xs mt-0.5">{item.description}</div>}
                  </td>
                  <td className="px-4 py-3.5 text-center text-slate-600">{item.quantity}</td>
                  <td className="px-4 py-3.5 text-right text-slate-600">${(item.unit_price || 0).toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-900">${(item.total_price || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-72">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-800">${(estimate.subtotal || 0).toFixed(2)}</span>
              </div>
              {estimate.tax_rate > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Tax ({estimate.tax_rate}%)</span>
                  <span className="font-medium text-slate-800">${(estimate.tax_amount || 0).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="mt-2 bg-slate-900 rounded-xl px-5 py-4 flex justify-between items-center">
              <span className="text-white font-bold text-base">TOTAL</span>
              <span className="text-blue-400 font-bold text-xl">${(estimate.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {estimate.notes && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-6 py-4 mb-6">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Notes</div>
            <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">{estimate.notes}</p>
          </div>
        )}

        {/* Signature */}
        <div className="border-t border-slate-200 pt-8 mt-6">
          <div className="grid grid-cols-2 gap-12">
            <div>
              <div className="border-b-2 border-slate-300 pb-8 mb-2"></div>
              <p className="text-xs text-slate-400 font-medium">Customer Signature</p>
            </div>
            <div>
              <div className="border-b-2 border-slate-300 pb-8 mb-2"></div>
              <p className="text-xs text-slate-400 font-medium">Date</p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            Thank you for your business — FSM Pro · Portland, OR · info@fsmpro.com
          </div>
        </div>
      </div>
    </div>
  );
}