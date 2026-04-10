import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, MapPin, Mail, Phone, Loader2 } from 'lucide-react';

export default function PublicProposalView() {
  const urlParams = new URLSearchParams(window.location.search);
  const proposalId = urlParams.get('id');

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [name, setName] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!proposalId) { setLoading(false); return; }
    base44.entities.Proposal.filter({ id: proposalId }).then(res => {
      const p = res[0] || null;
      setProposal(p);
      if (p?.status === 'accepted') setAccepted(true);
      setLoading(false);
      // Track view
      if (p && !['accepted', 'converted_to_invoice', 'converted_to_work_order'].includes(p.status)) {
        const now = new Date().toISOString();
        base44.entities.Proposal.update(p.id, {
          viewed_at: p.viewed_at || now,
          view_count: (p.view_count || 0) + 1,
        }).catch(() => {});
      }
    });
  }, []);

  const fmtCurrency = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const handleAccept = async () => {
    if (!name.trim()) { setError('Please enter your full name to accept.'); return; }
    setError('');
    setAccepting(true);

    // Get IP via public API
    let ip = 'unknown';
    try {
      const r = await fetch('https://api.ipify.org?format=json');
      const d = await r.json();
      ip = d.ip;
    } catch {}

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    await base44.entities.Proposal.update(proposalId, {
      ...proposal,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_ip: ip,
      accepted_by_name: name.trim(),
      invoice_number: invoiceNumber,
    });

    setAccepted(true);
    setAccepting(false);
    setShowConfirm(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  if (!proposal) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500 text-lg">Proposal not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Proposal</p>
            <h1 className="text-2xl font-bold text-slate-900">#{proposal.proposal_number}</h1>
            {proposal.title && <p className="text-slate-600 mt-0.5">{proposal.title}</p>}
          </div>
          <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${
            accepted ? 'bg-green-100 text-green-800' :
            proposal.status === 'sent' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {accepted ? '✓ Accepted' : proposal.status === 'sent' ? 'Awaiting Acceptance' : 'Draft'}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Client Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Prepared For</h2>
          <p className="text-xl font-bold text-slate-900 mb-3">{proposal.client_name}</p>
          <div className="space-y-2">
            {proposal.client_address && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400" />{proposal.client_address}
              </div>
            )}
            {proposal.client_email && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="w-4 h-4 text-slate-400" />{proposal.client_email}
              </div>
            )}
            {proposal.client_phone && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="w-4 h-4 text-slate-400" />{proposal.client_phone}
              </div>
            )}
          </div>
          {proposal.expiration_date && (
            <p className="mt-4 text-xs text-slate-400">Expires: <span className="font-semibold text-slate-600">{proposal.expiration_date}</span></p>
          )}
        </div>

        {/* Project Description */}
        {proposal.notes && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6 mb-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Project Summary</h2>
            <p className="text-base text-slate-700 leading-relaxed">{proposal.notes}</p>
          </div>
        )}

        {/* Services */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scope of Work</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="text-left px-6 py-3">Service</th>
                <th className="text-center px-4 py-3">Qty</th>
                <th className="text-right px-4 py-3">Unit Price</th>
                <th className="text-right px-6 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(proposal.items || []).map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{item.service_name}</p>
                    {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                  </td>
                  <td className="text-center px-4 py-4 text-slate-600">{item.quantity} {item.unit}</td>
                  <td className="text-right px-4 py-4 text-slate-600">${(item.unit_price || 0).toFixed(2)}</td>
                  <td className="text-right px-6 py-4 font-bold text-slate-900">${(item.line_total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-slate-200 px-6 py-5 bg-slate-50">
            <div className="max-w-xs ml-auto space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span><span>{fmtCurrency(proposal.subtotal)}</span>
              </div>
              {proposal.discount_value > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Discount</span><span>-{fmtCurrency(proposal.discount_value)}</span>
                </div>
              )}
              {proposal.tax_rate > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({proposal.tax_rate}%)</span><span>{fmtCurrency(proposal.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-black text-white pt-3 border-t-2 border-primary bg-primary rounded-xl px-4 py-3 mt-3">
                <span>Total Amount</span><span>{fmtCurrency(proposal.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms */}
        {(proposal.payment_terms || proposal.legal_terms) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proposal.payment_terms && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Terms</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{proposal.payment_terms}</p>
              </div>
            )}
            {proposal.legal_terms && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Terms & Conditions</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{proposal.legal_terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Closing CTA Section */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 mb-6">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Next Steps</h3>
          <p className="text-slate-700 font-medium mb-4">To move forward with this project, please review the proposal above and accept to confirm your commitment.</p>
          {proposal.payment_terms && (
            <div className="bg-white rounded-lg p-3 border border-slate-100 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Payment Terms:</span> {proposal.payment_terms}
            </div>
          )}
        </div>

        {/* Accept block */}
        {!accepted && proposal.status === 'sent' && (
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary rounded-2xl p-8 text-center shadow-lg">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Ready to proceed?</h3>
            <p className="text-sm text-slate-500 mb-4">By accepting this proposal, you agree to the terms and pricing above.</p>
            {!showConfirm ? (
              <button onClick={() => setShowConfirm(true)}
                className="px-8 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors shadow-md">
                Accept Proposal
              </button>
            ) : (
              <div className="max-w-sm mx-auto">
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(''); }}
                  placeholder="Enter your full name to sign"
                  className="w-full h-11 px-4 text-sm border border-slate-300 rounded-xl mb-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setShowConfirm(false)} className="px-4 py-2.5 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleAccept} disabled={accepting}
                    className="px-6 py-2.5 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50">
                    {accepting ? 'Processing…' : '✓ Confirm & Accept'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accepted confirmation */}
        {accepted && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-green-900 mb-1">Proposal Accepted!</h3>
            <p className="text-sm text-green-700 mb-2">Thank you, {proposal.accepted_by_name || 'client'}. Your acceptance has been recorded.</p>
            {proposal.invoice_number && (
              <p className="text-xs text-green-600 font-semibold">Invoice Number: {proposal.invoice_number}</p>
            )}
            <p className="text-xs text-slate-400 mt-3">{proposal.accepted_at ? new Date(proposal.accepted_at).toLocaleString() : ''}</p>
          </div>
        )}
      </div>
    </div>
  );
}