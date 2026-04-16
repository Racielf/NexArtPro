import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeUserRole } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { X, Eye, Trash2, Send, ChevronRight, ChevronDown, ClipboardList, FileText } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import SaveStateIndicator from '@/components/shared/SaveStateIndicator';
import EstimateTemplateSelector from '@/components/estimates/EstimateTemplateSelector';
import EstimateDocumentOptions from '@/components/estimates/EstimateDocumentOptions';
import EstimateActionsPanel from '@/components/estimates/EstimateActionsPanel';
import EstimateGroups from '@/components/estimates/EstimateGroups';
import EstimateSidebarCustomer from '@/components/estimates/EstimateSidebarCustomer';
import EstimateSendReview from '@/components/estimates/EstimateSendReview';
import EstimatePreviewModal from '@/components/estimates/EstimatePreviewModal';
import NewProposalCustomerModal from '@/components/proposals/NewProposalCustomerModal';
import ConvertToWorkOrderButton from '@/components/workorders/ConvertToWorkOrderButton';
import ConvertToInvoiceButton from '@/components/estimates/ConvertToInvoiceButton';
// documentTypeConfig used internally by EstimateActionsPanel
import { getAutoLanguageForClient } from '@/lib/resolveDocumentLanguage';
import PricingAuditHistory from '@/components/estimates/internal/PricingAuditHistory';
import EstimateAttachments from '@/components/estimates/EstimateAttachments';
import { normalizeLineItem, normalizeMaterials, sanitizeMaterialForPersistence } from '@/lib/lineItemNormalizer';

export default function EstimateEditor() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const estimateId = urlParams.get('id');
  const isNew = urlParams.get('new') === '1';

  const [estimate, setEstimate] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [saveError, setSaveError] = useState(false);
  const [dirty, setDirty] = useState(false);
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
    setSaveError(false);
    setDirty(false);
    
    // Normalize all line items and materials before persisting
    const sanitized = { ...updatedEstimate };
    if (sanitized.groups && Array.isArray(sanitized.groups)) {
      sanitized.groups = sanitized.groups.map(group => ({
        ...group,
        items: (group.items || []).map(item => normalizeLineItem(item)),
      }));
    }
    if (sanitized.materials && Array.isArray(sanitized.materials)) {
      sanitized.materials = normalizeMaterials(sanitized.materials).map(sanitizeMaterialForPersistence);
    }
    
    try {
      await base44.entities.Estimate.update(estimateId, { ...sanitized, updated_by: 'Admin' });
      setEstimate(sanitized);
      setSavedAt(Date.now());
    } catch (err) {
      console.error('[EstimateEditor] Save failed:', err);
      setSaveError(true);
      setDirty(true);
    } finally {
      setSaving(false);
    }

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
    <div className="fixed inset-0 bg-slate-100 flex flex-col z-50 font-inter">

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0" style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06)' }}>
        <div className="flex items-center px-5 h-14 gap-4">

          {/* Left: client name + status */}
          <div className="flex items-center gap-6 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 min-w-0">
              {hasClient && (
                <span className="text-base font-bold text-slate-900 truncate">{estimate.client_name}</span>
              )}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex-shrink-0 ${statusBadge.cls}`}>
                {statusBadge.label}
              </span>
            </div>
            <div className="hidden md:block">
              <EstimateTemplateSelector
                currentTemplate={estimate.document_config?.template || 'clean'}
                onTemplateChange={handleTemplateChange}
                onShowOptions={() => setShowDocumentOptions(true)}
              />
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <SaveStateIndicator saving={saving} savedAt={savedAt} dirty={dirty} error={saveError} />

            <div className="w-px h-5 bg-slate-200" />

            <button
              onClick={() => setShowPreviewModal(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              Client View
            </button>

            <div className="flex items-center">
              <Button
                size="sm"
                onClick={() => {
                  if (!estimate.client_email) { toast.error('Client email is required to send'); return; }
                  setShowSendModal(true);
                }}
                className="rounded-r-none gap-1.5 h-8 px-3 text-xs font-semibold bg-slate-900 hover:bg-black text-white border-slate-900"
              >
                <Send className="w-3.5 h-3.5" />
                Review & Send
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="rounded-l-none border-l border-white/20 h-8 px-1.5 bg-slate-900 hover:bg-black text-white">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <ConvertToWorkOrderButton estimate={estimate} onConverted={loadEstimate} asDropdownItem />
                  <ConvertToInvoiceButton estimate={estimate} onConverted={loadEstimate} asDropdownItem />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <button
              onClick={handleCancel}
              title={isNew && !estimate?.client_name ? 'Cancel' : 'Close'}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN 3-PANEL LAYOUT ──────────────────────────────────────────── */}
      <div className="flex flex-1 gap-4 px-4 py-3 bg-slate-100 overflow-hidden">

        {/* LEFT SIDEBAR — Customer context */}
        <div className="w-60 flex-shrink-0 overflow-y-auto flex flex-col min-h-0 bg-white rounded-xl border border-slate-100" style={{ boxShadow: '0 6px 20px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)' }}>
          {isNew && !hasClient ? (
            <div className="flex flex-col items-center justify-center flex-1 px-5 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">No customer yet</p>
              <p className="text-xs text-slate-400 mb-3">Link a customer to unlock the full estimate workflow</p>
              <button
                onClick={() => { setDismissedCustomerModal(false); setShowNewCustomerModal(true); }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                + Select or Create Customer
              </button>
            </div>
          ) : (
            <EstimateSidebarCustomer
              estimate={estimate}
              client={client}
              onCustomerChange={handleCustomerChange}
              onAttachmentsUpdate={async (newAttachments) => {
                const updated = { ...estimate, attachments: newAttachments };
                setEstimate(updated);
                await base44.entities.Estimate.update(estimateId, { attachments: newAttachments });
              }}
            />
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

        {/* RIGHT CANVAS — Document workspace */}
        <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-100 px-8 py-6" style={{ boxShadow: '0 6px 20px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)' }}>

          {/* No-client tip banner */}
          {!hasClient && (
            <div className="mb-5 bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex items-center gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Link a customer to get started</p>
                <p className="text-xs text-slate-400 mt-0.5">Add a customer in the left panel to unlock the full estimate workflow.</p>
              </div>
            </div>
          )}

          {/* Canvas toolbar: BID fields + view mode toggle */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {estimate.document_type === 'BID' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={jobNumber}
                  onChange={e => setJobNumber(e.target.value)}
                  onBlur={() => base44.entities.Estimate.update(estimateId, { job_number: jobNumber })}
                  placeholder="Job #"
                  className="h-7 w-28 text-xs border border-slate-200 rounded-lg px-2.5 bg-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                />
                <input
                  type="text"
                  value={planReference}
                  onChange={e => setPlanReference(e.target.value)}
                  onBlur={() => base44.entities.Estimate.update(estimateId, { plan_reference: planReference })}
                  placeholder="Plan Ref"
                  className="h-7 w-28 text-xs border border-slate-200 rounded-lg px-2.5 bg-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                />
              </div>
            )}
            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`inline-flex items-center gap-1.5 h-7 px-3 text-xs font-semibold rounded-full border transition-colors ${
                isPreview
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isPreview ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              {isPreview ? 'Preview Mode' : 'Editing'}
            </button>
          </div>

          <EstimateGroups
            estimate={estimate}
            onSave={handleSave}
            saving={saving}
            isPreview={isPreview}
            currentUser={currentUser}
            onDirty={() => setDirty(true)}
          />

          {/* Persisted pricing audit trail — internal only */}
          {!isPreview && estimate?.id && (
            <div className="mt-3">
              <PricingAuditHistory documentId={estimate.id} />
            </div>
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