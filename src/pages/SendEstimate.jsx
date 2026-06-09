import React, { useState, useEffect } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { X, Printer, Download, Send, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import EstimateTemplateRenderer from '@/components/estimates/EstimateTemplateRenderer';
import BidDocumentRenderer from '@/components/documents/BidDocumentRenderer';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import SendEstimateModal from '@/components/estimates/SendEstimateModal';
import TransmissionPanel from '@/components/estimates/TransmissionPanel';

export default function SendEstimate() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const estimateId = urlParams.get('id');

  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);

  // Left panel sections
  const [layoutOpen, setLayoutOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [attachOpen, setAttachOpen] = useState(false);
  const [visibilityOpen, setVisibilityOpen] = useState(false);

  useEffect(() => {
    loadEstimate();
  }, []);

  const loadEstimate = async () => {
    if (!estimateId) { setLoading(false); return; }
    const list = await nexartClient.entities.Estimate.filter({ id: estimateId });
    if (list.length) setEstimate(list[0]);
    setLoading(false);
  };

  const handlePrint = () => {
    const area = document.getElementById('estimate-print-area');
    if (!area) return;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Estimate #${estimate?.estimate_number}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { margin: 0.5in; size: letter; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; }
        .border-b { border-bottom: 1px solid #e2e8f0; }
      </style>
    </head><body>${area.outerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 800);
  };

  const handleDownload = () => {
    handlePrint(); // browser save as PDF via print dialog
  };

  const handleSend = () => {
    setShowSendModal(true);
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50 font-inter">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/estimates')} className="p-1.5 hover:bg-slate-100 rounded-md">
            <X className="w-4 h-4 text-slate-500" />
          </button>
          <span className="font-semibold text-slate-800 text-sm">Send estimate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100" onClick={handlePrint} title="Print">
            <Printer className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100" onClick={handleDownload} title="Download PDF">
            <Download className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white px-5 h-8 text-sm"
            onClick={handleSend}
          >
            Send
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-64 border-r border-slate-200 bg-white flex flex-col overflow-y-auto flex-shrink-0 text-sm">

          {/* Layout */}
          <SectionHeader label="Layout" open={layoutOpen} onToggle={() => setLayoutOpen(v => !v)} />
          {layoutOpen && (
            <div className="px-4 pb-4">
              <div className="text-xs text-slate-400 mb-2">Options order</div>
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
                <div className="flex flex-col gap-0.5">
                  <div className="w-3 h-0.5 bg-slate-400 rounded" />
                  <div className="w-3 h-0.5 bg-slate-400 rounded" />
                  <div className="w-3 h-0.5 bg-slate-400 rounded" />
                </div>
                <input type="checkbox" defaultChecked className="accent-primary" />
                <span className="text-xs text-slate-700">Option #1</span>
              </div>
            </div>
          )}

          {/* Transmissions */}
          {estimate && (
            <div className="px-4 py-4 border-b border-slate-200">
              <TransmissionPanel estimateId={estimate.id} />
            </div>
          )}

          {/* Details */}
          <SectionHeader label="Details" open={detailsOpen} onToggle={() => setDetailsOpen(v => !v)} editable />
          {detailsOpen && estimate && (
            <div className="px-4 pb-4 space-y-3">
              <DetailRow label="Estimate #" value={`#${estimate.estimate_number}`} />
              <DetailRow label="Followup date" value={estimate.expiration_date || 'Oct 11, 2025'} />
              <DetailRow label="Expiration date" value={estimate.expiration_date || 'No expiration date'} />
              <DetailRow label="Customer can approve" value="Only one option" />
            </div>
          )}

          {/* Attachments */}
          <SectionHeader label="Attachments" open={attachOpen} onToggle={() => setAttachOpen(v => !v)} editable />
          {attachOpen && (
            <div className="px-4 pb-4 text-xs text-slate-400">No attachments added</div>
          )}

          {/* Visibility */}
          <SectionHeader label="Visibility" open={visibilityOpen} onToggle={() => setVisibilityOpen(v => !v)} />
          {visibilityOpen && (
            <div className="px-4 pb-4">
              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-primary" />
                Give us feedback
              </label>
            </div>
          )}
        </div>

        {/* RIGHT: PREVIEW */}
        <div className="flex-1 overflow-auto bg-slate-100 p-6">
          <div id="estimate-print-area" className="max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white">
            {estimate?.document_type === 'BID' ? (
              <BidDocumentRenderer
                estimate={estimate}
                options={{ ...DEFAULT_OPTIONS, ...(estimate?.document_config?.options || {}), hideInternalNotes: true }}
              />
            ) : (
              <EstimateTemplateRenderer
                estimate={estimate}
                template={estimate?.document_config?.template || 'clean'}
                options={{ ...DEFAULT_OPTIONS, ...(estimate?.document_config?.options || {}), hideInternalNotes: true }}
                documentType="estimate"
              />
            )}
          </div>
        </div>
      </div>
      {estimate && (
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

function SectionHeader({ label, open, onToggle, editable }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 border-b border-slate-200"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-700 text-sm">{label}</span>
        {editable && <Pencil className="w-3 h-3 text-slate-400" />}
      </div>
      {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
    </button>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
      <div className="text-sm text-slate-700">{value}</div>
    </div>
  );
}