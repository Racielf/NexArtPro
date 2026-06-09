/**
 * QuickContactActions — Lightweight communication widget
 * Call | SMS | Email quick links + message templates
 */

import React, { useState } from 'react';
import { Phone, MessageSquare, Mail, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  generatePaymentReminder,
  generateOverdueNotice,
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

  const ActionButton = ({ onClick, icon: Icon, children, success = false }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors"
    >
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${success ? 'text-green-600' : 'text-slate-500'}`} />
      <span className="truncate">{children}</span>
    </button>
  );

  return (
    <div className="px-4 py-4 border-t border-b border-slate-100 bg-white space-y-3">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Contact Actions</p>

      <div className="space-y-2">
        {invoice.client_phone && (
          <ActionButton onClick={handleCallClick} icon={Phone}>
            Call Customer
          </ActionButton>
        )}

        {invoice.client_phone && (
          <ActionButton
            onClick={handleCopySMS}
            icon={copiedTemplate === 'sms' ? CheckCircle2 : MessageSquare}
            success={copiedTemplate === 'sms'}
          >
            {copiedTemplate === 'sms' ? 'SMS Copied' : 'Copy SMS Message'}
          </ActionButton>
        )}

        {invoice.client_email && (
          <ActionButton
            onClick={handleCopyEmail}
            icon={copiedTemplate === 'email' ? CheckCircle2 : Mail}
            success={copiedTemplate === 'email'}
          >
            {copiedTemplate === 'email' ? 'Email Copied' : 'Copy Email Message'}
          </ActionButton>
        )}
      </div>

      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Templates</p>
        <div className="space-y-1">
          {MESSAGE_TEMPLATES.map(tmpl => (
            <button
              key={tmpl.key}
              type="button"
              onClick={() => handleCopyTemplate(tmpl.fn)}
              className="w-full text-left px-2.5 py-1.5 rounded text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors border border-slate-200 flex items-center gap-2"
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