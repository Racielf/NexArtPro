import React from 'react';

export default function EstimatePreview({ estimate }) {
  if (!estimate) return null;

  const items = estimate.line_items || [];
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 0.5in; size: letter; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div id="estimate-print-area" className="bg-white font-inter text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>

        {/* HEADER */}
        <div className="px-10 pt-8 pb-6 flex items-start justify-between border-b border-slate-200">
          {/* Logo / Company */}
          <div>
            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
              <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
                <rect width="40" height="40" rx="8" fill="#1e293b"/>
                <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="font-bold text-slate-900 text-lg leading-tight">FSM Pro</div>
            <div className="text-slate-500 text-xs">Field Service Management</div>
          </div>

          {/* Estimate meta box */}
          <div className="border border-slate-300 rounded-sm text-sm overflow-hidden" style={{ minWidth: 220 }}>
            <div className="grid grid-cols-2">
              <div className="px-3 py-2 bg-slate-50 font-semibold text-slate-600 text-xs border-b border-slate-200">ESTIMATE</div>
              <div className="px-3 py-2 text-right font-bold text-slate-900 text-xs border-b border-slate-200">#{estimate.estimate_number}</div>
              <div className="px-3 py-2 bg-slate-50 font-semibold text-slate-600 text-xs border-b border-slate-200">ESTIMATE DATE</div>
              <div className="px-3 py-2 text-right text-slate-700 text-xs border-b border-slate-200">{today}</div>
              {estimate.expiration_date && (
                <>
                  <div className="px-3 py-2 bg-slate-50 font-semibold text-slate-600 text-xs border-b border-slate-200">EXPIRATION DATE</div>
                  <div className="px-3 py-2 text-right text-slate-700 text-xs border-b border-slate-200">{estimate.expiration_date}</div>
                </>
              )}
              <div className="px-3 py-2 bg-slate-800 font-bold text-white text-xs">TOTAL</div>
              <div className="px-3 py-2 text-right font-bold text-slate-900 text-xs">${(estimate.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>

        {/* CLIENT + CONTACT */}
        <div className="px-10 py-6 grid grid-cols-2 gap-8 border-b border-slate-200">
          <div>
            <div className="font-bold text-slate-900 text-base">{estimate.client_name}</div>
            {estimate.client_address && (
              <div className="text-slate-600 text-sm mt-1 leading-relaxed">{estimate.client_address}</div>
            )}
            {estimate.client_email && (
              <div className="text-slate-500 text-xs mt-2 flex items-center gap-1.5">
                <span>✉</span> {estimate.client_email}
              </div>
            )}
            {estimate.client_phone && (
              <div className="text-slate-500 text-xs mt-1 flex items-center gap-1.5">
                <span>📞</span> {estimate.client_phone}
              </div>
            )}
          </div>
          <div>
            {estimate.title && (
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Project</div>
                <div className="font-semibold text-slate-800">{estimate.title}</div>
              </div>
            )}
            {estimate.assigned_to && (
              <div className="mt-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Technician</div>
                <div className="text-slate-700">{estimate.assigned_to}</div>
              </div>
            )}
          </div>
        </div>

        {/* ESTIMATE LABEL */}
        <div className="px-10 pt-6 pb-2">
          <div className="font-bold text-slate-900 text-base tracking-wide uppercase">Estimate</div>
        </div>

        {/* LINE ITEMS TABLE */}
        <div className="px-10 pb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#64748b', color: 'white' }}>
                <th className="text-left px-3 py-2 font-semibold text-xs">Services</th>
                <th className="text-right px-3 py-2 font-semibold text-xs w-20">qty</th>
                <th className="text-right px-3 py-2 font-semibold text-xs w-24">unit price</th>
                <th className="text-right px-3 py-2 font-semibold text-xs w-24">amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id || idx} className="border-b border-slate-100">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-900">{item.name}</div>
                    {item.description && <div className="text-slate-500 text-xs mt-0.5">{item.description}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{item.quantity?.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">${(item.unit_price || 0).toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-900">${(item.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Subtotal */}
          <div className="flex justify-end pt-3 pr-0">
            <div className="text-sm text-slate-500">
              Services subtotal: <span className="font-semibold text-slate-800">${(estimate.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* TOTALS */}
        <div className="px-10 pb-6">
          <div className="flex justify-end">
            <div className="w-64 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">${(estimate.subtotal || 0).toFixed(2)}</span>
              </div>
              {estimate.tax_rate > 0 && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Tax ({estimate.tax_rate}%)</span>
                  <span className="font-medium">${(estimate.tax_amount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 mt-1">
                <span className="font-bold text-slate-900">Total</span>
                <span className="font-bold text-slate-900 text-base">${(estimate.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* NOTES */}
        {estimate.notes && (
          <div className="px-10 pb-6">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes</div>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{estimate.notes}</p>
          </div>
        )}

        {/* SIGNATURE */}
        <div className="px-10 pt-6 pb-10 border-t border-slate-200 mt-4">
          <div className="grid grid-cols-2 gap-16">
            <div>
              <div className="border-b-2 border-slate-300 mb-2 pb-8"></div>
              <p className="text-xs text-slate-400">Customer Signature</p>
            </div>
            <div>
              <div className="border-b-2 border-slate-300 mb-2 pb-8"></div>
              <p className="text-xs text-slate-400">Date</p>
            </div>
          </div>
          <div className="text-center text-xs text-slate-400 mt-10">
            FSM Pro · Portland, OR · info@fsmpro.com
          </div>
        </div>
      </div>
    </>
  );
}