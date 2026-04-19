import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Send, CheckCircle, XCircle, RotateCcw, Eye, Printer, Download,
  FileText, ClipboardList, ChevronRight, AlertCircle, FileEdit, Flag
} from 'lucide-react';
import CloseDealModal from '@/components/proposals/CloseDealModal';
import ProposalNextAction from '@/components/proposals/ProposalNextAction';
import ProposalFollowUpWidget from '@/components/proposals/ProposalFollowUpWidget';
import { printEstimate, downloadEstimate } from '@/lib/estimatePrint';
import { mapProposalToEstimate } from '@/lib/proposalDocumentMapper';
import ProposalAdjustmentModal from '@/components/proposals/ProposalAdjustmentModal';
import { validateEstimatePricing } from '@/lib/pricingValidation';
import { canSendDocument } from '@/lib/pricingPermissions';
import { logZeroProfitConfirmation } from '@/lib/pricingAuditService';
import { normalizeUserRole } from '@/lib/utils';
import LossPreventionModal from '@/components/estimates/internal/LossPreventionModal';
import PricingOverrideModal from '@/components/estimates/internal/PricingOverrideModal';
import { mapItemsToGroups } from '@/components/proposals/ProposalEstimateGroupsAdapter';

const STATUS_CONFIG = {
  draft:                   { label: 'Draft',              cls: 'bg-slate-100 text-slate-600' },
  review_needed:           { label: 'Review Needed',      cls: 'bg-amber-100 text-amber-700' },
  sent:                    { label: 'Sent to Client',     cls: 'bg-blue-100 text-blue-700' },
  approved:                { label: 'Approved',           cls: 'bg-emerald-100 text-emerald-800' },
  accepted:                { label: 'Accepted',           cls: 'bg-emerald-100 text-emerald-800' },
  rejected:                { label: 'Rejected',           cls: 'bg-red-100 text-red-700' },
  converted_to_invoice:    { label: 'Invoiced',           cls: 'bg-teal-700 text-white' },
  converted_to_work_order: { label: 'Work Order',         cls: 'bg-purple-700 text-white' },
  pending_adjustment:      { label: 'Pending Adjustment', cls: 'bg-amber-100 text-amber-800' },
};

function ActionBtn({ icon: Icon, label, onClick, disabled, cls = 'text-slate-700 border-slate-200 hover:bg-slate-50' }) {
  const IconComponent = Icon;
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors disabled:opacity-40 ${cls}`}>
      <IconComponent className="w-3.5 h-3.5 flex-shrink-0" />
      {label}
    </button>
  );
}

function SectionLabel({ label }) {
  return <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pt-2 pb-0.5">{label}</p>;
}

function ConvertToInvoiceBtn({ proposal, onConverted }) {
  const [loading, setLoading] = useState(false);
  const [warnAdjust, setWarnAdjust] = useState(false);

  const handle = async () => {
    if (proposal?.adjustment_estimate_id && !warnAdjust) {
      setWarnAdjust(true);
      toast('An Adjustment Estimate exists. Click again to convert directly anyway, or use the Adjustment Estimate path.', { duration: 6000 });
      return;
    }
    setWarnAdjust(false);
    setLoading(true);
    const list = await base44.entities.Invoice.list('-created_date', 20);
    const nextNum = list.length ? Math.max(...list.map(i => i.invoice_number || 0)) + 1 : 1001;

    // Build closing context note: include selected option and close note if available
    const closingContext = [
      proposal.selected_pricing_option_title ? `Winning option: ${proposal.selected_pricing_option_title}` : null,
      proposal.close_note ? `Sales note: ${proposal.close_note}` : null,
    ].filter(Boolean).join('\n');
    const internalNotes = closingContext || undefined;

    const inv = await base44.entities.Invoice.create({
      invoice_number: nextNum,
      client_id: proposal.client_id,
      client_name: proposal.client_name,
      client_email: proposal.client_email,
      client_address: proposal.client_address,
      client_phone: proposal.client_phone,
      title: proposal.title,
      line_items: proposal.items || [],
      subtotal: proposal.subtotal,
      tax_rate: proposal.tax_rate,
      tax_amount: proposal.tax_amount,
      discount_type: 'fixed',
      discount_value: proposal.discount_value || 0,
      discount_amount: proposal.discount_value || 0,
      total: proposal.total_amount,
      payment_terms: proposal.payment_terms,
      notes: proposal.notes,
      internal_notes: internalNotes,
      status: 'draft',
      // Conversion traceability
      source_proposal_id: proposal.id,
      source_proposal_number: proposal.proposal_number || null,
      source_close_outcome: proposal.close_outcome || null,
      source_selected_pricing_option_id: proposal.selected_pricing_option_id || null,
      source_selected_pricing_option_title: proposal.selected_pricing_option_title || null,
    });
    await base44.entities.Proposal.update(proposal.id, {
      invoice_id: inv.id,
      invoice_number: String(nextNum),
      status: 'converted_to_invoice',
    });
    setLoading(false);
    toast.success(`Invoice #${nextNum} created`);
    onConverted('converted_to_invoice', { invoice_id: inv.id, invoice_number: String(nextNum) });
  };

  return (
    <ActionBtn icon={FileText} label={loading ? 'Creating…' : 'Convert to Invoice'}
      onClick={handle} disabled={loading} cls="text-emerald-700 border-emerald-200 hover:bg-emerald-50" />
  );
}

function ConvertToWorkOrderBtn({ proposal, onConverted }) {
  const [loading, setLoading] = useState(false);
  const [warnAdjust, setWarnAdjust] = useState(false);

  const handle = async () => {
    if (proposal?.adjustment_estimate_id && !warnAdjust) {
      setWarnAdjust(true);
      toast('An Adjustment Estimate exists. Click again to convert directly anyway, or use the Adjustment Estimate path.', { duration: 6000 });
      return;
    }
    setWarnAdjust(false);
    setLoading(true);
    const list = await base44.entities.WorkOrder.list('-created_date', 20);
    const nextNum = list.length ? Math.max(...list.map(w => w.work_order_number || 0)) + 1 : 1001;
    const scopeItems = (proposal.items || []).map(it => ({
      id: it.id,
      service_name: it.service_name,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
    }));
    const scopeDescription = scopeItems
      .filter(it => it.service_name)
      .map(it => `• ${it.service_name}${it.quantity ? ` (${it.quantity}${it.unit ? ' ' + it.unit : ''})` : ''}${it.description ? ': ' + it.description : ''}`)
      .join('\n');

    // Generate tasks from proposal items (same structure as Estimate path)
    const tasks = [];
    let order = 0;
    (proposal.items || []).forEach(item => {
      tasks.push({
        id: `task-${order}`,
        title: item.service_name || `Task ${order + 1}`,
        description: item.description || '',
        status: 'pending',
        assigned_to: '',
        order: order++,
        started_at: null,
        completed_at: null
      });
    });

    // Build handoff internal note for field crew
    const handoffParts = [
      proposal.selected_pricing_option_title ? `Approved option: ${proposal.selected_pricing_option_title}` : null,
      proposal.close_outcome === 'won' ? `Deal closed: Won${proposal.closed_at ? ' on ' + new Date(proposal.closed_at).toLocaleDateString() : ''}` : null,
      proposal.close_note ? `Sales handoff note: ${proposal.close_note}` : null,
    ].filter(Boolean).join('\n');
    const internalNotes = handoffParts || undefined;

    const wo = await base44.entities.WorkOrder.create({
      work_order_number: nextNum,
      client_id: proposal.client_id,
      client_name: proposal.client_name,
      client_email: proposal.client_email,
      client_address: proposal.client_address,
      client_phone: proposal.client_phone,
      title: proposal.title || 'Work Order from Proposal',
      description: scopeDescription || proposal.notes || '',
      line_items: scopeItems,
      notes: proposal.notes,
      internal_notes: internalNotes,
      status: 'draft',
      tasks: tasks,
      task_statuses: {},
      // Conversion traceability
      source_proposal_id: proposal.id,
      source_proposal_number: proposal.proposal_number || null,
      source_close_outcome: proposal.close_outcome || null,
      source_selected_pricing_option_id: proposal.selected_pricing_option_id || null,
      source_selected_pricing_option_title: proposal.selected_pricing_option_title || null,
    });
    await base44.entities.Proposal.update(proposal.id, {
      work_order_id: wo.id,
      work_order_number: nextNum,
      status: 'converted_to_work_order',
    });
    setLoading(false);
    toast.success(`Work Order #${nextNum} created`);
    onConverted('converted_to_work_order', { work_order_id: wo.id, work_order_number: nextNum });
  };

  return (
    <ActionBtn icon={ClipboardList} label={loading ? 'Creating…' : 'Convert to Work Order'}
      onClick={handle} disabled={loading} cls="text-purple-700 border-purple-200 hover:bg-purple-50" />
  );
}

function ApplyAdjustmentBtn({ proposal, onConverted }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    // Fetch the linked adjustment estimate
    const ests = await base44.entities.Estimate.filter({ id: proposal.adjustment_estimate_id });
    const est = ests[0];
    if (!est) {
      toast.error('Adjustment estimate not found');
      setLoading(false);
      return;
    }

    // Flatten items from groups or line_items
    const items = est.groups
      ? est.groups.flatMap(g => (g.items || []).map(it => ({
          id: it.id,
          service_name: it.service_name,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unit_price,
          line_total: it.line_total,
        })))
      : (est.line_items || []);

    const syncedFields = {
      items,
      subtotal:        est.subtotal        ?? proposal.subtotal,
      tax_rate:        est.tax_rate         ?? proposal.tax_rate,
      tax_amount:      est.tax_amount       ?? proposal.tax_amount,
      discount_value:  est.discount_value   ?? proposal.discount_value,
      total_amount:    est.total            ?? proposal.total_amount,
      notes:           est.notes            ?? proposal.notes,
      payment_terms:   est.payment_terms    ?? proposal.payment_terms,
      legal_terms:     est.legal_terms      ?? proposal.legal_terms,
      status:          'approved',
      approved_at:     new Date().toISOString(),
    };

    await base44.entities.Proposal.update(proposal.id, syncedFields);
    setLoading(false);
    toast.success('Adjustment applied — Proposal updated and approved');
    onConverted('approved', syncedFields);
  };

  return (
    <ActionBtn icon={CheckCircle} label={loading ? 'Applying…' : 'Apply & Approve'}
      onClick={handle} disabled={loading}
      cls="text-emerald-700 border-emerald-200 hover:bg-emerald-50" />
  );
}

export default function ProposalActionsPanel({ proposal: proposalProp, onStatusChange, onOpenPreview, onOpenSend, pdfElementRef }) {
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(proposalProp);
  const [loading, setLoading] = useState(false);

  // Keep local proposal in sync when parent updates
  useEffect(() => { setProposal(proposalProp); }, [proposalProp]);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showCloseDeal, setShowCloseDeal] = useState(false);
  const [closeDealInitialOutcome, setCloseDealInitialOutcome] = useState(null);
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [lossValidation, setLossValidation] = useState({ lossItems: [], zeroProfitItems: [] });
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState('sales');

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      setRole(normalizeUserRole(u?.role));
    }).catch(() => {});
  }, []);
  const status = proposal?.status || 'draft';
  const badge = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const proposalId = proposal?.id;

  const transition = async (newStatus, extra = {}) => {
    setLoading(true);
    await base44.entities.Proposal.update(proposalId, { status: newStatus, ...extra });
    onStatusChange(newStatus, extra);
    setLoading(false);
  };

  const publicUrl = `${window.location.origin}/proposal-view?id=${proposalId}`;
  const handleCopyLink = () => { navigator.clipboard.writeText(publicUrl); toast.success('Client link copied!'); };

  const handleConverted = (newStatus, extra) => onStatusChange(newStatus, extra);

  const pricingOptions = proposal?.proposal_details?.pricingOptions || [];

  const handleCloseDeal = async (closingData) => {
    setLoading(true);
    await base44.entities.Proposal.update(proposalId, closingData);
    onStatusChange(closingData.status, closingData);
    setLoading(false);
    toast.success(closingData.close_outcome === 'won' ? '🏆 Deal marked as Won!' : 'Deal outcome recorded');
  };

  return (
    <>
    <CloseDealModal
      open={showCloseDeal}
      onClose={() => setShowCloseDeal(false)}
      onConfirm={handleCloseDeal}
      pricingOptions={pricingOptions}
      initialOutcome={closeDealInitialOutcome}
    />
    <LossPreventionModal
      open={lossModalOpen}
      onClose={() => setLossModalOpen(false)}
      onProceed={() => {
        setLossModalOpen(false);
        // Log zero-profit confirmation (NOT an override)
        if (proposal?.id && lossValidation.zeroProfitItems?.length > 0) {
          logZeroProfitConfirmation({
            documentId: proposal.id,
            documentKind: 'proposal',
            userEmail: currentUser?.email,
            userRole: role,
            metadata: {
              margin_at_event: parseFloat(proposal.gross_margin_pct) || null,
              total_at_event: parseFloat(proposal.total_amount) || null,
            },
          });
        }
        onOpenSend();
      }}
      lossItems={lossValidation.lossItems}
      zeroProfitItems={lossValidation.zeroProfitItems}
    />
    <PricingOverrideModal
      open={overrideModalOpen}
      onClose={() => setOverrideModalOpen(false)}
      onApproved={() => { setOverrideModalOpen(false); onOpenSend(); }}
      action="send"
      role={role}
      currentUser={currentUser}
      document={proposal}
      documentType="proposal"
      pricingResult={lossValidation}
      lossItems={lossValidation.lossItems}
      zeroProfitItems={lossValidation.zeroProfitItems}
    />
    <ProposalAdjustmentModal
      open={showAdjustment}
      onClose={() => setShowAdjustment(false)}
      proposal={proposal}
      onConverted={handleConverted}
    />
    <div className="w-52 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto flex flex-col">

      {/* Status badge */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</p>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Next Sales Action — decision guidance */}
      <div className="px-3 pt-3">
        <ProposalNextAction proposal={proposal} />
      </div>

      <div className="flex-1 px-3 py-3 space-y-1.5">

        {/* Document actions — always visible */}
        <SectionLabel label="Document" />
        <ActionBtn icon={Eye} label="Preview" onClick={onOpenPreview} />
        <ActionBtn icon={Printer} label="Print" onClick={() => {
          const estimateData = mapProposalToEstimate(proposal);
          printEstimate(estimateData);
        }} />
        <ActionBtn icon={Download} label={downloadingPDF ? 'Generating…' : 'Download PDF'}
          onClick={async () => {
            setDownloadingPDF(true);
            try {
              const estimateData = mapProposalToEstimate(proposal);
              await downloadEstimate(estimateData);
              toast.success('PDF downloaded');
            } catch (err) {
              toast.error('PDF generation failed');
            } finally {
              setDownloadingPDF(false);
            }
          }} disabled={downloadingPDF}
          cls="text-slate-700 border-slate-200 hover:bg-slate-50" />

        {/* Draft / Review Needed */}
        {(status === 'draft' || status === 'review_needed') && (
          <>
            <SectionLabel label="Actions" />
            {status === 'draft' && (
              <ActionBtn icon={AlertCircle} label="Request Review" disabled={loading}
                onClick={() => transition('review_needed')}
                cls="text-amber-700 border-amber-200 hover:bg-amber-50" />
            )}
            <ActionBtn icon={Send} label="Send to Client" disabled={loading}
              onClick={() => {
                if (!proposal.client_email) { toast.error('Client email is required to send'); return; }
                // Loss prevention gate with role-based permissions
                const proxyForValidation = { groups: mapItemsToGroups(proposal.items) };
                const pv = validateEstimatePricing(proxyForValidation);
                if (pv.lossItems.length > 0 || pv.zeroProfitItems.length > 0) {
                  const gate = canSendDocument(role, pv);
                  if (!gate.allowed) {
                    toast.error(gate.blockedReason);
                    return;
                  }
                  if (gate.requiresOverride) {
                    setLossValidation(pv);
                    setOverrideModalOpen(true);
                    return;
                  }
                  if (gate.requiresConfirm) {
                    setLossValidation(pv);
                    setLossModalOpen(true);
                    return;
                  }
                }
                onOpenSend();
              }}
              cls="text-blue-700 border-blue-200 hover:bg-blue-50" />
          </>
        )}

        {/* Sent */}
        {status === 'sent' && (
          <>
            <SectionLabel label="Actions" />
            <ActionBtn icon={Send} label="Copy Client Link" onClick={handleCopyLink}
              cls="text-blue-700 border-blue-200 hover:bg-blue-50" />
            <ActionBtn icon={CheckCircle} label="Mark Approved" disabled={loading}
              onClick={() => transition('approved', { approved_at: new Date().toISOString() })}
              cls="text-emerald-700 border-emerald-200 hover:bg-emerald-50" />
            <ActionBtn icon={XCircle} label="Mark Rejected" disabled={loading}
              onClick={() => transition('rejected', { rejected_at: new Date().toISOString() })}
              cls="text-red-600 border-red-200 hover:bg-red-50" />
            <ActionBtn icon={Flag} label="Close Deal…" disabled={loading}
              onClick={() => { setCloseDealInitialOutcome('won'); setShowCloseDeal(true); }}
              cls="text-violet-700 border-violet-200 hover:bg-violet-50" />
          </>
        )}

        {/* Approved → convert */}
        {(status === 'approved' || status === 'accepted') && (
          <>
            <SectionLabel label="Close Deal" />
            <ActionBtn icon={Flag} label="Close Deal…" disabled={loading}
              onClick={() => { setCloseDealInitialOutcome('won'); setShowCloseDeal(true); }}
              cls="text-violet-700 border-violet-200 hover:bg-violet-50" />
            <SectionLabel label="Convert" />
            {proposal?.invoice_id ? (
              <button onClick={() => navigate(`/invoice-detail?id=${proposal.invoice_id}`)}
                className="w-full text-left text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-3 py-2 font-medium flex items-center gap-1.5 transition-colors">
                <FileText className="w-3 h-3" />Invoice #{proposal.invoice_number || '—'} →
              </button>
            ) : (
              <ConvertToInvoiceBtn proposal={proposal} onConverted={handleConverted} />
            )}
            {proposal?.work_order_id ? (
              <button onClick={() => navigate(`/work-orders/${proposal.work_order_id}`)}
                className="w-full text-left text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg px-3 py-2 font-medium flex items-center gap-1.5 transition-colors">
                <ClipboardList className="w-3 h-3" />WO #{proposal.work_order_number || '—'} →
              </button>
            ) : (
              <ConvertToWorkOrderBtn proposal={proposal} onConverted={handleConverted} />
            )}
          </>
        )}

        {/* Converted — show links */}
        {(status === 'converted_to_invoice' || status === 'converted_to_work_order') && (
          <>
            <SectionLabel label="Linked Records" />
            {proposal?.invoice_id && (
              <button onClick={() => navigate(`/invoice-detail?id=${proposal.invoice_id}`)}
                className="w-full text-left text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-3 py-2 font-medium flex items-center gap-1.5 transition-colors">
                <FileText className="w-3 h-3" />Invoice #{proposal.invoice_number || '—'} →
              </button>
            )}
            {proposal?.work_order_id && (
              <button onClick={() => navigate(`/work-orders/${proposal.work_order_id}`)}
                className="w-full text-left text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg px-3 py-2 font-medium flex items-center gap-1.5 transition-colors">
                <ClipboardList className="w-3 h-3" />WO #{proposal.work_order_number || '—'} →
              </button>
            )}
          </>
        )}

        {/* Rejected */}
        {status === 'rejected' && (
          <>
            <SectionLabel label="Actions" />
            {!proposal?.close_outcome && (
              <ActionBtn icon={Flag} label="Record Loss Reason…" disabled={loading}
                onClick={() => { setCloseDealInitialOutcome('lost'); setShowCloseDeal(true); }}
                cls="text-red-600 border-red-200 hover:bg-red-50" />
            )}
            <ActionBtn icon={RotateCcw} label="Reopen as Draft" disabled={loading}
              onClick={() => transition('draft')}
              cls="text-slate-700 border-slate-200 hover:bg-slate-50" />
          </>
        )}

        {/* Pending Adjustment — show link to adjustment estimate */}
        {status === 'pending_adjustment' && proposal?.adjustment_estimate_id && (
          <>
            <SectionLabel label="Linked Records" />
            <button onClick={() => navigate(`/estimate-editor?id=${proposal.adjustment_estimate_id}`)}
              className="w-full text-left text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-2 font-medium flex items-center gap-1.5 transition-colors">
              <FileEdit className="w-3 h-3" />EST #{proposal.adjustment_estimate_number || '—'} →
            </button>
            <ApplyAdjustmentBtn proposal={proposal} onConverted={handleConverted} />
            <ActionBtn icon={RotateCcw} label="Reopen as Sent" disabled={loading}
              onClick={() => transition('sent')}
              cls="text-slate-700 border-slate-200 hover:bg-slate-50" />
          </>
        )}

        {/* Adjustment button for sent/approved/accepted */}
        {['sent', 'approved', 'accepted'].includes(status) && (
          <>
            <SectionLabel label="Negotiation" />
            <ActionBtn icon={FileEdit} label="Adjustment Estimate" disabled={loading}
              onClick={() => setShowAdjustment(true)}
              cls="text-amber-700 border-amber-200 hover:bg-amber-50" />
          </>
        )}

        {/* Follow-up Widget — active proposals only */}
        <div className="pt-2">
          <ProposalFollowUpWidget
            proposal={proposal}
            onUpdate={(updated) => {
              setProposal(updated);
              onStatusChange(updated.status, updated);
            }}
          />
        </div>

        {/* Metadata */}
        <div className="pt-3 space-y-1 border-t border-slate-100 mt-2">
          {proposal?.sent_at && (
            <p className="text-[10px] text-slate-400">Sent: {new Date(proposal.sent_at).toLocaleDateString()}</p>
          )}
          {proposal?.viewed_at && (
            <p className="text-[10px] text-slate-400">Viewed: {new Date(proposal.viewed_at).toLocaleDateString()}{proposal.view_count > 1 ? ` (${proposal.view_count}×)` : ''}</p>
          )}
          {proposal?.approved_at && (
            <p className="text-[10px] text-emerald-600">Approved: {new Date(proposal.approved_at).toLocaleDateString()}</p>
          )}
          {proposal?.rejected_at && (
            <p className="text-[10px] text-red-500">Rejected: {new Date(proposal.rejected_at).toLocaleDateString()}</p>
          )}
          {/* Closing metadata */}
          {proposal?.close_outcome && (
            <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5">
              <p className={`text-[10px] font-bold uppercase tracking-wide ${proposal.close_outcome === 'won' ? 'text-emerald-600' : 'text-red-500'}`}>
                {proposal.close_outcome === 'won' ? '🏆 Won' : proposal.close_outcome === 'lost' ? '❌ Lost' : proposal.close_outcome === 'no_response' ? '⏸ No Response' : '↩ Withdrawn'}
              </p>
              {proposal?.closed_at && (
                <p className="text-[10px] text-slate-400">Closed: {new Date(proposal.closed_at).toLocaleDateString()}</p>
              )}
              {proposal?.lost_reason && (
                <p className="text-[10px] text-slate-400 capitalize">{proposal.lost_reason.replace(/_/g, ' ')}</p>
              )}
              {proposal?.selected_pricing_option_title && (
                <p className="text-[10px] text-violet-600">Option: {proposal.selected_pricing_option_title}</p>
              )}
              {proposal?.close_note && (
                <p className="text-[10px] text-slate-400 italic truncate" title={proposal.close_note}>{proposal.close_note}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}