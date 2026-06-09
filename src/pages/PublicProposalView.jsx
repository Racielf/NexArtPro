import React, { useState, useEffect } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { CheckCircle, Loader2 } from 'lucide-react';
import { trackProposalView, acceptProposal } from '@/lib/documentAcceptance';
import { mapProposalToEstimate } from '@/lib/proposalDocumentMapper';
import DocumentTypeRenderer from '@/components/documents/DocumentTypeRenderer';

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
    nexartClient.entities.Proposal.filter({ id: proposalId }).then(res => {
      const p = res[0] || null;
      setProposal(p);
      if (p?.status === 'accepted') setAccepted(true);
      setLoading(false);
      // Track view via centralized acceptance service
      if (p && !['accepted', 'converted_to_invoice', 'converted_to_work_order'].includes(p.status)) {
        trackProposalView(p.id, p).catch(() => {});
      }
    });
  }, []);

  const handleAccept = async () => {
    if (!name.trim()) { setError('Please enter your full name to accept.'); return; }
    setError('');
    setAccepting(true);

    const updates = await acceptProposal(proposalId, proposal, {
      acceptanceMethod: 'typed',
      signerName: name.trim(),
      signerEmail: proposal.client_email,
    });

    setProposal(p => ({ ...p, ...updates }));
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

  const estimateData = mapProposalToEstimate(proposal);

  return (
    <div className="min-h-screen bg-slate-50 font-inter">

      {/* Document rendered via unified pipeline */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <DocumentTypeRenderer
          estimate={estimateData}
          options={estimateData.document_config?.options}
          lang={estimateData.document_language}
        />
      </div>

      {/* Accept block */}
      {!accepted && proposal.status === 'sent' && (
        <div className="max-w-4xl mx-auto px-4 pb-10">
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
        </div>
      )}

      {/* Accepted confirmation */}
      {accepted && (
        <div className="max-w-4xl mx-auto px-4 pb-10">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-green-900 mb-1">Proposal Accepted!</h3>
            <p className="text-sm text-green-700 mb-2">Thank you, {proposal.accepted_by_name || 'client'}. Your acceptance has been recorded.</p>
            {proposal.invoice_number && (
              <p className="text-xs text-green-600 font-semibold">Invoice Number: {proposal.invoice_number}</p>
            )}
            <p className="text-xs text-slate-400 mt-3">{proposal.accepted_at ? new Date(proposal.accepted_at).toLocaleString() : ''}</p>
          </div>
        </div>
      )}
    </div>
  );
}