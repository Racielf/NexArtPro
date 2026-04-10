import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Eye, Lock, Download, CheckCircle } from 'lucide-react';
import EstimateTemplateRenderer from '@/components/estimates/EstimateTemplateRenderer';
import SignaturePad from '@/components/SignaturePad';

export default function ClientDocumentView() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [document, setDocument] = useState(null);
  const [docType, setDocType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [clientName, setClientName] = useState('');
  const [signature, setSignature] = useState(null);

  useEffect(() => {
    loadDocument();
  }, [token]);

  const loadDocument = async () => {
    if (!token) {
      setError('Invalid access link');
      setLoading(false);
      return;
    }

    try {
      // Try to find document by token in document_token field
      // For now, we'll search through proposals, estimates, and invoices
      
      const [proposals, estimates, invoices] = await Promise.all([
        base44.entities.Proposal.filter({ document_token: token }).catch(() => []),
        base44.entities.Estimate.filter({ document_token: token }).catch(() => []),
        base44.entities.Invoice.filter({ document_token: token }).catch(() => []),
      ]);

      if (proposals.length > 0) {
        setDocument(proposals[0]);
        setDocType('proposal');
        setLoading(false);
        return;
      }

      if (estimates.length > 0) {
        setDocument(estimates[0]);
        setDocType('estimate');
        setLoading(false);
        return;
      }

      if (invoices.length > 0) {
        setDocument(invoices[0]);
        setDocType('invoice');
        setLoading(false);
        return;
      }

      setError('Document not found or access expired');
      setLoading(false);
    } catch (err) {
      setError('Unable to load document');
      setLoading(false);
    }
  };

  const handleAcceptProposal = async () => {
    if (!clientName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!signature) {
      toast.error('Please draw your signature');
      return;
    }

    setAccepting(true);
    try {
      const clientIP = await fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(d => d.ip)
        .catch(() => 'unknown');

      await base44.entities.Proposal.update(document.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_name: clientName,
        accepted_ip: clientIP,
        signature_image_base64: signature,
      });

      setDocument(prev => ({
        ...prev,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_name: clientName,
        signature_image_base64: signature,
      }));

      toast.success('Proposal accepted successfully');
    } catch (err) {
      toast.error('Failed to accept proposal');
    } finally {
      setAccepting(false);
    }
  };

  const handleApproveEstimate = async () => {
    setAccepting(true);
    try {
      await base44.entities.Estimate.update(document.id, {
        status: 'approved',
        approved_at: new Date().toISOString(),
      });

      setDocument(prev => ({
        ...prev,
        status: 'approved',
        approved_at: new Date().toISOString(),
      }));

      toast.success('Estimate approved');
    } catch (err) {
      toast.error('Failed to approve estimate');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading document…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center max-w-sm">
          <Lock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-slate-900 mb-1">Access Denied</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <p className="text-slate-500">Document not found</p>
        </div>
      </div>
    );
  }

  const isProposalAccepted = docType === 'proposal' && document.status === 'accepted';
  const isEstimateApproved = docType === 'estimate' && document.status === 'approved';
  const canAcceptProposal = docType === 'proposal' && document.status === 'sent';
  const canApproveEstimate = docType === 'estimate' && document.status === 'sent';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                {docType === 'proposal' ? 'Proposal' : docType === 'estimate' ? 'Estimate' : 'Invoice'}
              </p>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                {document.title || document.client_name}
              </h1>
              <p className="text-sm text-slate-500">
                {docType === 'proposal' && `#${document.proposal_number}`}
                {docType === 'estimate' && `#${document.estimate_number}`}
                {docType === 'invoice' && `#${document.invoice_number}`}
              </p>
            </div>

            {isProposalAccepted && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">Accepted</span>
              </div>
            )}
            {isEstimateApproved && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">Approved</span>
              </div>
            )}
          </div>
        </div>

        {/* Document Content */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-8">
            {docType === 'estimate' || docType === 'invoice' || docType === 'proposal' ? (
              <EstimateTemplateRenderer
                estimate={document}
                editable={false}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500">Unable to display document</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isProposalAccepted && !isEstimateApproved && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            {canAcceptProposal && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Accept This Proposal</h2>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <SignaturePad onSignatureChange={setSignature} />
                <button
                  onClick={handleAcceptProposal}
                  disabled={accepting || !clientName.trim() || !signature}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {accepting ? 'Processing…' : 'Accept Proposal'}
                </button>
              </div>
            )}

            {canApproveEstimate && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Approve This Estimate</h2>
                <button
                  onClick={handleApproveEstimate}
                  disabled={accepting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {accepting ? 'Processing…' : 'Approve Estimate'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-500">
          <p>This is a secure, read-only view of your document.</p>
        </div>
      </div>
    </div>
  );
}