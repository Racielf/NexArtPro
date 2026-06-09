import React from 'react';
import { CreditCard, Mail, DollarSign } from 'lucide-react';

/**
 * PaymentInstructions — Client-facing payment methods and instructions.
 * Lightweight, non-technical, action-oriented.
 */
export default function PaymentInstructions({ invoice }) {
  if (!invoice) return null;

  return (
    <div className="border border-slate-200 rounded-xl p-6 space-y-4 bg-slate-50">
      <h3 className="text-sm font-bold text-slate-900">How to Pay</h3>

      <div className="space-y-3">
        {/* Payment Methods */}
        <div className="space-y-2">
          <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide">Accepted Payment Methods</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <CreditCard className="w-4 h-4 text-slate-500" />
              <span>Credit/Debit Card</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <span>Check or Bank Transfer</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <span>Cash</span>
            </div>
          </div>
        </div>

        {/* Contact Instructions */}
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2">Next Steps</p>
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-slate-700">
                Reply to this invoice or contact us directly to arrange payment.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Email: <span className="font-medium text-slate-700">rcartconstruction@gmail.com</span>
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Details Note */}
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Invoice <strong>#{invoice.invoice_number}</strong> for <strong>{invoice.client_name}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}