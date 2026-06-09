/**
 * CollectionActivitySummary — Compact summary of latest collection action
 *
 * Props:
 *   invoice: Invoice object
 */
import React from 'react';
import { getCollectionActivitySummary } from '@/lib/invoiceCollectionTimeline';
import { Clock, User } from 'lucide-react';

export default function CollectionActivitySummary({ invoice }) {
  const summary = getCollectionActivitySummary(invoice);

  if (!summary) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 px-2 py-1 bg-slate-50 rounded border border-slate-200">
      <Clock className="w-3 h-3 flex-shrink-0" />
      <span className="font-medium">{summary.timeLabel}</span>
      <span>·</span>
      <span>{summary.lastAction.replace(/_/g, ' ')}</span>
      {summary.lastActor && (
        <>
          <span>·</span>
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {summary.lastActor}
          </span>
        </>
      )}
    </div>
  );
}