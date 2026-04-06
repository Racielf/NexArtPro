import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PaymentReceiptRenderer from './PaymentReceiptRenderer';

/**
 * PaymentReceiptPreviewModal
 * Full-screen preview modal for a payment receipt.
 *
 * Props:
 *   receipt  — receipt object from buildReceipt()
 *   onClose  — () => void
 */
export default function PaymentReceiptPreviewModal({ receipt, onClose }) {
  if (!receipt) return null;

  const handlePrint = () => {
    const content = document.getElementById('payment-receipt-doc');
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Payment Receipt #${receipt.receipt_number}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @media print { body { margin: 0; } }
            body { margin: 0; background: #fff; }
          </style>
        </head>
        <body>${content.outerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800 text-sm">
            Payment Receipt #{receipt.receipt_number}
          </span>
          <span className="text-xs text-slate-400">{receipt.customer_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
            <Download className="w-3.5 h-3.5" /> Save PDF
          </Button>
          <button
            onClick={onClose}
            className="ml-1 p-1.5 rounded-md hover:bg-slate-100 transition-colors text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable document */}
      <div className="flex-1 overflow-y-auto bg-slate-100 px-6 py-8 flex justify-center">
        <div className="w-full max-w-2xl shadow-2xl rounded-lg overflow-hidden bg-white">
          <PaymentReceiptRenderer receipt={receipt} />
        </div>
      </div>
    </div>
  );
}