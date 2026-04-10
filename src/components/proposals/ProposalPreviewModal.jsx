import React, { useRef } from 'react';
import { X, Printer, Send } from 'lucide-react';

const fmtCurrency = (n) => `$${(parseFloat(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const parseProposalDetails = (proposal) => {
  if (!proposal?.notes) return {};
  try {
    const parsed = typeof proposal.notes === 'string' ? JSON.parse(proposal.notes) : proposal.notes;
    return parsed?.proposalDetails || {};
  } catch (e) {
    return {};
  }
};

export default function ProposalPreviewModal({ proposal, proposalDetails = {}, open, onClose, onSend }) {
  const printRef = useRef(null);

  if (!open || !proposal) return null;

  const handlePrint = () => {
    const content = printRef.current?.innerHTML || '';
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Proposal #${proposal.proposal_number}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; font-size: 14px; }
            h1 { font-size: 24px; font-weight: 800; }
            h2 { font-size: 16px; font-weight: 700; margin-top: 24px; margin-bottom: 12px; }
            h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th { padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; border-bottom: 2px solid #e2e8f0; background: #f8fafc; }
            td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
            .text-right { text-align: right; }
            .total-row { font-weight: 700; font-size: 16px; border-top: 2px solid #334155; }
            .header-grid { display: flex; justify-content: space-between; margin-bottom: 32px; }
            .totals-section { max-width: 280px; margin-left: auto; }
            .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
            .terms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>${content}</body>
      </html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const canSend = !['sent', 'approved', 'accepted', 'converted_to_invoice', 'converted_to_work_order'].includes(proposal.status);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[90vh]">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-800">Proposal Preview — #{proposal.proposal_number}</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
            {canSend && onSend && (
              <button onClick={() => { onClose(); onSend(); }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                <Send className="w-3.5 h-3.5" /> Send to Client
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document */}
        <div className="overflow-auto flex-1 p-8 bg-slate-50">
          <div ref={printRef} className="bg-white rounded-xl border border-slate-200 p-10 max-w-2xl mx-auto shadow-sm">

            {/* Document header */}
            <div className="header-grid flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">PROPOSAL</h1>
                <p className="text-slate-400 text-sm mt-1">#{proposal.proposal_number}</p>
                <p className="text-slate-500 text-xs mt-0.5">Date: {new Date().toLocaleDateString()}</p>
                {proposal.expiration_date && (
                  <p className="text-xs mt-0.5 text-amber-600 font-medium">Expires: {proposal.expiration_date}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-lg text-slate-900">{proposal.client_name}</p>
                {proposal.client_address && <p className="text-sm text-slate-500 mt-0.5">{proposal.client_address}</p>}
                {proposal.client_email && <p className="text-sm text-slate-500">{proposal.client_email}</p>}
                {proposal.client_phone && <p className="text-sm text-slate-500">{proposal.client_phone}</p>}
              </div>
            </div>

            {proposal.title && (
              <h2 className="text-lg font-bold text-slate-800 mb-5 pb-3 border-b border-slate-100">{proposal.title}</h2>
            )}

            {/* Scope of Work */}
            {(proposalDetails.scopeOfWork || parseProposalDetails(proposal).scopeOfWork) && (
              <div className="mt-8 mb-6">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Scope of Work</h3>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {proposalDetails.scopeOfWork || parseProposalDetails(proposal).scopeOfWork}
                </p>
              </div>
            )}

            {/* Line items */}
            <table className="w-full mb-6" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Service', 'Notes', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                    <th key={h} className="py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400"
                      style={{ textAlign: i >= 3 ? 'right' : i === 2 ? 'center' : 'left', paddingLeft: 8, paddingRight: 8 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(proposal.items || []).map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td className="py-3 px-2">
                      <p className="font-semibold text-slate-800 text-sm">{item.service_name}</p>
                    </td>
                    <td className="py-3 px-2 text-xs text-slate-400">{item.description}</td>
                    <td className="py-3 px-2 text-center text-sm text-slate-600">{item.quantity} {item.unit}</td>
                    <td className="py-3 px-2 text-right text-sm text-slate-600">{fmtCurrency(item.unit_price)}</td>
                    <td className="py-3 px-2 text-right font-bold text-slate-900">{fmtCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Inclusions */}
            {(proposalDetails.inclusions || parseProposalDetails(proposal).inclusions) && (
              <div className="mt-6 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">What's Included</h3>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {proposalDetails.inclusions || parseProposalDetails(proposal).inclusions}
                </p>
              </div>
            )}

            {/* Exclusions */}
            {(proposalDetails.exclusions || parseProposalDetails(proposal).exclusions) && (
              <div className="mt-4 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">What's Excluded</h3>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {proposalDetails.exclusions || parseProposalDetails(proposal).exclusions}
                </p>
              </div>
            )}

            {/* Timeline */}
            {(proposalDetails.timeline || parseProposalDetails(proposal).timeline) && (
              <div className="mt-6 mb-6 border-t border-slate-100 pt-6">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Project Timeline</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {proposalDetails.timeline || parseProposalDetails(proposal).timeline}
                </p>
              </div>
            )}

            {/* Totals */}
            <div className="max-w-xs ml-auto space-y-2 mb-8">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span><span className="font-semibold">{fmtCurrency(proposal.subtotal)}</span>
              </div>
              {(proposal.discount_value || 0) > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Discount</span><span className="text-red-500">-{fmtCurrency(proposal.discount_value)}</span>
                </div>
              )}
              {(proposal.tax_rate || 0) > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Tax ({proposal.tax_rate}%)</span><span>{fmtCurrency(proposal.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-black text-slate-900 pt-3 border-t-2 border-slate-800">
                <span>TOTAL</span>
                <span className="text-primary">{fmtCurrency(proposal.total_amount)}</span>
              </div>
            </div>

            {/* Terms */}
            {(proposal.payment_terms || proposal.legal_terms) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-100 pt-6">
                {proposal.payment_terms && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Payment Terms</h3>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{proposal.payment_terms}</p>
                  </div>
                )}
                {proposal.legal_terms && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Terms & Conditions</h3>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{proposal.legal_terms}</p>
                  </div>
                )}
              </div>
            )}

            {/* Client Acceptance Block */}
            <div className="mt-12 pt-8 border-t-2 border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-6">Client Acceptance</h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Authorized Signature</p>
                  <div className="h-12 border-b-2 border-slate-800 mb-1"></div>
                  <p className="text-[10px] text-slate-500 italic">Client or Authorized Representative</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Date</p>
                  <div className="h-12 border-b-2 border-slate-800 mb-1"></div>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-6 leading-relaxed">
                By signing above, you authorize and accept the terms, scope, and pricing outlined in this proposal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}