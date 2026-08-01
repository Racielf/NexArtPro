import React, { useState, useEffect } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { normalizeUserRole } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { X, Eye, Trash2, Send, ChevronDown, ShieldCheck, BrainCircuit, Pencil, User, Sparkles, PanelTop } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import SaveStateIndicator from '@/components/shared/SaveStateIndicator';
import EstimateTemplateSelector from '@/components/estimates/EstimateTemplateSelector';
import EstimateActionsPanel from '@/components/estimates/EstimateActionsPanel';
import EstimatePipelineDocument from '@/components/estimates/EstimatePipelineDocument';
import EstimatePipelineSidebar from '@/components/estimates/EstimatePipelineSidebar';
import EstimateRightRail from '@/components/estimates/EstimateRightRail';
import EstimateSendReview from '@/components/estimates/EstimateSendReview';
import EstimatePreviewModal from '@/components/estimates/EstimatePreviewModal';
import NewProposalCustomerModal from '@/components/proposals/NewProposalCustomerModal';
import ConvertToWorkOrderButton from '@/components/workorders/ConvertToWorkOrderButton';
import ConvertToInvoiceButton from '@/components/estimates/ConvertToInvoiceButton';
import { getAutoLanguageForClient } from '@/lib/resolveDocumentLanguage';
import { normalizeLineItem, normalizeMaterials, sanitizeMaterialForPersistence } from '@/lib/lineItemNormalizer';
import { archiveWithSnapshot } from '@/lib/softDelete';
import { loadPriceBook, loadServices } from '@/lib/servicePersistence';
import estimateCatalogPricingBrain from '@/brain/modules/estimateCatalogPricingBrain';
import { notifyLowMargin } from '@/lib/businessNotifications';
import { ORGANIC, organicHeadingStyle } from '@/components/estimates/estimatePipelineTheme';
import { useLanguage } from '@/lib/i18n';

// Palette sourced from the owner-approved "Pipeline para estimate editor"
// mockup (warm terracotta/olive) — a deliberate per-module exception to the
// app-wide ink/burnt/cream tokens (see estimatePipelineTheme.js). Kept as a
// `C` alias so every existing C.* call site below picks up the new palette
// without touching each one individually.
const C = {
  ink900: ORGANIC.ink900, ink800: ORGANIC.ink700, ink700: ORGANIC.ink700, ink600: ORGANIC.ink500,
  ink500: ORGANIC.ink500, ink400: ORGANIC.ink400,
  cream50: ORGANIC.bg, cream100: ORGANIC.neutral200,
  burnt400: ORGANIC.accent500, burnt500: ORGANIC.accent600, burnt600: ORGANIC.accent700,
  orange600: ORGANIC.accent600,
  borderSoft: ORGANIC.neutral300, borderWarm: ORGANIC.neutral300,
};

const LOW_MARGIN_SPAM_WINDOW_MS = 30 * 60 * 1000;

async function sendLowMarginAlertIfNeeded(estimate, marginPct, userName) {
  try {
    const recent = await nexartClient.entities.EstimateVersionHistory.filter(
      { estimate_id: estimate.id, action: 'low_margin_alert' },
      '-created_date',
      1,
    );
    const last = recent?.[0];
    if (last?.created_date && Date.now() - new Date(last.created_date).getTime() < LOW_MARGIN_SPAM_WINDOW_MS) {
      return;
    }

    await notifyLowMargin(estimate, marginPct, userName);

    await nexartClient.entities.EstimateVersionHistory.create({
      estimate_id: estimate.id,
      estimate_number: estimate.estimate_number,
      action: 'low_margin_alert',
      actor: userName,
      changes: { margin_pct: marginPct },
      changes_note: `LOW_MARGIN_ALERT | margin: ${marginPct.toFixed(1)}% | triggered_by: ${userName}`,
    });
  } catch (err) {
    console.warn('[lowMarginAlert] Notification failed (non-blocking):', err?.message);
  }
}

function fmt0(n) {
  return '$' + (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function EstimateEditor() {
  const { language, t } = useLanguage();
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
  const estimateGroupsRef = React.useRef(null);
  const estimateActionsPanelRef = React.useRef(null);
  const statusRefreshTimerRef = React.useRef(null);

  // Sticky meter + right rail Pricing panel — mirrored from EstimateGroups'
  // internal state via onTotalsChange (single source of truth stays there).
  const [meter, setMeter] = useState({ subtotal: 0, total: 0, totalCost: 0, netProfit: 0, netProfitPct: 0, depositAmount: 0 });
  const [pricingSettings, setPricingSettings] = useState({ taxRate: 0, discountType: 'percent', discountValue: 0, depositPercent: 0, expirationDate: '' });
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { nexartClient.auth.me().then(u => setCurrentUser(u)).catch(() => {}); }, []);

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
  const showEsignBanner = true;
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const LOCKED_STATUSES = ['sent', 'viewed', 'approved', 'signed', 'converted', 'declined', 'voided'];
  const isLocked = estimate && LOCKED_STATUSES.includes(estimate.status);

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
    const list = await nexartClient.entities.Estimate.filter({ id: estimateId });
    if (list.length) {
      const est = list[0];
      if (!est.document_type || est.document_type === 'PROPOSAL') {
        est.document_type = 'ESTIMATE';
      }
      setEstimate(est);
      setJobNumber(est.job_number || '');
      setPlanReference(est.plan_reference || '');
      setPricingSettings({
        taxRate: est.tax_rate || 0,
        discountType: est.discount_type || 'percent',
        discountValue: est.discount_value || 0,
        depositPercent: est.deposit_percent || 0,
        expirationDate: est.expiration_date || '',
      });
      if (est.client_id) {
        const cls = await nexartClient.entities.Client.filter({ id: est.client_id });
        if (cls.length) {
          setClient(cls[0]);
        } else {
          // Check Customer table fallback since estimates might be linked to Customer IDs
          const custs = await nexartClient.entities.Customer.filter({ id: est.client_id });
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

  const handleSave = async (updatedEstimate) => {
    if (isLocked) {
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
      await nexartClient.entities.Estimate.update(estimateId, { ...sanitized, updated_by: currentUser?.email || currentUser?.full_name || 'Admin' });
      setEstimate(prev => prev ? ({ ...prev, ...sanitized }) : sanitized);
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
      const userName = currentUser?.full_name || currentUser?.email || 'Unknown';
      sendLowMarginAlertIfNeeded(
        { id: estimateId, estimate_number: updatedEstimate.estimate_number, client_name: updatedEstimate.client_name },
        marginPct,
        userName,
      );
    }
  };

  const handleCustomerChange = async (customerData, clientRecord) => {
    if (isLocked) {
      toast.error('This estimate is locked and cannot be edited.');
      return;
    }
    setSaving(true);
    let resolvedClientId = customerData.client_id;
    let resolvedClientRecord = clientRecord;

    try {
      if (resolvedClientId) {
        // Validate if this ID is in the clients table
        const cls = await nexartClient.entities.Client.filter({ id: resolvedClientId });
        if (cls.length === 0) {
          // Check if a Client with the same email already exists in the clients table
          const emailToFind = customerData.client_email || clientRecord?.email;
          if (emailToFind) {
            const existingCls = await nexartClient.entities.Client.filter({ email: emailToFind });
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

            const createdClient = await nexartClient.entities.Client.create({
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

      await nexartClient.entities.Estimate.update(estimate.id, { ...finalData, updated_by: currentUser?.email || currentUser?.full_name || 'Admin' });
      const updated = { ...estimate, ...finalData };
      setEstimate(updated);
      if (resolvedClientRecord) setClient(resolvedClientRecord);
      if (customerData.client_name) toast.success('Customer saved');
    } catch (err) {
      console.error('[EstimateEditor.handleCustomerChange] Save failed:', err);
      toast.error(err?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleAttachmentsUpdate = async (newAttachments) => {
    await nexartClient.entities.Estimate.update(estimate.id, { attachments: newAttachments, updated_by: currentUser?.email || currentUser?.full_name || 'Admin' });
    setEstimate(e => ({ ...e, attachments: newAttachments }));
  };

  const handleSidebarEstimateUpdate = async (patch) => {
    if (isLocked || !estimate?.id) return;
    const nextPatch = {
      ...patch,
      ...(patch.metadata ? { metadata: { ...(estimate.metadata || {}), ...patch.metadata } } : {}),
      updated_by: currentUser?.email || currentUser?.full_name || 'Admin',
    };
    setSaving(true);
    setSaveError(false);
    try {
      await nexartClient.entities.Estimate.update(estimate.id, nextPatch);
      setEstimate(current => ({ ...current, ...nextPatch }));
      setSavedAt(Date.now());
    } catch (error) {
      console.error('[EstimateEditor] Sidebar update failed:', error);
      setSaveError(true);
      toast.error(error?.message || 'Could not update the estimate');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = async (templateKey) => {
    if (isLocked) return;
    const updatedConfig = { ...(estimate.document_config || {}), template: templateKey };
    await nexartClient.entities.Estimate.update(estimate.id, { document_config: updatedConfig, updated_by: currentUser?.email || currentUser?.full_name || 'Admin' });
    setEstimate(e => ({ ...e, document_config: updatedConfig }));
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
      await archiveWithSnapshot(nexartClient.entities.Estimate, 'Estimate', estimateId, actor, 'Discarded from editor — new estimate was never saved');
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

  // Pricing panel (right rail) writes through the ref into EstimateGroups —
  // it stays the single owner of this state, we just mirror it up for display.
  const handlePricingSettingsChange = (next) => {
    setPricingSettings(next);
    estimateGroupsRef.current?.setPricingSettings(next);
  };
  const handleExpirationDateChange = (date) => {
    setPricingSettings(prev => ({ ...prev, expirationDate: date }));
    estimateGroupsRef.current?.setPricingSettings({ expirationDate: date });
  };
  const handleTotalsChange = (data) => {
    setMeter({ subtotal: data.subtotal, total: data.total, totalCost: data.totalCost, netProfit: data.netProfit, netProfitPct: data.netProfitPct, depositAmount: data.depositAmount });
    setPricingSettings({ taxRate: data.taxRate, discountType: data.discountType, discountValue: data.discountValue, depositPercent: data.depositPercent, expirationDate: data.expirationDate });
  };
  // Fixes the stale-snapshot race: Preview/Send used to read the last debounced
  // autosave (up to 800ms old) instead of what's on screen right now.
  const openPreview = () => { estimateGroupsRef.current?.flushSave(); setShowPreviewModal(true); };
  const openSend = () => {
    if (!estimate.client_email) { toast.error('Client email is required to send'); return; }
    estimateGroupsRef.current?.flushSave();
    setShowSendModal(true);
  };
  // Routes every "Send" entry point (header button, Client View modal) through
  // EstimateActionsPanel's real loss-prevention/pricing-override gates instead
  // of opening the send modal directly — the header button used to bypass them.
  const triggerSend = () => {
    estimateGroupsRef.current?.flushSave();
    if (estimateActionsPanelRef.current?.triggerSend) {
      estimateActionsPanelRef.current.triggerSend();
    } else {
      openSend();
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
    <div className="fixed inset-0 flex flex-col z-50" style={{ background: C.cream50, fontFamily: ORGANIC.fontBody }}>
      <div className="flex-shrink-0 relative z-20 px-3 pt-3" style={{ background: ORGANIC.bg }}>
        <div className="min-h-[64px] flex items-center gap-2 px-3 rounded-[22px] border min-w-0" style={{ background: ORGANIC.surface, borderColor: ORGANIC.divider, boxShadow: ORGANIC.shadowSm }}>
          <div className="flex items-center self-stretch px-2 text-[21px] mr-1" style={{ ...organicHeadingStyle, color: ORGANIC.ink900 }}>{t('estimate.header.title')}</div>
          <div className="self-stretch flex flex-col items-center justify-center px-4 border-b-[3px]" style={{ borderColor: ORGANIC.accent, color: ORGANIC.accent700 }}>
            <span className="text-[12px] font-bold">{t('estimate.header.option')}</span>
            <span className="text-[10px] font-semibold" style={{ color: ORGANIC.ink500 }}>{fmt0(meter.total)}</span>
          </div>

          <div className="ml-auto flex items-center gap-2 min-w-0 pl-3 border-l" style={{ borderColor: ORGANIC.divider }}>
            {!isLocked && <EstimateTemplateSelector compact currentTemplate={estimate.document_config?.template || 'clean'} onTemplateChange={handleTemplateChange} />}
            <SaveStateIndicator compact saving={saving} savedAt={savedAt} dirty={dirty} error={saveError} />
            <button type="button" onClick={() => setShowBrainPanel(true)} className={`relative h-9 w-9 rounded-full border grid place-items-center transition-transform hover:-translate-y-0.5 ${brainButton.cls}`} title={t('estimate.header.ai')}><Sparkles className="w-4 h-4" />{brainButton.badge > 0 && <span className={`absolute -right-1 -top-1 min-w-4 h-4 rounded-full px-1 grid place-items-center text-[9px] ${brainButton.badgeCls}`}>{brainButton.badge}</span>}</button>
            {import.meta.env.DEV && <button type="button" onClick={handleRunHealthCheck} disabled={healthLoading} className="h-9 w-9 rounded-full border grid place-items-center text-emerald-700 transition-transform hover:-translate-y-0.5 disabled:opacity-50" style={{ borderColor: ORGANIC.divider }} title={t('estimate.header.health')}><ShieldCheck className="w-4 h-4" /></button>}
            {!isLocked && <button type="button" onClick={() => setIsPreview(!isPreview)} className="h-9 w-9 rounded-full border grid place-items-center transition-transform hover:-translate-y-0.5" style={{ borderColor: ORGANIC.divider, color: isPreview ? ORGANIC.accent700 : ORGANIC.ink500, background: isPreview ? ORGANIC.accent100 : 'transparent' }} title={isPreview ? t('estimate.header.editMode') : t('estimate.header.previewMode')}><PanelTop className="w-4 h-4" /></button>}
            <button type="button" onClick={openPreview} className="h-9 w-9 rounded-full border grid place-items-center transition-transform hover:-translate-y-0.5" style={{ borderColor: ORGANIC.divider, color: ORGANIC.ink500 }} title={t('estimate.header.clientPreview')}><Eye className="w-4 h-4" /></button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm" className="h-9 rounded-full px-4 gap-1.5 text-[11px]" style={{ background: ORGANIC.accent }}><Send className="w-3.5 h-3.5" />{t('estimate.header.reviewSend')}<ChevronDown className="w-3 h-3" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <button type="button" onClick={triggerSend} className="w-full text-left px-2 py-1.5 text-sm">{t('estimate.header.reviewSend')}</button>
                <ConvertToWorkOrderButton estimate={estimate} onConverted={loadEstimate} asDropdownItem />
                <ConvertToInvoiceButton estimate={estimate} onConverted={loadEstimate} asDropdownItem />
              </DropdownMenuContent>
            </DropdownMenu>
            <button type="button" onClick={handleCancel} className="w-9 h-9 rounded-full grid place-items-center transition-colors hover:bg-black/[0.04]" style={{ color: ORGANIC.ink400 }} title={t('estimate.header.close')}><X className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
      {/* ── HEADER ── */}
      <div className="hidden bg-white flex-shrink-0" style={{ borderBottom: `1px solid ${C.borderWarm}`, boxShadow: '0 1px 4px 0 rgba(0,0,0,0.07)' }}>
        <div className="flex items-center px-4 h-14 gap-2 min-w-0">

          {/* LEFT ZONE: client name + status */}
          <div className="flex items-center gap-2 min-w-0 shrink-0 max-w-[260px]">
            {hasClient && (
              <span className="text-sm font-bold truncate leading-tight" style={{ color: C.ink900 }}>{estimate.client_name}</span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex-shrink-0 ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          </div>

          {/* CENTER ZONE: template selector */}
          <div className="flex-1 flex justify-center min-w-0 hidden md:flex">
            {!isLocked && (
              <EstimateTemplateSelector
                currentTemplate={estimate.document_config?.template || 'clean'}
                onTemplateChange={handleTemplateChange}
              />
            )}
          </div>

          {/* RIGHT ZONE: secondary tools → primary action → close */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">

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

            <SaveStateIndicator saving={saving} savedAt={savedAt} dirty={dirty} error={saveError} />

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

            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            {!isLocked && (
              <button
                onClick={() => setIsPreview(!isPreview)}
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border text-xs font-semibold transition-colors ${isPreview ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                title="Toggle read-only preview inline"
              >
                {isPreview ? <Eye className="w-3.5 h-3.5 flex-shrink-0" /> : <Pencil className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="hidden lg:inline">{isPreview ? 'Preview Mode' : 'Editing'}</span>
              </button>
            )}

            <button
              onClick={openPreview}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              title="Client View"
            >
              <Eye className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden lg:inline">Client View</span>
            </button>

            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            <div className="flex items-center">
              <Button
                size="sm"
                onClick={triggerSend}
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

      {/* ── MAIN 3-COLUMN LAYOUT — exact V3 est-editor structure ── */}
      <div className="flex flex-1 overflow-hidden min-w-0">

        {/* Left: Customer — contact (inline-editable), real location map, attachments, comms.
            Price Book intentionally has no visible panel here — it works in the background
            as a search-as-you-type autocomplete on each service line (SmartServicePicker),
            not as a browsable catalog taking up screen space. */}
        <div className="w-[320px] flex-shrink-0 hidden lg:block overflow-y-auto p-4 pr-0">
          {hasClient && (
            <EstimatePipelineSidebar
              estimate={estimate}
              client={client}
              onCustomerChange={handleCustomerChange}
              onChangeCustomer={() => setShowNewCustomerModal(true)}
              onAttachmentsUpdate={handleAttachmentsUpdate}
              onOpenSettings={() => setShowSettingsPanel(true)}
              onEstimateUpdate={handleSidebarEstimateUpdate}
            />
          )}
        </div>

        {/* Center: canvas + sticky meter */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-5 xl:px-6">
            {isLocked && (
              <div className="max-w-[1040px] mx-auto mb-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px]">{t('estimate.locked')}</span>
                  <span className="text-sm text-slate-700">{t('estimate.lockedMessage', { status: estimate.status })}</span>
                </div>
              </div>
            )}

            {!hasClient && (
              <div className="max-w-[1040px] mx-auto mb-4 rounded-xl px-5 py-3.5 flex items-center justify-between gap-3 shadow-sm bg-white" style={{ border: `1px solid ${C.borderWarm}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: C.cream100, color: C.burnt600 }}><User className="w-4 h-4" /></div>
                  <div><p className="text-sm font-semibold" style={{ color: C.ink800 }}>{t('estimate.emptyClient.title')}</p><p className="text-xs mt-0.5" style={{ color: C.ink400 }}>{t('estimate.emptyClient.description')}</p></div>
                </div>
                <button onClick={() => { setDismissedCustomerModal(false); setShowNewCustomerModal(true); }} className="text-xs font-semibold flex-shrink-0" style={{ color: C.burnt600 }}>+ {t('estimate.emptyClient.action')}</button>
              </div>
            )}

            {hasClient && showEsignBanner && (
              <div className="max-w-[1040px] mx-auto mb-4 flex items-center gap-3 rounded-full px-4 py-3" style={{ background: ORGANIC.olive100 }}>
                <span className="w-6 h-6 rounded-full grid place-items-center text-white flex-none" style={{ background: ORGANIC.olive600 }}><Sparkles className="w-3.5 h-3.5" /></span>
                <span className="text-[12.5px] font-semibold flex-1" style={{ color: ORGANIC.olive900 }}>{t('estimate.esign.new')}</span>
                <button type="button" onClick={() => navigate('/nexartsign')} className="text-[11.5px] font-semibold" style={{ color: ORGANIC.olive700 }}>{t('estimate.esign.learn')}</button>
                <button type="button" onClick={() => navigate('/nexartsign')} className="h-8 px-4 rounded-full text-[11.5px] font-semibold text-white" style={{ background: ORGANIC.olive600 }}>{t('estimate.esign.configure')}</button>
              </div>
            )}

            {hasClient && (
              <div className="max-w-[1040px] mx-auto mb-4">
                <EstimateActionsPanel
                  ref={estimateActionsPanelRef}
                  estimate={estimate}
                  onStatusChange={handleEstimateActionStatusChange}
                  onOpenSendReview={openSend}
                />
              </div>
            )}

            {hasClient && (
              <div className="max-w-[1040px] mx-auto mb-4 rounded-[28px] px-6 py-5" style={{ background: ORGANIC.surface, boxShadow: ORGANIC.shadowSm }}>
                <div className="flex items-end gap-4 flex-wrap">
                  <h1 className="text-[30px] leading-none" style={{ ...organicHeadingStyle, color: C.ink900 }}>
                    {t('estimate.title')} <span style={{ color: C.burnt600 }}>#{estimate.estimate_number}</span>
                  </h1>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold ${statusBadge.cls}`}>{statusBadge.label}</span>
                  <div className="ml-auto text-right">
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: C.ink400 }}>{t('estimate.total')}</p>
                    <p className="text-[22px]" style={{ ...organicHeadingStyle, color: C.ink900 }}>{fmt0(meter.total)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 flex-wrap mt-3 pt-3 text-[13px]" style={{ borderTop: `1px solid ${C.borderSoft}`, color: C.ink500 }}>
                  <span>
                    {t('estimate.expiration')}: <span className="font-semibold" style={{ color: C.ink800 }}>{pricingSettings.expirationDate ? new Date(`${pricingSettings.expirationDate}T00:00:00`).toLocaleDateString(language === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : t('estimate.undefined')}</span>
                  </span>
                </div>
              </div>
            )}

            {import.meta.env.DEV && healthResult && (
              <div className={`max-w-[1040px] mx-auto mb-4 rounded-xl border px-5 py-4 ${healthResult.level === 'healthy' ? 'border-emerald-200 bg-emerald-50' : healthResult.level === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-sm font-bold text-slate-900">{t('estimate.health.title')}</p><p className="text-xs text-slate-500 mt-0.5">{healthResult.summary}</p></div>
                  <div className="text-right"><p className="text-2xl font-bold text-slate-900">{healthResult.score}</p><p className="text-[11px] uppercase tracking-wide text-slate-500">{healthResult.level}</p></div>
                </div>
                <div className="mt-3"><p className="text-xs font-semibold text-slate-700">{t('estimate.health.nextAction')}</p><p className="text-sm text-slate-600 mt-1">{healthResult.nextAction}</p></div>
              </div>
            )}

            {estimate.document_type === 'BID' && (
              <div className="max-w-[1040px] mx-auto mb-4 flex items-center gap-2">
                <input type="text" disabled={isLocked} value={jobNumber} onChange={e => setJobNumber(e.target.value)} onBlur={() => { if (!isLocked) nexartClient.entities.Estimate.update(estimate.id, { job_number: jobNumber, updated_by: currentUser?.email || currentUser?.full_name || 'Admin' }).then(() => setEstimate(e => ({ ...e, job_number: jobNumber }))).catch(err => console.error('[jobNumber onBlur] failed:', err)); }} placeholder="Job #" className="h-7 w-28 text-xs border border-slate-200 rounded-lg px-2.5 bg-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" />
                <input type="text" disabled={isLocked} value={planReference} onChange={e => setPlanReference(e.target.value)} onBlur={() => { if (!isLocked) nexartClient.entities.Estimate.update(estimate.id, { plan_reference: planReference, updated_by: currentUser?.email || currentUser?.full_name || 'Admin' }).then(() => setEstimate(e => ({ ...e, plan_reference: planReference }))).catch(err => console.error('[planReference onBlur] failed:', err)); }} placeholder="Plan Ref" className="h-7 w-28 text-xs border border-slate-200 rounded-lg px-2.5 bg-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" />
              </div>
            )}

            <div className="max-w-[1040px] mx-auto">
              <EstimatePipelineDocument
                ref={estimateGroupsRef}
                estimate={estimate}
                onSave={handleSave}
                isPreview={isPreview || isLocked}
                onDirty={() => setDirty(true)}
                pricingWarningsMap={pricingWarningsMap}
                onTotalsChange={handleTotalsChange}
              />
            </div>

            <section className="max-w-[1040px] mx-auto mt-4 p-6" style={{ background: ORGANIC.surface, borderRadius: ORGANIC.radiusLg, boxShadow: ORGANIC.shadowSm }}>
              <h2 className="text-[21px] mb-4" style={{ ...organicHeadingStyle, color: ORGANIC.ink900 }}>{t('estimate.activity')}</h2>
              <div className="space-y-3">
                {[
                  estimate.signed_at && [t('estimate.activity.signed'), estimate.signed_at],
                  estimate.approved_at && [t('estimate.activity.approved'), estimate.approved_at],
                  estimate.sent_at && [t('estimate.activity.sent'), estimate.sent_at],
                  estimate.scheduled_date && [t('estimate.activity.scheduled'), estimate.scheduled_date],
                  [t('estimate.activity.created'), estimate.created_at || estimate.created_date],
                ].filter(Boolean).slice(0, 4).map(([label, date], index) => (
                  <div key={`${label}-${index}`} className="flex items-center gap-3 pb-3 border-b last:border-0" style={{ borderColor: ORGANIC.divider }}>
                    <span className="w-7 h-7 rounded-full grid place-items-center text-[9px] font-bold" style={{ background: ORGANIC.olive200, color: ORGANIC.olive800 }}>{(estimate.client_name || 'C').split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                    <span className="text-[13px] flex-1" style={{ color: ORGANIC.ink700 }}>{label}</span>
                    {date && <span className="text-[11px]" style={{ color: ORGANIC.ink400 }}>{new Date(date).toLocaleDateString(language === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sticky math meter — exact V3 est-meter */}
          <div className="hidden flex-shrink-0 grid-cols-5 divide-x bg-white" style={{ borderTop: `1px solid ${C.borderWarm}`, borderColor: C.borderSoft }}>
            {[
              { label: 'Subtotal', value: fmt0(meter.subtotal) },
              { label: 'Cost', value: fmt0(meter.totalCost) },
              { label: 'Gross Profit', value: fmt0(meter.netProfit), pill: `${meter.netProfitPct.toFixed(1)}%`, pillColor: C.sage600 },
              { label: 'Deposit', value: fmt0(meter.depositAmount) },
              { label: 'Total to Client', value: fmt0(meter.total), emphasis: true },
            ].map((cell, i) => (
              <div key={i} className="px-4 py-2.5" style={{ borderColor: C.borderSoft }}>
                <p className="text-[9.5px] font-bold uppercase tracking-widest" style={{ color: C.ink400 }}>{cell.label}</p>
                <p className="text-[17px] font-extrabold tabular-nums mt-0.5 flex items-center gap-1.5" style={{ color: cell.emphasis ? C.burnt600 : C.ink900, fontFamily: cell.emphasis ? ORGANIC.fontHeading : ORGANIC.fontBody }}>
                  {cell.value}
                  {cell.pill && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: C.cream100, color: cell.pillColor }}>{cell.pill}</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {showSettingsPanel && (
        <div className="fixed inset-0 z-[65] bg-black/30 flex justify-end" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSettingsPanel(false); }}>
          <div className="h-full w-full max-w-sm p-4 overflow-y-auto" style={{ background: ORGANIC.bg }}>
            <div className="flex items-center justify-between px-1 pb-3">
              <div><h2 className="text-[22px]" style={{ ...organicHeadingStyle, color: ORGANIC.ink900 }}>{t('estimate.settings.title')}</h2><p className="text-xs" style={{ color: ORGANIC.ink400 }}>{t('estimate.settings.subtitle')}</p></div>
              <button type="button" onClick={() => setShowSettingsPanel(false)} className="w-9 h-9 rounded-full grid place-items-center" style={{ background: ORGANIC.surface, color: ORGANIC.ink500 }}><X className="w-4 h-4" /></button>
            </div>
            <EstimateRightRail
              settings={pricingSettings}
              onSettingsChange={handlePricingSettingsChange}
              expirationDate={pricingSettings.expirationDate}
              onExpirationDateChange={handleExpirationDateChange}
              pricingInsight={pricingInsight}
              onOpenBrainPanel={() => { setShowSettingsPanel(false); setShowBrainPanel(true); }}
              estimateId={estimate.id}
              showHistory={showHistory}
              onToggleHistory={() => setShowHistory((value) => !value)}
            />
          </div>
        </div>
      )}

      {showBrainPanel && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg mx-4 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{t('estimate.ai.title')}</p>
                  <p className="text-xs text-slate-400">{t('estimate.ai.subtitle')}</p>
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

      <EstimatePreviewModal estimate={estimate} open={showPreviewModal} onClose={() => setShowPreviewModal(false)} onSend={() => { setShowPreviewModal(false); triggerSend(); }} />
      {showSendModal && <EstimateSendReview estimate={estimate} open={showSendModal} onClose={() => setShowSendModal(false)} onSent={() => { loadEstimate(); setShowSendModal(false); }} onFixAllPricing={() => { estimateGroupsRef.current?.applyAllPricingFixes?.(); }} />}
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
