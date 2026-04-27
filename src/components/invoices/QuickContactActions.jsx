/**
 * QuickContactActions — Lightweight communication widget
 * Call | SMS | Email quick links + message templates
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare, Mail, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  generatePaymentReminder,
  generateOverdueNotice,
  generateFollowUp,
  MESSAGE_TEMPLATES,
} from '@/lib/invoiceMessageTemplates';

export default function QuickContactActions({ invoice, isOverdue = false }) {
  const [copiedTemplate, setCopiedTemplate] = useState(null);

  if (!invoice?.client_phone && !invoice?.client_email) {
    return null;
  }

  const handleCallClick = () => {
    if (invoice.client_phone) {
      window.location.href = `tel:${invoice.client_phone}`;
    } else {
      toast.error('No phone number available');
    }
  };

  const handleCopySMS = () => {
    if (!invoice.client_phone) {
      toast.error('No phone number available');
      return;
    }
    const msg = isOverdue
      ? generateOverdueNotice(invoice)
      : generatePaymentReminder(invoice);

    navigator.clipboard.writeText(msg);
    toast.success('Message copied to clipboard');
    setCopiedTemplate('sms');
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const handleCopyEmail = () => {
    if (!invoice.client_email) {
      toast.error('No email available');
      return;
    }
    const msg = isOverdue
      ? generateOverdueNotice(invoice)
      : generatePaymentReminder(invoice);

    navigator.clipboard.writeText(msg);
    toast.success('Email body copied to clipboard');
    setCopiedTemplate('email');
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const handleCopyTemplate = (templateFn) => {
    const msg = templateFn(invoice);
    navigator.clipboard.writeText(msg);
    toast.success('Template copied');
    setCopiedTemplate('template');
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  return (
    <div className="px-4 py-4 border-t border-slate-100 space-y-3 overflow-hidden">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Contact Actions</p>

      {/* Quick Call/SMS/Email */}
      <div className="grid grid-cols-1 gap-2">
        {invoice.client_phone && (
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start text-xs gap-2 h-9 px-3"
            onClick={handleCallClick}
          >
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Call Customer</span>
          </Button>
        )}

        {invoice.client_phone && (
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start text-xs gap-2 h-9 px-3"
            onClick={handleCopySMS}
          >
            {copiedTemplate === 'sms' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="truncate">SMS Copied</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">Copy SMS Message</span>
              </>
            )}
          </Button>
        )}

        {invoice.client_email && (
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start text-xs gap-2 h-9 px-3"
            onClick={handleCopyEmail}
          >
            {copiedTemplate === 'email' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="truncate">Email Copied</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">Copy Email Message</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Message Templates */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Templates</p>
        <div className="space-y-1">
          {MESSAGE_TEMPLATES.map(tmpl => (
            <button
              key={tmpl.key}
              onClick={() => handleCopyTemplate(tmpl.fn)}
              className="w-full text-left px-2.5 py-1.5 rounded text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors border border-slate-200 flex items-center gap-2 overflow-hidden"
            >
              <Copy className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="truncate">{tmpl.label}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
        All messages include invoice #{invoice.invoice_number} and balance due.
      </p>
    </div>
  );
}