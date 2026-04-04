import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { X, Eye, Save } from 'lucide-react';
import EstimateStatusStepper from '@/components/estimates/EstimateStatusStepper';
import EstimateOptionTabs from '@/components/estimates/EstimateOptionTabs';
import EstimateLineItems from '@/components/estimates/EstimateLineItems';
import EstimateSidebarCustomer from '@/components/estimates/EstimateSidebarCustomer';
import CommTimeline from '@/components/shared/CommTimeline';
import EstimateSendReview from '@/components/estimates/EstimateSendReview';
import EstimatePreviewModal from '@/components/estimates/EstimatePreviewModal';
import { logComm } from '@/lib/commTracking';

export default function EstimateEditor() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const estimateId = urlParams.get('id');

  const [estimate, setEstimate] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activeOption, setActiveOption] = useState(0);
  const [options, setOptions] = useState([{ label: 'Option #1' }]);

  useEffect(() => { loadEstimate(); }, []);

  const loadEstimate = async () => {
    if (!estimateId) { setLoading(false); return; }
    const list = await base44.entities.Estimate.filter({ id: estimateId });
    if (list.length) {
      const est = list[0];
      setEstimate(est);
      if (est.client_id) {
        const cls = await base44.entities.Client.filter({ id: est.client_id });
        if (cls.length) setClient(cls[0]);
      }
    }
    setLoading(false);
  };

  const handleSave = async (updatedEstimate) => {
    setSaving(true);
    await base44.entities.Estimate.update(estimateId, updatedEstimate);
    setEstimate(updatedEstimate);
    setSaving(false);
  };

  // Called from sidebar customer panel
  const handleCustomerChange = async (customerData, clientRecord) => {
    setSaving(true);
    const updated = { ...estimate, ...customerData };
    await base44.entities.Estimate.update(estimateId, updated);
    setEstimate(updated);
    if (clientRecord) setClient(clientRecord);
    setSaving(false);
    if (customerData.client_name) toast.success('Customer saved');
  };

  const handleAddOption = () => {
    setOptions(prev => [...prev, { label: `Option #${prev.length + 1}` }]);
    setActiveOption(options.length);
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

  return (
    <div className="fixed inset-0 bg-[#f0f2f5] flex flex-col z-50 overflow-hidden">

      {/* ── TOP BAR ── */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
        <div className="flex items-center px-4 h-12 gap-2">

          {/* Close */}
          <button onClick={() => navigate('/estimates')}
            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors flex-shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>

          {/* Title */}
          <span className="font-bold text-slate-900 text-sm whitespace-nowrap flex-shrink-0">
            {hasClient ? `Estimate #${estimate.estimate_number} · ${estimate.client_name}` : `New Estimate #${estimate.estimate_number}`}
          </span>

          {/* Option tabs */}
          <div className="flex items-stretch h-full flex-shrink-0">
            <EstimateOptionTabs
              activeOption={activeOption}
              options={options}
              onSelectOption={setActiveOption}
              onAddOption={handleAddOption}
            />
          </div>

          <div className="flex-1" />

          {/* Workflow stepper */}
          {hasClient && (
            <div className="flex items-center flex-shrink-0 border-l border-slate-100 pl-4 ml-2">
              <EstimateStatusStepper
                status={estimate.status}
                estimate={estimate}
                onStatusChange={(newStatus) => {
                  setEstimate(e => ({ ...e, status: newStatus }));
                  loadEstimate();
                }}
                onOpenSendReview={() => setShowSendModal(true)}
              />
            </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-3 flex-shrink-0 border-l border-slate-100 pl-3">
            <button onClick={() => setShowPreviewModal(true)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Preview">
              <Eye className="w-4 h-4" />
            </button>
            {saving && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Save className="w-3 h-3 animate-pulse" />Saving…
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN 2-PANEL LAYOUT ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR — always shown, customer panel always editable */}
        <div className="w-64 flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white flex flex-col">
          <EstimateSidebarCustomer
            estimate={estimate}
            onCustomerChange={handleCustomerChange}
          />
          {/* Communications below customer */}
          {hasClient && (
            <div className="px-4 pb-5 pt-3 border-t border-slate-100 mt-auto">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Communications</p>
              <CommTimeline estimateId={estimate.id} />
            </div>
          )}
        </div>

        {/* RIGHT CANVAS — always shows line items (ready to fill) */}
        <div className="flex-1 overflow-auto p-6">
          {!hasClient && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-amber-700">
              <span className="font-semibold">Tip:</span> Add a customer in the left panel to unlock the full workflow (schedule, send, approve).
            </div>
          )}
          <EstimateLineItems
            estimate={estimate}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      </div>

      {showSendModal && (
        <EstimateSendReview
          estimate={estimate}
          open={showSendModal}
          onClose={() => setShowSendModal(false)}
          onSent={() => { loadEstimate(); setShowSendModal(false); }}
        />
      )}

      <EstimatePreviewModal
        estimate={estimate}
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onSend={() => setShowSendModal(true)}
      />
    </div>
  );
}