import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EstimateStatusStepper from '@/components/estimates/EstimateStatusStepper';
import EstimateOptionTabs from '@/components/estimates/EstimateOptionTabs';
import EstimateLineItems from '@/components/estimates/EstimateLineItems';
import EstimateClientSidebar from '@/components/estimates/EstimateClientSidebar';
import SendEstimateModal from '@/components/estimates/SendEstimateModal';
import { X, Printer, Download, Send, BookOpen, LayoutTemplate } from 'lucide-react';

export default function EstimateEditor() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const estimateId = urlParams.get('id');

  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadEstimate(); }, []);

  const loadEstimate = async () => {
    if (!estimateId) { setLoading(false); return; }
    const list = await base44.entities.Estimate.filter({ id: estimateId });
    if (list.length) setEstimate(list[0]);
    setLoading(false);
  };

  const handleSave = async (updatedEstimate) => {
    setSaving(true);
    const { subtotal, tax_amount, total } = calcTotals(updatedEstimate.line_items, updatedEstimate.tax_rate);
    await base44.entities.Estimate.update(estimateId, { ...updatedEstimate, subtotal, tax_amount, total });
    setEstimate({ ...updatedEstimate, subtotal, tax_amount, total });
    setSaving(false);
    toast.success('Estimate saved');
  };

  const calcTotals = (items = [], taxRate = 0) => {
    const subtotal = items.reduce((s, i) => s + (i.total_price || 0), 0);
    const tax_amount = subtotal * ((taxRate || 0) / 100);
    return { subtotal, tax_amount, total: subtotal + tax_amount };
  };

  const handlePrint = () => {
    const area = document.getElementById('estimate-print-area');
    if (!area) return;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Estimate #${estimate?.estimate_number}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>* {margin:0;padding:0;box-sizing:border-box;} body{font-family:'Inter',sans-serif;background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact;} @page{margin:0.5in;size:letter;} table{width:100%;border-collapse:collapse;} th,td{padding:8px 12px;}</style>
    </head><body>${area.outerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 800);
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!estimate) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="text-center">
        <p className="text-slate-500 mb-4">Estimate not found</p>
        <Button onClick={() => navigate('/estimates')}>Back to Estimates</Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#f4f5f7] flex flex-col z-50 font-inter overflow-hidden">
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/estimates')} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
          <span className="font-semibold text-slate-800 text-sm">Estimate #{estimate.estimate_number}</span>
          <span className="text-xs text-slate-400">— {estimate.client_name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={handlePrint} title="Print">
            <Printer className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={handlePrint} title="Download PDF">
            <Download className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white px-5 h-8 text-sm rounded-md"
            onClick={() => setShowSendModal(true)}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />Send
          </Button>
        </div>
      </div>

      {/* STATUS STEPPER */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0 px-6 py-3">
        <EstimateStatusStepper status={estimate.status} />
      </div>

      {/* OPTION TABS */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0 px-6">
        <EstimateOptionTabs />
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        {/* CLIENT SIDEBAR */}
        <div className="w-72 bg-white border-r border-slate-200 overflow-y-auto flex-shrink-0">
          <EstimateClientSidebar estimate={estimate} />
        </div>

        {/* ESTIMATE CANVAS */}
        <div className="flex-1 overflow-auto p-6">
          <EstimateLineItems
            estimate={estimate}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      </div>

      {showSendModal && (
        <SendEstimateModal
          estimate={estimate}
          open={showSendModal}
          onClose={() => setShowSendModal(false)}
          onSent={() => navigate('/estimates')}
        />
      )}
    </div>
  );
}