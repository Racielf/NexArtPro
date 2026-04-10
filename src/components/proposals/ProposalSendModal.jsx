import React, { useState } from 'react';
import { X, Send, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ProposalSendModal({ proposal, onClose, onSent }) {
  const [copied, setCopied] = useState(false);
  const publicUrl = `${window.location.origin}/proposal-view?id=${proposal.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Send Proposal to Client</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Recipient</p>
            <p className="text-sm font-bold text-slate-900">{proposal.client_name}</p>
            {proposal.client_email && <p className="text-xs text-slate-400 mt-0.5">{proposal.client_email}</p>}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Client Proposal Link</p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
              <span className="text-xs text-slate-500 flex-1 truncate font-mono">{publicUrl}</span>
              <button onClick={handleCopy}
                className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Share this link with your client. They can view the proposal, see the pricing and terms, and accept or reject it.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700 leading-relaxed">
            Clicking "Confirm & Send" will update the proposal status to <strong>Sent</strong>. Line items will be locked for editing. The client can accept or reject from their view.
          </div>
        </div>

        <div className="flex gap-2 justify-end px-6 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={onSent}
            className="px-5 py-2 text-sm font-semibold bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" /> Confirm & Mark Sent
          </button>
        </div>
      </div>
    </div>
  );
}