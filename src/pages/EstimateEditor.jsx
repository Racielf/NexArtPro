import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeUserRole } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { X, Eye, Save, Trash2, Send, ChevronRight } from 'lucide-react';
import EstimateTemplateSelector from '@/components/estimates/EstimateTemplateSelector';
import EstimateDocumentOptions from '@/components/estimates/EstimateDocumentOptions';
import EstimateActionsPanel from '@/components/estimates/EstimateActionsPanel';
import EstimateGroups from '@/components/estimates/EstimateGroups';
import EstimateSidebarCustomer from '@/components/estimates/EstimateSidebarCustomer';
import CommTimeline from '@/components/shared/CommTimeline';
import EstimateSendReview from '@/components/estimates/EstimateSendReview';
import EstimatePreviewModal from '@/components/estimates/EstimatePreviewModal';
import NewProposalCustomerModal from '@/components/proposals/NewProposalCustomerModal';
import ConvertToWorkOrderButton from '@/components/workorders/ConvertToWorkOrderButton';
import ConvertToInvoiceButton from '@/components/estimates/ConvertToInvoiceButton';
// documentTypeConfig used internally by EstimateActionsPanel
import { getAutoLanguageForClient } from '@/lib/resolveDocumentLanguage';
import PricingAuditHistory from '@/components/estimates/internal/PricingAuditHistory';

export default function EstimateEditor() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const estimateId = urlParams.get('id');
  const isNew = urlParams.get('new') === '1';

  const [estimate, setEstimate] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { base44.auth.me().then(u => setCurrentUser(u)).catch(() => {}); }, []);

  const [showSendModal, setShowSendModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [jobNumber, setJobNumber] = useState('');
  const [planReference, setPlanReference] = useState('');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [dismissedCustomerModal, setDismissedCustomerModal] = useState(false);
  const [showDocumentOptions, setShowDocumentOptions] = useState(false);

  useEffect(() => { loadEstimate(); }, []);

  const loadEstimate = async () => {
    if (!estimateId) { setLoading(false); return; }
    const list = await base44.entities.Estimate.filter({ id: estimateId });
    if (list.length) {
      const est = list[0];
      setEstimate(est);
      setJobNumber(est.job_number || '');
      setPlanReference(est.plan_reference || '');
      if (est.client_id) {
        const cls = await base44.entities.Client.filter({ id: est.client_id });
        if (cls.length) setClient(cls[0]);
      }
    }
    setLoading(false);
  };

  const handleSave = async (updatedEstimate) => {
    setSaving(true);
    
    // Coerce string numbers to actual numbers in groups
    const sanitized = { ...updatedEstimate };
    if (sanitized.groups && Array.isArray(sanitized.groups)) {
      sanitized.groups = sanitized.groups.map(group => ({
        ...group,
        items: (group.items || []).map(item => ({
          ...item,
          quantity: item.quantity != null ? parseFloat(item.quantity) || 0 : 0,
          unit_price: item.unit_price != null ? parseFloat(item.unit_price) || 0 : 0,
          unit_cost: item.unit_cost != null ? parseFloat(item.unit_cost) || 0 : 0,
          line_total: item.line_total != null ? parseFloat(item.line_total) || 0 : 0,
        })),
      }));
    }
    
    await base44.entities.Estimate.update(estimateId, { ...sanitized, updated_by: 'Admin' });
    setEstimate(sanitized);
    setSaving(false);

    const marginPct = parseFloat(updatedEstimate?.gross_margin_pct ?? updatedEstimate?.gross_margin_percent ?? 100);
    const isAdmin = normalizeUserRole(currentUser?.role) === 'admin';
    if (!isNaN(marginPct) && marginPct < 25 && !isAdmin && estimateId) {
      base44.functions.invoke('lowMarginAlert', {
        estimate_id: estimateId,
        estimate_number: updatedEstimate.estimate_number,
        client_name: updatedEstimate.client_name,
        margin_pct: marginPct,
      }).catch(err => console.warn('[lowMarginAlert] Notification failed (non-blocking):', err?.message));
    }
  };

  const handleCustomerChange = async (customerData, clientRecord) => {
    setSaving(true);
    const updated = { ...estimate, ...customerData };
    
    // Auto-resolve document language from client preference (only if not already set)
    const savePayload = { ...updated, updated_by: 'Admin' };
    if (clientRecord) {
      const autoLang = getAutoLanguageForClient(estimate, clientRecord);
      if (autoLang) {
        savePayload.document_language = autoLang;
        updated.document_language = autoLang;
      }
    }
    
    await base44.entities.Estimate.update(estimateId, savePayload);
    setEstimate(updated);
    if (clientRecord) setClient(clientRecord);
    setSaving(false);
    if (customerData.client_name) toast.success('Customer saved');
  };

  const handleTemplateChange = async (templateKey) => {
    const updatedConfig = { ...(estimate.document_config || {}), template: templateKey };
    const updated = { ...estimate, document_config: updatedConfig };
    setEstimate(updated);
    await base44.entities.Estimate.update(estimateId, { document_config: updatedConfig });
  };

  const handleDocumentOptionsSave = async (newOptions) => {
    const updatedConfig = { ...(estimate.document_config || {}), options: newOptions };
    const updated = { ...estimate, document_config: updatedConfig };
    setEstimate(updated);
    await base44.entities.Estimate.update(estimateId, { document_config: updatedConfig });
  };

  const handleLanguageChange = async (lang) => {
    const updated = { ...estimate, document_language: lang };
    setEstimate(updated);
    await base44.entities.Estimate.update(estimateId, { document_language: lang });
  };

  const handleCancel = () => {
    const isEmpty = !estimate?.client_name && !estimate?.title;
    if (isNew && isEmpty) {
      setShowDiscardConfirm(true);
    } else {
      navigate('/estimates');
    }
  };

  const handleDiscard = async () => {
    if (estimateId) {
      await base44.entities.Estimate.delete(estimateId);
    }
    navigate('/estimates');
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!estimate) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="text-center">
        <p className="text-slate-500 mb-4">Estimate not found</p>
        <button onClick={() => navigate('/estimates')} className="text-sm text-primary hover:underline">← Back to Estimates</button>
      </div>
    </div>
  );

  const hasClient = !!estimate.client_name;

  const STATUS_BADGE = {
    draft:             { label: 'Draft',        cls: 'bg-slate-100 text-slate-600' },
    scheduled:         { label: 'Scheduled',    cls: 'bg-blue-100 text-blue-700' },
    sent:              { label: 'Sent',         cls: 'bg-indigo-100 text-indigo-700' },
    viewed:            { label: 'Viewed',       cls: 'bg-violet-100 text-violet-700' },
    approved:          { label: 'Approved',     cls: 'bg-emerald-100 text-emerald-800' },
    signed:            { label: 'Signed',       cls: 'bg-green-100 text-green-800' },
    converted:         { label: 'Converted',    cls: 'bg-teal-700 text-white' },
    declined:          { label: 'Declined',     cls: 'bg-red-100 text-red-700' },
    changes_requested: { label: 'Changes Req.', cls: 'bg-amber-100 text-amber-800' },
    visit_completed:   { label: 'Visited',      cls: 'bg-cyan-100 text-cyan-700' },
    on_my_way:         { label: 'On My Way',    cls: 'bg-sky-100 text-sky-700' },
  };
  const statusBadge = STATUS_BADGE[estimate.status] || STATUS_BADGE.draft;
  const totalFmt = estimate.total != null
    ? `$${parseFloat(estimate.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    : '—';

  return (
    <div className="fixed inset-0 bg-[#f0f2f5] flex flex-col z-50 font-inter">

      {/* TOP BAR */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
        <div className="flex items-center px-4 h-12 gap-3">
          {/* Left: Document title + template selector */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h1 className="text-base font-bold text-slate-900 flex-shrink-0">
              Estimate <span className="text-primary">#{estimate.estimate_number}</span>
            </h1>
            {hasClient && (
              <span className="text-sm text-slate-500 truncate hidden sm:inline">· {estimate.client_name}</span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 hidden md:block" />
            <div className="hidden md:block">
              <EstimateTemplateSelector
                currentTemplate={estimate.document_config?.template || 'professional'}
                onTemplateChange={handleTemplateChange}
                onShowOptions={() => setShowDocumentOptions(true)}
              />
            </div>
          </div>

          {/* Right: Status + Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <button
              onClick={() => setShowPreviewModal(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Client View
            </button>

            <button
              onClick={() => {
                if (!estimate.client_email) { toast.error('Client email is required to send'); return; }
                setShowSendModal(true);
              }}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Review & Send
            </button>

            <ConvertToWorkOrderButton estimate={estimate} onConverted={loadEstimate} />
            <ConvertToInvoiceButton estimate={estimate} onConverted={loadEstimate} />

            {saving && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Save className="w-3 h-3 animate-pulse" />
              </span>
            )}

            <button
              onClick={handleCancel}
              title={isNew && !estimate?.client_name ? 'Cancel' : 'Close'}
              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN 2-PANEL LAYOUT */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div className="w-56 flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white flex flex-col min-h-0">
          {isNew && !hasClient ? (
            <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-lg">👤</span>
              </div>
              <p className="text-xs font-medium text-slate-500 mb-2">No customer yet</p>
              <button
                onClick={() => { setDismissedCustomerModal(false); setShowNewCustomerModal(true); }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                + Select or Create Customer
              </button>
            </div>
          ) : (
            <EstimateSidebarCustomer
              estimate={estimate}
              onCustomerChange={handleCustomerChange}
            />
          )}
          {hasClient && (
            <div className="px-4 pb-5 pt-3 border-t border-slate-100 flex-shrink-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Communications</p>
              <CommTimeline estimateId={estimate.id} />
            </div>
          )}
        </div>

        {/* ACTIONS PANEL */}
        {hasClient && (
          <EstimateActionsPanel
            estimate={estimate}
            onStatusChange={(newStatus) => {
              setEstimate(e => ({ ...e, status: newStatus }));
              loadEstimate();
            }}
            onOpenSendReview={() => setShowSendModal(true)}
          />
        )}

        {/* RIGHT CANVAS */}
        <div className="flex-1 overflow-auto px-4 py-3">
          {!hasClient && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-amber-700">
              <span className="font-semibold">Tip:</span> Add a customer in the left panel to unlock the full workflow.
            </div>
          )}
          {/* Bid fields + view toggle */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {estimate.document_type === 'BID' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={jobNumber}
                  onChange={e => setJobNumber(e.target.value)}
                  onBlur={() => base44.entities.Estimate.update(estimateId, { job_number: jobNumber })}
                  placeholder="Job #"
                  className="h-7 w-28 text-xs border border-slate-200 rounded px-2 bg-white placeholder:text-slate-300"
                />
                <input
                  type="text"
                  value={planReference}
                  onChange={e => setPlanReference(e.target.value)}
                  onBlur={() => base44.entities.Estimate.update(estimateId, { plan_reference: planReference })}
                  placeholder="Plan Ref"
                  className="h-7 w-28 text-xs border border-slate-200 rounded px-2 bg-white placeholder:text-slate-300"
                />
              </div>
            )}
            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                isPreview
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isPreview ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              {isPreview ? 'Preview Mode' : 'Editing'}
            </button>
          </div>
          <EstimateGroups
            estimate={estimate}
            onSave={handleSave}
            saving={saving}
            isPreview={isPreview}
            currentUser={currentUser}
          />
          {/* Persisted pricing audit trail — internal only */}
          {!isPreview && estimate?.id && (
            <PricingAuditHistory documentId={estimate.id} />
          )}
        </div>
      </div>

      {/* MODALS */}
      <EstimatePreviewModal
        estimate={estimate}
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onSend={() => setShowSendModal(true)}
      />

      {showSendModal && (
        <EstimateSendReview
          estimate={estimate}
          open={showSendModal}
          onClose={() => setShowSendModal(false)}
          onSent={() => { loadEstimate(); setShowSendModal(false); }}
        />
      )}

      <EstimateDocumentOptions
        open={showDocumentOptions}
        onClose={() => setShowDocumentOptions(false)}
        options={estimate.document_config?.options}
        onSave={handleDocumentOptionsSave}
        language={estimate.document_language || 'en'}
        onLanguageChange={handleLanguageChange}
      />

      <NewProposalCustomerModal
        open={showNewCustomerModal || (isNew && !hasClient && !dismissedCustomerModal)}
        onOpenChange={(v) => {
          setShowNewCustomerModal(v);
          if (!v) setDismissedCustomerModal(true);
        }}
        onCustomerSelected={async (client) => {
          const customerData = {
            client_id: client.id || '',
            client_name: client.full_name || '',
            client_email: client.email || '',
            client_phone: client.phone || '',
            client_address: [client.address, client.city, client.state].filter(Boolean).join(', '),
          };
          await handleCustomerChange(customerData, client);
          setShowNewCustomerModal(false);
        }}
      />

      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-bold text-slate-900 mb-2">Discard this estimate?</h2>
            <p className="text-sm text-slate-500 mb-6">
              This estimate hasn't been saved yet. Cancelling will delete it permanently.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={handleDiscard}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Discard Estimate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}