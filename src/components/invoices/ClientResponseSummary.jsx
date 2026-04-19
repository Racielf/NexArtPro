import React from 'react';
import { Check, HelpCircle, Clock } from 'lucide-react';

/**
 * ClientResponseSummary — Shows client response in internal invoice detail view.
 */
export default function ClientResponseSummary({ invoice }) {
  if (!invoice?.client_response_at || invoice.client_response_status === 'no_response') {
    return null;
  }

  const responseConfig = {
    will_pay_soon: {
      label: 'Client says paying soon',
      icon: Check,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
    },
    has_question: {
      label: 'Client has a question',
      icon: HelpCircle,
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
    },
    needs_time: {
      label: 'Client requested more time',
      icon: Clock,
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
    },
  };

  const config = responseConfig[invoice.client_response_status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${config.bg}`}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${config.color}`} />
      <div className="flex-1">
        <p className={`font-semibold ${config.color}`}>{config.label}</p>
        {invoice.client_response_note && (
          <p className={`mt-1 text-[11px] ${config.color}`}>
            "{invoice.client_response_note}"
          </p>
        )}
        <p className="text-[11px] text-slate-500 mt-1">
          {new Date(invoice.client_response_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}