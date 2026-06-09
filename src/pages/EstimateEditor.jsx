import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeUserRole } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { X, Eye, Trash2, Send, ChevronDown, ClipboardList, ShieldCheck, BrainCircuit } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import SaveStateIndicator from '@/components/shared/SaveStateIndicator';
import EstimateTemplateSelector from '@/components/estimates/EstimateTemplateSelector';
import EstimateDocumentOptions from '@/components/estimates/EstimateDocumentOptions';
import EstimateActionsPanel from '@/components/estimates/EstimateActionsPanel';
import EstimateGroups from '@/components/estimates/EstimateGroups';
import EstimateSidebarCustomer from '@/components/estimates/EstimateSidebarCustomer';
import CustomerSidebar from '@/components/estimates/CustomerSidebar';
import EstimateSendReview from '@/components/estimates/EstimateSendReview';
import EstimatePreviewModal from '@/components/estimates/EstimatePreviewModal';
import DocumentTypeRenderer from '@/components/documents/DocumentTypeRenderer';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import NewProposalCustomerModal from '@/components/proposals/NewProposalCustomerModal';
import ConvertToWorkOrderButton from '@/components/workorders/ConvertToWorkOrderButton';
import ConvertToInvoiceButton from '@/components/estimates/ConvertToInvoiceButton';
import { getAutoLanguageForClient } from '@/lib/resolveDocumentLanguage';
import PricingAuditHistory from '@/components/estimates/internal/PricingAuditHistory';
import TransmissionPanel from '@/components/estimates/TransmissionPanel';
import { normalizeLineItem, normalizeMaterials, sanitizeMaterialForPersistence } from '@/lib/lineItemNormalizer';
import { archiveWithSnapshot } from '@/lib/softDelete';
import { loadPriceBook, loadServices } from '@/lib/servicePersistence';
import estimateCatalogPricingBrain from '@/brain/modules/estimateCatalogPricingBrain';

// Monkeypatch base44.entities.Client to map name to full_name and vice versa transparently
if (base44.entities.Client && !base44.entities.Client._isPatched) {
  base44.entities.Client._isPatched = true;
  const originalCreate = base44.entities.Client.create.bind(base44.entities.Client);
  base44.entities.Client.create = async function (record) {
    const payload = { ...record };
    if ('full_name' in payload) {
      payload.name = payload.full_name;
      delete payload.full_name;
    }
    const res = await originalCreate(payload);
    if (res && res.name && !res.full_name) {
      res.full_name = res.name;
    }
    return res;
  };

  const originalUpdate = base44.entities.Client.update.bind(base44.entities.Client);
  base44.entities.Client.update = async function (id, updates) {
    const payload = { ...updates };
    if ('full_name' in payload) {
      payload.name = payload.full_name;
      delete payload.full_name;
    }
    const res = await originalUpdate(id, payload);
    if (res && res.name && !res.full_name) {
      res.full_name = res.name;
    }
    return res;
  };

  const originalList = base44.entities.Client.list.bind(base44.entities.Client);
  base44.entities.Client.list = async function (...args) {
    const list = await originalList(...args);
    (list || []).forEach(c => {
      if (c && c.name && !c.full_name) {
        c.full_name = c.name;
      }
    });
    return list;
  };

  const originalFilter = base44.entities.Client.filter.bind(base44.entities.Client);
  base44.entities.Client.filter = async function (...args) {
    const list = await originalFilter(...args);
    (list || []).forEach(c => {
      if (c && c.name && !c.full_name) {
        c.full_name = c.name;
      }
    });
    return list;
  };
}

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
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthResult, setHealthResult] = useState(null);
  const [pricingInsight, setPricingInsight] = useState(null);
  const [showBrainPanel, setShowBrainPanel] = useState(false);
  const [editingCustomerSidebar, setEditingCustomerSidebar] = useState(false);
  const estimateGroupsRef = React.useRef(null);
  const statusRefreshTimerRef = React.useRef(null);

  useEffect(() => { base44.auth.me().then(u => setCurrentUser(u)).catch(() => {}); }, []);

  useEffect(() => {
    return () => {
      if (statusRefreshTimerRef.current) {
        clearTimeout(statusRefreshTimerRef.current);
      }
    };
  }, []);

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

  useEffect(() => {
    const runPricingInsight = async () => {
      if (!estimate?.groups || isPreview) {
        setPricingInsight(null);
        return;
      }
      try {
        const [priceBookEntries, services] = await Promise.all([loadPriceBook(), loadServices()]);
        const result = await estimateCatalogPricingBrain({
          groups: estimate.groups,
          priceBookEntries,
          services,
        });
        setPricingInsight(result);
      } catch (err) {
        console.warn('[Estimate Pricing Insight] failed:', err?.message || err);
      }
    };
    runPricingInsight();
  }, [estimate?.groups, isPreview]);

  const pricingWarningsMap = React.useMemo(() => {
    const map = {};
    for (const item of pricingInsight?.flaggedItems || []) {
      if (item?.itemId) map[item.itemId] = item;
    }
    return map;
  }, [pricingInsight]);

  const loadEstimate = async () => {
    if (!estimateId) { setLoading(false); return; }
    const list = await base44.entities.Estimate.filter({ id: estimateId });
    if (list.length) {
      const est = list[0];
      if (!est.document_type || est.document_type === 'PROPOSAL') {
        est.document_type = 'ESTIMATE';
      }
      setEstimate(est);
      setJobNumber(est.job_number || '');
      setPlanReference(est.plan_reference || '');
      if (est.client_id) {
        const cls = await base44.entities.Client.filter({ id: est.client_id });
        if (cls.length) {
          setClient(cls[0]);
        } else {
          // Check Customer table fallback since estimates might be linked to Customer IDs
          const custs = await base44.entities.Customer.filter({ id: est.client_id });
          if (custs.length) {
            const cust = custs[0];
            setClient({
              ...cust,
              full_name: cust.display_name || `${cust.first_name || ''} ${cust.last_name || ''}`.trim(),
              address: cust.service_address || '',
            });
          }
        }
      }
    }
    setLoading(false);
  };

  const handleEstimateActionStatusChange = (patchOrStatus) => {
    const patch =
      typeof patchOrStatus === 'string'
        ? { status: patchOrStatus }
        : (patchOrStatus || {});

    setEstimate(prev => prev ? ({ ...prev, ...patch }) : prev);

    if (statusRefreshTimerRef.current) {
      clearTimeout(statusRefreshTimerRef.current);
    }

    // Delay reload to avoid Base44 eventual-consistency race.
    statusRefreshTimerRef.current = setTimeout(() => {
      loadEstimate();
    }, 1000);
  };

  const WORKFLOW_FIELDS = [
    'status',
    'sent_at',
    'viewed_at',
    'approved_at',
    'approved_by',
    'approval_note',
    'declined_at',
    'declined_reason',
    'signed_at',
    'signer_name',
    'signature_name',
    'signature_data',
    'terms_accepted',
    'converted_at',
    'converted_to_work_order_id',
    'converted_to_invoice_id',
  ];

  const LOCKED_STATUSES = ['sent', 'viewed', 'approved', 'signed', 'converted', 'declined', 'voided'];
  const isLocked = estimate && LOCKED_STATUSES.includes(estimate.status);

  const handleSave = async (updatedEstimate) => {
    if (estimate && LOCKED_STATUSES.includes(estimate.status)) {
      toast.error('This estimate is locked and cannot be edited.');
      return;
    }
    setSaving(true);
    setSaveError(false);
    setDirty(false);
    const sanitized = { ...updatedEstimate };
    WORKFLOW_FIELDS.forEach((key) => {
      delete sanitized[key];
    });
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
      await base44.entities.Estimate.update(estimateId, { ...sanitized, updated_by: currentUser?.email || currentUser?.full_name || 'Admin' });
      setEstimate(prev => prev ? ({ ...prev, ...sanitized }) : sanitized);
      setSavedAt(Date.now());
      toast.success(`Estimate #${sanitized.estimate_number} saved`);
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
    if (estimate && LOCKED_STATUSES.includes(estimate.status)) {
      toast.error('This estimate is locked and cannot be edited.');
      return;
    }
    setSaving(true);
    let resolvedClientId = customerData.client_id;
    let resolvedClientRecord = clientRecord;

    try {
      if (resolvedClientId) {
        // Validate if this ID is in the clients table
        const cls = await base44.entities.Client.filter({ id: resolvedClientId });
        if (cls.length === 0) {
          // Check if a Client with the same email already exists in the clients table
          const emailToFind = customerData.client_email || clientRecord?.email;
          if (emailToFind) {
            const existingCls = await base44.entities.Client.filter({ email: emailToFind });
            if (existingCls.length > 0) {
              resolvedClientId = existingCls[0].id;
              resolvedClientRecord = existingCls[0];
            }
          }

          // If still not resolved to a Client table ID, create a Client record to satisfy estimates fkey constraint
          if (resolvedClientId === customerData.client_id) {
            const nameToUse = customerData.client_name || clientRecord?.display_name || [clientRecord?.first_name, clientRecord?.last_name].filter(Boolean).join(' ') || 'Unnamed Client';
            const emailToUse = customerData.client_email || clientRecord?.email || '';
            const phoneToUse = customerData.client_phone || clientRecord?.phone || '';
            const addressToUse = clientRecord?.service_address || clientRecord?.address || customerData.client_address || '';

            const createdClient = await base44.entities.Client.create({
              name: nameToUse,
              email: emailToUse,
              phone: phoneToUse,
              address: addressToUse,
              city: clientRecord?.city || '',
              state: clientRecord?.state || '',
              zip: clientRecord?.zip || '',
            });

            resolvedClientId = createdClient.id;
            resolvedClientRecord = createdClient;
          }
        }
      }

      const finalData = { 
        ...customerData, 
        client_id: resolvedClientId 
      };

      if (resolvedClientRecord) {
        const autoLang = getAutoLanguageForClient(estimate, resolvedClientRecord);
        if (autoLang) {
          finalData.document_language = autoLang;
        }
      }

      await base44.entities.Estimate.update(estimate.id, { ...finalData, updated_by: currentUser?.email || currentUser?.full_name || 'Admin' });
      setEstimate(prev => prev ? { ...prev, ...finalData } : prev);
      if (resolvedClientRecord) setClient(resolvedClientRecord);
      if (customerData.client_name) toast.success('Customer saved');
    } catch (err) {
      console.error('[EstimateEditor.handleCustomerChange] Save failed:', err);
      toast.error(err?.message || 'Failed to save customer');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = async (templateKey) => {
    if (estimate && LOCKED_STATUSES.includes(estimate.status)) return;
    const updatedConfig = { ...(estimate.document_config || {}), template: templateKey };
    await base44.entities.Estimate.update(estimate.id, { document_config: updatedConfig, updated_by: currentUser?.email || currentUser?.full_name || 'Admin' });
    setEstimate(e => ({ ...e, document_config: updatedConfig }));
  };

  const handleDocumentOptionsSave = async (newOptions) => {
    if (estimate && LOCKED_STATUSES.includes(estimate.status)) return;
    const updatedConfig = { ...(estimate.document_config || {}), options: newOptions };
    await base44.entities.Estimate.update(estimate.id, { document_config: updatedConfig, updated_by: currentUser?.email || currentUser?.full_name || 'Admin' });
    setEstimate(e => ({ ...e, document_config: updatedConfig }));
  };

  const handleLanguageChange = async (lang) => {
    if (estimate && LOCKED_STATUSES.includes(estimate.status)) return;
    await base44.entities.Estimate.update(estimate.id, { document_language: lang, updated_by: currentUser?.email || currentUser?.full_name || 'Admin' });
    setEstimate(e => ({ ...e, document_language: lang }));
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
      const actor = currentUser?.email || currentUser?.id || 'system';
      await archiveWithSnapshot(base44.entities.Estimate, 'Estimate', estimateId, actor, 'Discarded from editor — new estimate was never saved');
    }
    navigate('/estimates');
  };

  const handleRunHealthCheck = async () => {
    if (!estimate) return;
    try {
      setHealthLoading(true);
      const { runEstimateHealthCheck } = await import('@/agent/agent.js');
      const result = await runEstimateHealthCheck(estimate);
      setHealthResult(result);
      if (result.level === 'healthy') {
        toast.success(`Estimate Health: ${result.score}`);
      } else if (result.level === 'warning') {
        toast.warning(`Estimate Health: ${result.score}`);
      } else {
        toast.error(`Estimate Health: ${result.score}`);
      }
    } catch (err) {
      console.error('[Estimate Health] failed:', err);
      toast.error('Estimate health check failed');
    } finally {
      setHealthLoading(false);
    }
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
    draft:             { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
    sent:              { label: 'Sent', cls: 'bg-indigo-100 text-indigo-700' },
    viewed:            { label: 'Viewed', cls: 'bg-violet-100 text-violet-700' },
    approved:          { label: 'Approved', cls: 'bg-emerald-100 text-emerald-800' },
    signed:            { label: 'Signed', cls: 'bg-green-100 text-green-800' },
    declined:          { label: 'Declined', cls: 'bg-red-100 text-red-700' },
    changes_requested: { label: 'Changes Req.', cls: 'bg-amber-100 text-amber-800' },
    scheduled:         { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700' },
    visit_completed:   { label: 'Visited', cls: 'bg-cyan-100 text-cyan-700' },
    on_my_way:         { label: 'On My Way', cls: 'bg-sky-100 text-sky-700' },
    converted:         { label: 'Converted', cls: 'bg-teal-700 text-white' },
  };
  const statusBadge = STATUS_BADGE[estimate.status] || STATUS_BADGE.draft;
  const brainInsightCount = pricingInsight?.flaggedItems?.length || 0;
  const hasBrainInsights = brainInsightCount > 0;
  const brainScore = Number(pricingInsight?.score ?? 100);

  const brainButtonState = hasBrainInsights
    ? (brainScore < 70 || brainInsightCount > 3 ? 'critical' : 'warning')
    : 'healthy';

  const brainButtonConfig = {
    healthy: {
      label: 'AI OK',
      badge: brainInsightCount,
      cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      badgeCls: 'bg-emerald-600 text-white',
      title: 'AI review complete — no active pricing issues',
    },
    warning: {
      label: 'AI Review',
      badge: brainInsightCount,
      cls: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
      badgeCls: 'bg-amber-600 text-white',
      title: `${brainInsightCount} pricing insight(s) need review`,
    },
    critical: {
      label: 'AI Issues',
      badge: brainInsightCount,
      cls: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
      badgeCls: 'bg-red-600 text-white',
      title: `${brainInsightCount} critical pricing issue(s) detected`,
    },
  };

  const brainButton = brainButtonConfig[brainButtonState];

  return (
    <div className="fixed inset-0 bg-slate-100 flex flex-col z-50 font-inter">
      {/* ── HEADER ── */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0" style={{ boxShadow: '0 1px 4px 0 rgba(0,0,0,0.07)' }}>
        <div className="flex items-center px-4 h-14 gap-2 min-w-0">

          {/* LEFT ZONE: client name + status + version */}
          <div className="flex items-center gap-2 min-w-0 shrink-0 max-w-[260px]">
            {hasClient && (
              <span className="text-sm font-bold text-slate-900 truncate leading-tight">{estimate.client_name}</span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex-shrink-0 ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
            {estimate.version_number && estimate.version_number > 1 && (
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full flex-shrink-0">
                V{estimate.version_number}
              </span>
            )}
          </div>

          {/* CENTER ZONE: template selector — grows to fill space */}
          <div className="flex-1 flex justify-center min-w-0 hidden md:flex">
            {!isLocked && (
              <EstimateTemplateSelector
                currentTemplate={estimate.document_config?.template || 'clean'}
                onTemplateChange={handleTemplateChange}
                onShowOptions={() => setShowDocumentOptions(true)}
              />
            )}
          </div>

          {/* RIGHT ZONE: secondary tools → primary action → close */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">

            {/* AI Brain — icon-only on medium, full on large */}
            <button
              onClick={() => setShowBrainPanel(true)}
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-bold shadow-sm transition-colors ${brainButton.cls}`}
              title={brainButton.title}
            >
              <BrainCircuit className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden lg:inline">{brainButton.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${brainButton.badgeCls}`}>
                {brainButton.badge}
              </span>
            </button>

            {/* Save state — quiet, always visible */}
            <SaveStateIndicator saving={saving} savedAt={savedAt} dirty={dirty} error={saveError} />

            {/* Health Check — DEV only */}
            {import.meta.env.DEV && (
              <button
                onClick={handleRunHealthCheck}
                disabled={healthLoading}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                title="Health Check"
              >
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden lg:inline">{healthLoading ? 'Checking...' : 'Health'}</span>
              </button>
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            {/* Client View — secondary, icon + text */}
            <button
              onClick={() => setShowPreviewModal(true)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              title="Client View"
            >
              <Eye className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden lg:inline">Client View</span>
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            {/* PRIMARY: Review & Send + dropdown */}
            <div className="flex items-center">
              <Button
                size="sm"
                onClick={() => {
                  if (!estimate.client_email) { toast.error('Client email is required to send'); return; }
                  setShowSendModal(true);
                }}
                className="rounded-r-none gap-1.5 h-8 px-3 text-xs font-semibold bg-slate-900 hover:bg-black text-white border-slate-900"
              >
                <Send className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Review &amp; Send</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="rounded-l-none border-l border-white/20 h-8 px-2 bg-slate-900 hover:bg-black text-white">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <ConvertToWorkOrderButton estimate={estimate} onConverted={loadEstimate} asDropdownItem />
                  <ConvertToInvoiceButton estimate={estimate} onConverted={loadEstimate} asDropdownItem />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Close */}
            <button
              onClick={handleCancel}
              title={isNew && !estimate?.client_name ? 'Cancel' : 'Close'}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors ml-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="flex flex-1 gap-3 px-4 py-3 bg-slate-100 overflow-hidden min-w-0">
        {/* Left sidebar: customer panel */}
        <div 
          className={`w-72 xl:w-80 flex-shrink-0 overflow-y-auto flex flex-col min-h-0 ${
            hasClient && !editingCustomerSidebar 
              ? 'bg-transparent border-none shadow-none gap-4' 
              : 'bg-white rounded-xl border border-slate-100'
          }`}
          style={hasClient && !editingCustomerSidebar ? {} : { boxShadow: '0 4px 16px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)' }}
        >
          {hasClient && !editingCustomerSidebar ? (
            <>
              {estimate.id && (
                <div className="px-4 py-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <TransmissionPanel estimateId={estimate.id} />
                </div>
              )}
              <CustomerSidebar
                estimate={estimate}
                client={client}
                onEditCustomer={isLocked ? undefined : () => setEditingCustomerSidebar(true)}
              />
            </>
          ) : (
            <EstimateSidebarCustomer
              estimate={estimate}
              client={client}
              forceEditing={editingCustomerSidebar}
              onCustomerChange={async (customerData, clientRecord) => {
                await handleCustomerChange(customerData, clientRecord);
                setEditingCustomerSidebar(false);
              }}
              onAttachmentsUpdate={async (newAttachments) => {
                if (isLocked) return;
                await base44.entities.Estimate.update(estimate.id, { attachments: newAttachments, updated_by: currentUser?.email || currentUser?.full_name || 'Admin' });
                setEstimate(e => ({ ...e, attachments: newAttachments }));
              }}
            />
          )}
        </div>

        {hasClient && (
          <EstimateActionsPanel
            estimate={estimate}
            onStatusChange={handleEstimateActionStatusChange}
            onOpenSendReview={() => setShowSendModal(true)}
          />
        )}

        {/* Canvas: main estimate editor — gets remaining space */}
        <div className="flex-1 min-w-0 overflow-auto bg-white rounded-xl border border-slate-100 px-6 py-5 xl:px-8 xl:py-6" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)' }}>
          {isLocked && (
            <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px]">Locked</span>
                <span className="text-sm text-slate-700">This estimate is in <strong>{estimate.status}</strong> status and cannot be modified. (Full versioning flow is pending).</span>
              </div>
            </div>
          )}

          {!hasClient && (
            <div className="mb-5 bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex items-center gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"><ClipboardList className="w-4 h-4 text-blue-500" /></div>
              <div><p className="text-sm font-semibold text-slate-800">Link a customer to get started</p><p className="text-xs text-slate-400 mt-0.5">Add a customer in the left panel to unlock the full estimate workflow.</p></div>
            </div>
          )}

          {import.meta.env.DEV && healthResult && (
            <div className={`mb-5 rounded-xl border px-5 py-4 ${healthResult.level === 'healthy' ? 'border-emerald-200 bg-emerald-50' : healthResult.level === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-sm font-bold text-slate-900">Estimate Health</p><p className="text-xs text-slate-500 mt-0.5">{healthResult.summary}</p></div>
                <div className="text-right"><p className="text-2xl font-bold text-slate-900">{healthResult.score}</p><p className="text-[11px] uppercase tracking-wide text-slate-500">{healthResult.level}</p></div>
              </div>
              <div className="mt-3"><p className="text-xs font-semibold text-slate-700">Next action</p><p className="text-sm text-slate-600 mt-1">{healthResult.nextAction}</p></div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {estimate.document_type === 'BID' && (
              <div className="flex items-center gap-2">
                <input type="text" disabled={isLocked} value={jobNumber} onChange={e => setJobNumber(e.target.value)} onBlur={() => { if (!isLocked) base44.entities.Estimate.update(estimate.id, { job_number: jobNumber, updated_by: currentUser?.email || currentUser?.full_name || 'Admin' }).then(() => setEstimate(e => ({ ...e, job_number: jobNumber }))).catch(err => console.error('[jobNumber onBlur] failed:', err)); }} placeholder="Job #" className="h-7 w-28 text-xs border border-slate-200 rounded-lg px-2.5 bg-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" />
                <input type="text" disabled={isLocked} value={planReference} onChange={e => setPlanReference(e.target.value)} onBlur={() => { if (!isLocked) base44.entities.Estimate.update(estimate.id, { plan_reference: planReference, updated_by: currentUser?.email || currentUser?.full_name || 'Admin' }).then(() => setEstimate(e => ({ ...e, plan_reference: planReference }))).catch(err => console.error('[planReference onBlur] failed:', err)); }} placeholder="Plan Ref" className="h-7 w-28 text-xs border border-slate-200 rounded-lg px-2.5 bg-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" />
              </div>
            )}
            {isLocked ? (
              <span className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-semibold rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                Read-only Mode
              </span>
            ) : (
              <button onClick={() => setIsPreview(!isPreview)} className={`inline-flex items-center gap-1.5 h-7 px-3 text-xs font-semibold rounded-full border transition-colors ${isPreview ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isPreview ? 'bg-amber-500' : 'bg-emerald-500'}`} />{isPreview ? 'Preview Mode' : 'Editing'}
              </button>
            )}
          </div>

          {(isPreview || isLocked) ? (
            <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 flex justify-center mb-5 overflow-x-auto">
              <div className="w-full max-w-4xl space-y-4 shadow-md rounded-lg overflow-hidden bg-white">
                <DocumentTypeRenderer
                  estimate={estimate}
                  template={estimate.document_config?.template || 'clean'}
                  options={{
                    ...DEFAULT_OPTIONS,
                    ...(estimate.document_config?.options || {}),
                    hideInternalNotes: true,
                  }}
                />
              </div>
            </div>
          ) : (
            <EstimateGroups ref={estimateGroupsRef} estimate={estimate} onSave={handleSave} saving={saving} isPreview={false} currentUser={currentUser} onDirty={() => setDirty(true)} pricingWarningsMap={pricingWarningsMap} />
          )}

          {!isPreview && estimate?.id && <div className="mt-3"><PricingAuditHistory documentId={estimate.id} /></div>}
        </div>
      </div>

      {showBrainPanel && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg mx-4 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">AI Insights</p>
                  <p className="text-xs text-slate-400">Estimate intelligence summary</p>
                </div>
              </div>
              <button onClick={() => setShowBrainPanel(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {pricingInsight ? (
                <>
                  <div className={`rounded-xl border px-4 py-3 ${hasBrainInsights ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{pricingInsight.summary}</p>
                        <p className="text-xs text-slate-600 mt-1">{pricingInsight.nextAction}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">{pricingInsight.score}</p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">{pricingInsight.level}</p>
                      </div>
                    </div>
                  </div>

                  {hasBrainInsights ? (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pricing Suggestions</p>
                      {pricingInsight.flaggedItems.map(item => (
                        <div key={item.itemId} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{item.serviceName}</p>
                              <p className="text-slate-500 mt-0.5">Current ${item.currentEstimatePrice} · Suggested ${item.suggestedCatalogPrice}</p>
                            </div>
                            <span className="rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 font-semibold whitespace-nowrap">{item.deltaPercent}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <p className="text-sm font-semibold text-emerald-800">No active pricing issues detected.</p>
                      <p className="text-xs text-emerald-600 mt-1">This estimate currently looks aligned with the Price Book intelligence.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                  <BrainCircuit className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">AI Insights are loading</p>
                  <p className="text-xs text-slate-400 mt-1">The estimate brain will analyze pricing once line items are available.</p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex justify-between items-center">
              {hasBrainInsights && (
                <button
                  onClick={() => estimateGroupsRef.current?.applyAllPricingFixes?.()}
                  className="h-8 px-3 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-black transition-colors"
                >
                  Fix pricing automatically
                </button>
              )}
              <button onClick={() => setShowBrainPanel(false)} className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors ml-auto">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <EstimatePreviewModal estimate={estimate} open={showPreviewModal} onClose={() => setShowPreviewModal(false)} onSend={() => setShowSendModal(true)} />
      {showSendModal && <EstimateSendReview estimate={estimate} open={showSendModal} onClose={() => setShowSendModal(false)} onSent={() => { loadEstimate(); setShowSendModal(false); }} onFixAllPricing={() => { estimateGroupsRef.current?.applyAllPricingFixes?.(); }} />}
      <EstimateDocumentOptions open={showDocumentOptions} onClose={() => setShowDocumentOptions(false)} options={estimate.document_config?.options} onSave={handleDocumentOptionsSave} language={estimate.document_language || 'en'} onLanguageChange={handleLanguageChange} />
      <NewProposalCustomerModal open={showNewCustomerModal || (isNew && !hasClient && !dismissedCustomerModal)} onOpenChange={(v) => { setShowNewCustomerModal(v); if (!v) setDismissedCustomerModal(true); }} onCustomerSelected={async (client) => { const customerData = { client_id: client.id || '', client_name: client.full_name || client.display_name || '', client_email: client.email || '', client_phone: client.phone || '', client_address: [client.service_address || client.address, client.city, client.state].filter(Boolean).join(', ') }; await handleCustomerChange(customerData, client); setShowNewCustomerModal(false); }} />
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-bold text-slate-900 mb-2">Discard this estimate?</h2>
            <p className="text-sm text-slate-500 mb-6">This estimate hasn't been saved yet. Cancelling will delete it permanently.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDiscardConfirm(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Keep Editing</button>
              <button onClick={handleDiscard} className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" />Discard Estimate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}