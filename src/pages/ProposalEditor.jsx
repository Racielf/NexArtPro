import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { X, Eye, Save, ChevronRight, Trash2 } from 'lucide-react';
import ProposalSidebarCustomer from '@/components/proposals/ProposalSidebarCustomer';
import ProposalActionsPanel from '@/components/proposals/ProposalActionsPanel';
import ProposalLineItems from '@/components/proposals/ProposalLineItems';
import ProposalPreviewModal from '@/components/proposals/ProposalPreviewModal';
import ProposalSendModal from '@/components/proposals/ProposalSendModal';
import CommTimeline from '@/components/shared/CommTimeline';
import NewEstimateCustomerPanel from '@/components/estimates/NewEstimateCustomerPanel';

const STATUS_BADGE = {
  draft:                   { label: 'Draft',              cls: 'bg-slate-100 text-slate-600' },
  review_needed:           { label: 'Review Needed',      cls: 'bg-amber-100 text-amber-700' },
  sent:                    { label: 'Sent',               cls: 'bg-blue-100 text-blue-700' },
  approved:                { label: 'Approved',           cls: 'bg-emerald-100 text-emerald-800' },
  accepted:                { label: 'Accepted',           cls: 'bg-emerald-100 text-emerald-800' },
  rejected:                { label: 'Rejected',           cls: 'bg-red-100 text-red-700' },
  converted_to_invoice:    { label: 'Invoiced',           cls: 'bg-teal-700 text-white' },
  converted_to_work_order: { label: 'Work Order',         cls: 'bg-purple-700 text-white' },
  pending_adjustment:      { label: 'Pending Adjustment', cls: 'bg-amber-100 text-amber-800' },
};

export default function ProposalEditor() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const proposalId = urlParams.get('id');
  const isNew = urlParams.get('new') === '1';

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const pdfElementRef = useRef(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    if (!proposalId) { setLoading(false); return; }
    const list = await base44.entities.Proposal.filter({ id: proposalId });
    if (list.length) setProposal(list[0]);
    setLoading(false);
  };

  const handleSave = async (updatedProposal) => {
    setSaving(true);
    
    // Coerce string numbers to actual numbers in items
    const sanitized = { ...updatedProposal };
    if (sanitized.items && Array.isArray(sanitized.items)) {
      sanitized.items = sanitized.items.map(item => ({
        ...item,
        quantity: item.quantity != null ? parseFloat(item.quantity) || 0 : 0,
        unit_price: item.unit_price != null ? parseFloat(item.unit_price) || 0 : 0,
        line_total: item.line_total != null ? parseFloat(item.line_total) || 0 : 0,
      }));
    }
    
    await base44.entities.Proposal.update(proposalId, sanitized);
    setProposal(sanitized);
    setSaving(false);
  };

  const handleCustomerChange = async (customerData, _clientRecord) => {
    setSaving(true);
    const updated = { ...proposal, ...customerData };
    await base44.entities.Proposal.update(proposalId, updated);
    setProposal(updated);
    setSaving(false);
    if (customerData.client_name) toast.success('Customer saved');
  };

  const handleStatusChange = (newStatus, extra = {}) => {
    setProposal(p => ({ ...p, status: newStatus, ...extra }));
  };

  const handleCancel = () => {
    const isEmpty = !proposal?.client_name && !proposal?.title;
    if (isNew && isEmpty) {
      setShowDiscardConfirm(true);
    } else {
      navigate('/proposals');
    }
  };

  const handleDiscard = async () => {
    if (proposalId) await base44.entities.Proposal.delete(proposalId);
    navigate('/proposals');
  };

  const handleSent = async () => {
    const updated = { ...proposal, status: 'sent', sent_at: new Date().toISOString() };
    await base44.entities.Proposal.update(proposalId, updated);
    setProposal(updated);
    setShowSend(false);
    toast.success('Proposal sent — client link is now active');
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!proposal) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="text-center">
        <p className="text-slate-500 mb-4">Proposal not found</p>
        <button onClick={() => navigate('/proposals')} className="text-sm text-primary hover:underline">← Back to Proposals</button>
      </div>
    </div>
  );

  const hasClient = !!proposal.client_name;
  const isLocked = ['converted_to_invoice', 'converted_to_work_order'].includes(proposal.status);
  const statusBadge = STATUS_BADGE[proposal.status] || STATUS_BADGE.draft;
  const totalFmt = proposal.total_amount != null
    ? `$${parseFloat(proposal.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    : '—';

  return (
    <div className="fixed inset-0 bg-[#f0f2f5] flex flex-col z-50 font-inter">

      {/* TOP BAR */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
        <div className="flex items-center px-4 h-11 gap-3 relative">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs font-bold text-slate-400 tracking-widest uppercase flex-shrink-0">PROP</span>
            <span className="text-base font-bold text-slate-900 flex-shrink-0">#{proposal.proposal_number}</span>
            {hasClient && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-700 truncate">{proposal.client_name}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <button onClick={() => setShowPreview(true)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Preview document">
              <Eye className="w-4 h-4" />
            </button>
            {saving && (
              <span className="text-xs text-slate-400 flex items-center gap-1 ml-1">
                <Save className="w-3 h-3 animate-pulse" />
              </span>
            )}
          </div>

          <button onClick={handleCancel}
            className="ml-3 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-0 px-4 h-8 bg-slate-50 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 pr-4 border-r border-slate-200">
            <span className="text-slate-400 font-medium">Total</span>
            <span className="font-bold text-slate-900 tabular-nums">{totalFmt}</span>
          </div>
          <div className="flex items-center gap-1.5 px-4 border-r border-slate-200">
            <span className="text-slate-400 font-medium">Status</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          </div>
          {proposal.title && (
            <div className="flex items-center gap-1.5 px-4">
              <span className="text-slate-400 font-medium">Project</span>
              <span className="font-semibold text-slate-700 truncate max-w-[200px]">{proposal.title}</span>
            </div>
          )}
          {proposal.source_estimate_id && (
            <div className="flex items-center gap-1.5 px-4">
              <span className="text-slate-400 font-medium">From Estimate</span>
            </div>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div className="w-56 flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white flex flex-col min-h-0">
          {isNew && !hasClient ? (
            <NewEstimateCustomerPanel
              estimate={proposal}
              docType="Proposal"
              docNumber={proposal?.proposal_number}
              onCustomerSet={async (customerData, clientRecord) => {
                await handleCustomerChange(customerData, clientRecord);
              }}
            />
          ) : (
            <ProposalSidebarCustomer
              proposal={proposal}
              onCustomerChange={handleCustomerChange}
            />
          )}
          {hasClient && (
            <div className="px-4 pb-5 pt-3 border-t border-slate-100 flex-shrink-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Communications</p>
              <CommTimeline estimateId={proposal.id} />
            </div>
          )}
        </div>

        {/* ACTIONS PANEL */}
        {hasClient && (
          <ProposalActionsPanel
            proposal={proposal}
            onStatusChange={handleStatusChange}
            onOpenPreview={() => setShowPreview(true)}
            onOpenSend={() => setShowSend(true)}
            pdfElementRef={pdfElementRef}
          />
        )}

        {/* CANVAS */}
        <div className="flex-1 overflow-auto px-4 py-3">
          {!hasClient && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-amber-700">
              <span className="font-semibold">Tip:</span> Add a customer in the left panel to unlock the full workflow.
            </div>
          )}
          <div ref={pdfElementRef}>
            <ProposalLineItems
              proposal={proposal}
              onSave={handleSave}
              saving={saving}
              locked={isLocked}
            />
          </div>
        </div>
      </div>

      {/* MODALS */}
      <ProposalPreviewModal
        proposal={proposal}
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onSend={() => setShowSend(true)}
      />

      {showSend && (
        <ProposalSendModal
          proposal={proposal}
          onClose={() => setShowSend(false)}
          onSent={handleSent}
        />
      )}

      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-bold text-slate-900 mb-2">Discard this proposal?</h2>
            <p className="text-sm text-slate-500 mb-6">
              This proposal hasn't been saved yet. Cancelling will delete it permanently.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Keep Editing
              </button>
              <button onClick={handleDiscard}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}