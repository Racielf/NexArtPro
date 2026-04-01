import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { X, Printer, Send, CheckCircle, XCircle, ClipboardList, Receipt, Navigation2 } from 'lucide-react';
import EstimateStatusStepper from '@/components/estimates/EstimateStatusStepper';
import EstimateOptionTabs from '@/components/estimates/EstimateOptionTabs';
import EstimateLineItems from '@/components/estimates/EstimateLineItems';
import EstimateClientSidebar from '@/components/estimates/EstimateClientSidebar';
import CommTimeline from '@/components/shared/CommTimeline';
import SendEstimateModal from '@/components/estimates/SendEstimateModal';
import EstimatePreview from '@/components/estimates/EstimatePreview';

export default function EstimateEditor() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const estimateId = urlParams.get('id');

  const [estimate, setEstimate] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [saving, setSaving] = useState(false);
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
    const toSave = { ...updatedEstimate };
    await base44.entities.Estimate.update(estimateId, toSave);
    setEstimate(toSave);
    setSaving(false);
  };

  const handleApprove = async () => {
    await base44.entities.Estimate.update(estimateId, { status: 'approved', approved_at: new Date().toISOString() });
    setEstimate(e => ({ ...e, status: 'approved' }));
    toast.success('Estimate approved!');
  };

  const handleDecline = async () => {
    await base44.entities.Estimate.update(estimateId, { status: 'declined' });
    setEstimate(e => ({ ...e, status: 'declined' }));
    toast.success('Estimate marked as declined');
  };

  const handleConvertToWorkOrder = async () => {
    const existing = await base44.entities.WorkOrder.filter({ estimate_id: estimateId });
    if (existing.length > 0) { toast.error('Already converted to work order'); return; }
    const woNum = Math.floor(Math.random() * 9000) + 1000;
    await base44.entities.WorkOrder.create({
      work_order_number: woNum,
      estimate_id: estimateId,
      client_id: estimate.client_id,
      client_name: estimate.client_name,
      client_address: estimate.client_address,
      client_phone: estimate.client_phone,
      title: estimate.title || `Work Order from Estimate #${estimate.estimate_number}`,
      line_items: estimate.line_items,
      subtotal: estimate.subtotal,
      total: estimate.total,
      status: 'pending'
    });
    await base44.entities.Estimate.update(estimateId, { status: 'converted' });
    setEstimate(e => ({ ...e, status: 'converted' }));
    toast.success('Converted to Work Order!');
  };

  const handleConvertToInvoice = async () => {
    const invNum = Math.floor(Math.random() * 9000) + 1000;
    await base44.entities.Invoice.create({
      invoice_number: invNum,
      estimate_id: estimateId,
      client_id: estimate.client_id,
      client_name: estimate.client_name,
      client_email: estimate.client_email,
      client_address: estimate.client_address,
      client_phone: estimate.client_phone,
      line_items: estimate.line_items,
      subtotal: estimate.subtotal,
      tax_rate: estimate.tax_rate,
      tax_amount: estimate.tax_amount,
      total: estimate.total,
      status: 'draft'
    });
    toast.success('Converted to Invoice!');
    navigate('/invoices');
  };

  const handlePrint = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      const area = document.getElementById('estimate-print-area');
      if (!area) return;
      const w = window.open('', '_blank');
      w.document.write(`<!DOCTYPE html><html><head><title>Estimate #${estimate?.estimate_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Inter',sans-serif;background:white;}</style>
      </head><body>${area.outerHTML}</body></html>`);
      w.document.close();
      setTimeout(() => { w.print(); setShowPrintPreview(false); }, 800);
    }, 300);
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
        <div className="flex items-center justify-between px-4 py-2">

          {/* Left: close + title + option tabs */}
          <div className="flex items-center gap-0 flex-1 min-w-0">
            <button
              onClick={() => navigate('/estimates')}
              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors mr-2 flex-shrink-0"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
            <span className="font-bold text-slate-800 text-sm mr-4 whitespace-nowrap flex-shrink-0">Estimate</span>
            <EstimateOptionTabs
              activeOption={activeOption}
              options={options}
              onSelectOption={setActiveOption}
              onAddOption={handleAddOption}
            />
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
            {estimate.status === 'sent' && (
              <>
                <Button size="sm" variant="outline" className="border-green-300 text-green-600 hover:bg-green-50 h-8" onClick={handleApprove}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                </Button>
                <Button size="sm" variant="outline" className="border-red-300 text-red-500 hover:bg-red-50 h-8" onClick={handleDecline}>
                  <XCircle className="w-3.5 h-3.5 mr-1" />Decline
                </Button>
              </>
            )}
            {estimate.status === 'approved' && (
              <>
                <Button size="sm" variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50 h-8" onClick={handleConvertToWorkOrder}>
                  <ClipboardList className="w-3.5 h-3.5 mr-1" />Work Order
                </Button>
                <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/5 h-8" onClick={handleConvertToInvoice}>
                  <Receipt className="w-3.5 h-3.5 mr-1" />Invoice
                </Button>
              </>
            )}
            <button onClick={handlePrint} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors" title="Print">
              <Printer className="w-4 h-4" />
            </button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white h-8 px-4"
              onClick={() => setShowSendModal(true)}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />Send
            </Button>
            {saving && <span className="text-xs text-slate-400 ml-1">Saving...</span>}
          </div>
        </div>

        {/* STATUS STEPPER */}
        <div className="px-6 pb-2 pt-0.5 flex items-center flex-wrap gap-2">
          <EstimateStatusStepper
            status={estimate.status}
            estimate={estimate}
            onStatusChange={(newStatus) => {
              setEstimate(e => ({ ...e, status: newStatus }));
              loadEstimate();
            }}
          />
          {/* Convert to Invoice button (when approved) */}
          {estimate.status === 'approved' && (
            <button
              onClick={handleConvertToInvoice}
              className="ml-4 flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors font-semibold"
            >
              <Receipt className="w-3.5 h-3.5" />Convert to Invoice
            </button>
          )}
        </div>
      </div>

      {/* MAIN 2-PANEL LAYOUT */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div className="w-[270px] flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white">
          <EstimateClientSidebar estimate={estimate} client={client} />
          {/* Communications Timeline */}
          <div className="px-4 pb-4 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Communications</p>
            <CommTimeline estimateId={estimate.id} />
          </div>
        </div>

        {/* RIGHT CANVAS */}
        <div className="flex-1 overflow-auto p-5">
          <EstimateLineItems
            estimate={estimate}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      </div>

      {/* Hidden print area */}
      {showPrintPreview && (
        <div className="hidden" id="estimate-print-area">
          <EstimatePreview estimate={estimate} />
        </div>
      )}

      {showSendModal && (
        <SendEstimateModal
          estimate={estimate}
          open={showSendModal}
          onClose={() => setShowSendModal(false)}
          onSent={() => { loadEstimate(); setShowSendModal(false); }}
        />
      )}
    </div>
  );
}