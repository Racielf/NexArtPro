import React from 'react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';

/**
 * FinalDocumentRenderer — Renderiza SOLO el DocumentData.
 * Sin cálculos, sin transformaciones.
 * Recibe datos ya preparados del mapper.
 */
export default function FinalDocumentRenderer({ documentData }) {
  if (!documentData) return null;

  return (
    <div className="w-full bg-white">
      {/* Header */}
      <div className="px-8 pt-7 pb-6 flex items-start justify-between border-b border-slate-100">
        <div>
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-3">
            <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
              <rect width="40" height="40" rx="8" fill="#1e293b"/>
              <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="font-bold text-slate-900 text-lg">{appConfig.company.name}</div>
          <div className="text-slate-400 text-xs">{appConfig.company.tagline}</div>
          <div className="text-slate-400 text-xs mt-1">{appConfig.company.city} · {appConfig.company.email}</div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
          <div className="grid grid-cols-2">
            <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500">ESTIMATE</div>
            <div className="px-4 py-2 text-right text-xs font-bold text-slate-900">#{documentData.estimate_number}</div>
            <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 border-t border-slate-100">DATE</div>
            <div className="px-4 py-2 text-right text-xs text-slate-600 border-t border-slate-100">{documentData.today}</div>
            {documentData.expiration_date && (
              <>
                <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 border-t border-slate-100">EXPIRES</div>
                <div className="px-4 py-2 text-right text-xs text-slate-600 border-t border-slate-100">{documentData.expiration_date}</div>
              </>
            )}
            <div className="px-4 py-2 bg-slate-800 text-xs font-bold text-white border-t border-slate-100">TOTAL</div>
            <div className="px-4 py-2 text-right text-xs font-bold text-slate-900 border-t border-slate-100">
              ${(documentData.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Bill To + Project */}
      <div className="px-8 py-5 grid grid-cols-2 gap-8 border-b border-slate-100">
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Bill To</div>
          <div className="font-semibold text-slate-900">{documentData.client_name}</div>
          {documentData.client_address && <div className="text-slate-500 text-sm mt-1">{documentData.client_address}</div>}
          {documentData.client_email && <div className="text-slate-400 text-xs mt-1">{documentData.client_email}</div>}
          {documentData.client_phone && <div className="text-slate-400 text-xs mt-0.5">{documentData.client_phone}</div>}
        </div>
        {(documentData.title || documentData.project_start_date) && (
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Project</div>
            {documentData.title && <div className="font-semibold text-slate-800">{documentData.title}</div>}
            {documentData.project_start_date && (
              <div className="text-slate-400 text-xs mt-1">
                {documentData.project_start_date}{documentData.project_end_date && ` – ${documentData.project_end_date}`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {documentData.notes && (
        <div className="px-8 py-4 bg-slate-50 border-b border-slate-100">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Notes</div>
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{documentData.notes}</p>
        </div>
      )}

      {/* Line Items */}
      <div className="px-8 py-5 border-b border-slate-100">
        {documentData.groups.map((group, gi) => (
          <div key={group.id || gi} className={gi > 0 ? 'mt-6' : ''}>
            {documentData.groups.length > 1 && group.name && (
              <div className="flex items-center justify-between bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-t-lg">
                <span className="uppercase tracking-wide">{group.name}</span>
                <span className="text-white/70">${group.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <table className={`w-full text-sm ${documentData.groups.length > 1 && group.name ? 'border border-t-0 border-slate-200 rounded-b-lg overflow-hidden' : ''}`}>
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left pb-2 pt-2 font-semibold text-slate-600 text-xs uppercase tracking-wide px-1">Service</th>
                  <th className="text-right pb-2 pt-2 font-semibold text-slate-600 text-xs uppercase tracking-wide w-14 px-1">Qty</th>
                  <th className="text-right pb-2 pt-2 font-semibold text-slate-600 text-xs uppercase tracking-wide w-24 px-1">Unit Price</th>
                  <th className="text-right pb-2 pt-2 font-semibold text-slate-600 text-xs uppercase tracking-wide w-24 px-1">Amount</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item, idx) => (
                  <tr key={item.id || idx} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 px-1">
                      <div className="font-medium text-slate-900">{item.service_name}</div>
                      {item.description && <div className="text-slate-400 text-xs mt-0.5">{item.description}</div>}
                    </td>
                    <td className="py-3 text-right text-slate-500 px-1">{item.quantity}</td>
                    <td className="py-3 text-right text-slate-500 px-1">${item.unit_price.toFixed(2)}</td>
                    <td className="py-3 text-right font-semibold text-slate-900 px-1">${item.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="px-8 py-5 border-b border-slate-100">
        <div className="flex justify-end">
          <div className="w-60 text-sm space-y-1.5">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>${documentData.subtotal.toFixed(2)}</span>
            </div>
            {documentData.discount_amount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount</span>
                <span>-${documentData.discount_amount.toFixed(2)}</span>
              </div>
            )}
            {documentData.tax_rate > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Tax ({documentData.tax_rate}%)</span>
                <span>${documentData.tax_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-slate-200">
              <span>Total</span>
              <span>${documentData.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {documentData.deposit_amount > 0 && (
              <div className="flex justify-between text-blue-700 text-xs font-semibold pt-1">
                <span>Deposit Due ({documentData.deposit_percent}%)</span>
                <span>${documentData.deposit_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terms */}
      {[
        { key: 'payment_terms', label: 'Payment Terms' },
        { key: 'exclusions', label: 'Exclusions' },
        { key: 'warranty_terms', label: 'Warranty' },
      ]
        .filter(s => documentData[s.key])
        .map(s => (
          <div key={s.key} className="px-8 py-4 border-b border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</div>
            <p className="text-slate-600 text-sm whitespace-pre-wrap">{documentData[s.key]}</p>
          </div>
        ))}

      {/* Footer */}
      <div className="px-8 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span>{appConfig.company.name} · {appConfig.company.city} · {appConfig.company.email}</span>
        <span>Generated with {appConfig.appName}</span>
      </div>

      {/* Signature */}
      {documentData.status === 'signed' && documentData.signer_name && (
        <div className="px-8 py-5 bg-green-50 border-t border-green-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold text-green-700 uppercase tracking-widest mb-1 flex items-center gap-1">
                🛡️ Digitally Signed
              </div>
              <p className="text-sm font-semibold text-slate-800">{documentData.signer_name}</p>
              <p className="text-xs text-slate-400 mt-1">
                {documentData.signed_at ? new Date(documentData.signed_at).toLocaleString() : ''}
              </p>
            </div>
            {documentData.signature_image_base64 && (
              <div className="border border-green-200 rounded-lg p-2 bg-white">
                <img src={documentData.signature_image_base64} alt="Signature" className="h-14 max-w-[160px] object-contain" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}