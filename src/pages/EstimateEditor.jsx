import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeUserRole } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { X, Eye, Save, Trash2, ChevronRight } from 'lucide-react';
import EstimateActionsPanel from '@/components/estimates/EstimateActionsPanel';
import EstimateGroups from '@/components/estimates/EstimateGroups';
import EstimateSidebarCustomer from '@/components/estimates/EstimateSidebarCustomer';
import CommTimeline from '@/components/shared/CommTimeline';
import EstimateSendReview from '@/components/estimates/EstimateSendReview';
import EstimatePreviewModal from '@/components/estimates/EstimatePreviewModal';
import EstimateTemplateSelector from '@/components/estimates/EstimateTemplateSelector';
import EstimateDocumentOptions from '@/components/estimates/EstimateDocumentOptions';
import ConvertToWorkOrderButton from '@/components/workorders/ConvertToWorkOrderButton';
import ConvertToInvoiceButton from '@/components/estimates/ConvertToInvoiceButton';
import NewEstimateCustomerPanel from '@/components/estimates/NewEstimateCustomerPanel';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import { getDocTypeConfig, DOC_TYPE_OPTIONS, validateDocTypeFields } from '@/lib/documentTypeConfig';
import { getAutoLanguageForClient } from '@/lib/resolveDocumentLanguage';

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
  const [showDocumentOptions, setShowDocumentOptions] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [jobNumber, setJobNumber] = useState('');
  const [planReference, setPlanReference] = useState('');

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

  const handleTemplateChange = async (template) => {
    setSaving(true);
    const updated = {
      ...estimate,
      document_config: { ...(estimate.document_config || {}), template },
    };
    await base44.entities.Estimate.update(estimateId, { ...updated, updated_by: 'Admin' });
    setEstimate(updated);
    setSaving(false);
  };

  const handleDocumentOptionsSave = async (newOptions) => {
    setSaving(true);
    const updated = {
      ...estimate,
      document_config: { ...(estimate.document_config || {}), options: newOptions },
    };
    await base44.entities.Estimate.update(estimateId, { ...updated, updated_by: 'Admin' });
    setEstimate(updated);
    setSaving(false);
  };

  const handleLanguageChange = async (newLang) => {
    setSaving(true);
    const updated = { ...estimate, document_language: newLang };
    await base44.entities.Estimate.update(estimateId, { document_language: newLang });
    setEstimate(updated);
    setSaving(false);
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
  const docConfig = getDocTypeConfig(estimate.document_type);

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
        <div className="flex items-center px-4 h-11 gap-3 relative">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs font-bold text-slate-400 tracking-widest uppercase flex-shrink-0">{docConfig.abbreviation}</span>
            <span className="text-base font-bold text-slate-900 flex-shrink-0">#{estimate.estimate_number}</span>
            {hasClient && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-700 truncate">{estimate.client_name}</span>
              </>
            )}
          </div>

          {hasClient && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <EstimateTemplateSelector
                currentTemplate={estimate?.document_config?.template || 'professional'}
                onTemplateChange={handleTemplateChange}
                onShowOptions={() => setShowDocumentOptions(true)}
              />
            </div>
          )}

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {hasClient && (
              <>
                <ConvertToInvoiceButton estimate={estimate} onConverted={loadEstimate} />
                <ConvertToWorkOrderButton estimate={estimate} onConverted={loadEstimate} />
              </>
            )}
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button onClick={() => setShowPreviewModal(true)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Preview document">
              <Eye className="w-4 h-4" />
            </button>
            {saving && (
              <span className="text-xs text-slate-400 flex items-center gap-1 ml-1">
                <Save className="w-3 h-3 animate-pulse" />
              </span>
            )}
          </div>

          <button
            onClick={handleCancel}
            title={isNew && !estimate?.client_name ? 'Cancel' : 'Close'}
            className="ml-3 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
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
          {estimate.title && (
            <div className="flex items-center gap-1.5 px-4">
              <span className="text-slate-400 font-medium">Project</span>
              <span className="font-semibold text-slate-700 truncate max-w-[200px]">{estimate.title}</span>
            </div>
          )}
        </div>
      </div>

      {/* MAIN 2-PANEL LAYOUT */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div className="w-56 flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white flex flex-col min-h-0">
          {isNew && !hasClient ? (
            <NewEstimateCustomerPanel
              estimate={estimate}
              onCustomerSet={async (customerData, clientRecord) => {
                await handleCustomerChange(customerData, clientRecord);
              }}
            />
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
          {/* Document Type Switcher + Bid Fields */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Type</span>
              <select
                value={estimate.document_type || 'PROPOSAL'}
                onChange={async (e) => {
                  const newType = e.target.value;
                  const updated = { ...estimate, document_type: newType };
                  setEstimate(updated);
                  await base44.entities.Estimate.update(estimateId, { document_type: newType });
                }}
                className="h-7 text-xs font-semibold border border-slate-200 rounded px-2 bg-white text-slate-700"
              >
                {DOC_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
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
              className="px-3 py-1 text-xs bg-slate-800 text-white rounded"
            >
              {isPreview ? 'Edit Mode' : 'Client View'}
            </button>
          </div>
          <EstimateGroups
            estimate={estimate}
            onSave={handleSave}
            saving={saving}
            isPreview={isPreview}
          />
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
        options={estimate?.document_config?.options || DEFAULT_OPTIONS}
        onSave={handleDocumentOptionsSave}
        language={estimate?.document_language || 'en'}
        onLanguageChange={handleLanguageChange}
      />

      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-bold text-slate-900 mb-2">Discard this {docConfig.label.toLowerCase()}?</h2>
            <p className="text-sm text-slate-500 mb-6">
              This {docConfig.label.toLowerCase()} hasn't been saved yet. Cancelling will delete it permanently.
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
                Discard {docConfig.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}