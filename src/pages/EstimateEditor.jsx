import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { X, Eye } from 'lucide-react';
import EstimateStatusStepper from '@/components/estimates/EstimateStatusStepper';
import EstimateOptionTabs from '@/components/estimates/EstimateOptionTabs';
import EstimateLineItems from '@/components/estimates/EstimateLineItems';
import EstimateClientSidebar from '@/components/estimates/EstimateClientSidebar';
import CommTimeline from '@/components/shared/CommTimeline';
import EstimateSendReview from '@/components/estimates/EstimateSendReview';
import EstimatePreviewModal from '@/components/estimates/EstimatePreviewModal';
import NewEstimateCustomerPanel from '@/components/estimates/NewEstimateCustomerPanel';
import { logComm } from '@/lib/commTracking';

export default function EstimateEditor() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const estimateId = urlParams.get('id');

  const [estimate, setEstimate] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeOption, setActiveOption] = useState(0);
  const [options, setOptions] = useState([{ label: 'Option #1' }]);

  // Is this a brand-new estimate with no client yet?
  const isNewEmpty = estimate && !estimate.client_name;

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

  // Called from NewEstimateCustomerPanel when a customer is selected/filled
  const handleCustomerSet = async (customerData, clientRecord) => {
    setSaving(true);
    const updated = { ...estimate, ...customerData };
    await base44.entities.Estimate.update(estimateId, updated);
    setEstimate(updated);
    if (clientRecord) setClient(clientRecord);
    setSaving(false);
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
        <Button onClick={() => navigate('/estimates')}>Back to Estimates</Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#f0f2f5] flex flex-col z-50 overflow-hidden">

      {/* TOP BAR */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
        <div className="flex items-center px-4 h-12 gap-0">

          {/* Close */}
          <button
            onClick={() => navigate('/estimates')}
            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors mr-2 flex-shrink-0"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>

          {/* Title */}
          <span className="font-bold text-slate-900 text-sm mr-1 whitespace-nowrap flex-shrink-0">
            {estimate.client_name
              ? `Estimate #${estimate.estimate_number}`
              : 'New Estimate'}
          </span>

          {/* Option tabs */}
          {!isNewEmpty && (
            <div className="flex items-stretch h-full flex-shrink-0">
              <EstimateOptionTabs
                activeOption={activeOption}
                options={options}
                onSelectOption={setActiveOption}
                onAddOption={handleAddOption}
              />
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Stepper — right side (only show when estimate has a client) */}
          {!isNewEmpty && (
            <div className="flex items-center flex-shrink-0 border-l border-slate-100 pl-5 ml-2">
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

          {/* Eye icon */}
          {!isNewEmpty && (
            <div className="flex items-center gap-1 ml-4 flex-shrink-0 border-l border-slate-100 pl-4">
              <button
                onClick={() => setShowPreviewModal(true)}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                title="Preview document"
              >
                <Eye className="w-4 h-4" />
              </button>
              {saving && <span className="text-xs text-slate-400">Saving...</span>}
            </div>
          )}
        </div>
      </div>

      {/* MAIN 2-PANEL LAYOUT */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div className="w-[260px] flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white">
          {isNewEmpty ? (
            <NewEstimateCustomerPanel
              estimate={estimate}
              onCustomerSet={handleCustomerSet}
            />
          ) : (
            <>
              <EstimateClientSidebar estimate={estimate} client={client} />
              <div className="px-4 pb-5 pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Communications</p>
                <CommTimeline estimateId={estimate.id} />
              </div>
            </>
          )}
        </div>

        {/* RIGHT CANVAS */}
        <div className="flex-1 overflow-auto p-7">
          {isNewEmpty ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-500 mb-1">Select a customer to get started</p>
                <p className="text-xs text-slate-400">Choose or create a customer from the left panel</p>
              </div>
            </div>
          ) : (
            <EstimateLineItems
              estimate={estimate}
              onSave={handleSave}
              saving={saving}
            />
          )}
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