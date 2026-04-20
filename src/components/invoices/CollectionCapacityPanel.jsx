import React, { useState } from 'react';
import { AlertTriangle, User, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { buildCollectionCapacityByOwner, getSortedOwners, getUnassignedWorkloadSummary } from '@/lib/invoiceCollectionCapacity';
import { getInvoiceWorkloadCategory } from '@/lib/invoiceCollectionWorkload';
import { computeInvoiceDerivedFields } from '@/lib/invoiceHelpers';
import BillingIssueOwnerSelect from './BillingIssueOwnerSelect';

/**
 * CollectionCapacityPanel — Shows per-owner collections workload distribution
 * Compact operational view of team capacity and unassigned bottlenecks
 */
export default function CollectionCapacityPanel({ invoices, onAssignmentChange }) {
  const capacityData = buildCollectionCapacityByOwner(invoices);
  const sorted = getSortedOwners(capacityData);
  const unassigned = getUnassignedWorkloadSummary(capacityData);
  const [expandedUnassigned, setExpandedUnassigned] = useState(false);

  if (!invoices.length) return null;

  // Get unassigned urgent invoices for quick assignment
  const unassignedUrgent = invoices.filter(inv => {
    const { balance_due } = computeInvoiceDerivedFields(inv);
    if (balance_due <= 0) return false;
    const workloadCategory = getInvoiceWorkloadCategory(inv);
    return workloadCategory === 'urgent' && 
           (!inv.billing_issue_status || !inv.billing_issue_owner);
  });

  return (
    <div className="space-y-3">
      {/* Unassigned Alert */}
      {(unassigned.urgent_count > 0 || unassigned.billing_issue_count > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <button
                onClick={() => setExpandedUnassigned(!expandedUnassigned)}
                className="text-sm font-semibold text-red-700 hover:underline text-left"
              >
                Unassigned Bottleneck
              </button>
              <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-red-600">
                {unassigned.urgent_count > 0 && (
                  <span className="font-medium">{unassigned.urgent_count} urgent · ${(unassigned.urgent_amount / 1000).toFixed(0)}k</span>
                )}
                {unassigned.billing_issue_count > 0 && (
                  <span className="font-medium">{unassigned.billing_issue_count} billing issue{unassigned.billing_issue_count > 1 ? 's' : ''}</span>
                )}
              </div>

              {/* Expandable list of urgent unassigned */}
              {expandedUnassigned && unassignedUrgent.length > 0 && (
                <div className="mt-2.5 space-y-2 border-t border-red-200 pt-2.5">
                  {unassignedUrgent.slice(0, 5).map(inv => (
                    <div key={inv.id} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-medium text-red-700">INV#{inv.invoice_number} — {inv.client_name}</span>
                      <BillingIssueOwnerSelect
                        currentOwner={inv.billing_issue_owner}
                        compact
                        onAssign={async (owner) => {
                          await base44.entities.Invoice.update(inv.id, { billing_issue_owner: owner });
                          onAssignmentChange?.();
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Capacity Cards */}
      {sorted.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Capacity ({sorted.length} owner{sorted.length > 1 ? 's' : ''})</p>
          </div>
          <div className="divide-y divide-slate-100">
            {sorted.map(owner => (
              <div key={owner.owner} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 text-slate-500" />
                    </div>
                    <span className="font-semibold text-slate-800 text-sm truncate">{owner.owner}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-600 tabular-nums whitespace-nowrap">
                    ${(owner.total_balance / 1000).toFixed(0)}k
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  {owner.urgent_count > 0 && (
                    <span className="px-2 py-1 rounded-full bg-red-50 text-red-600 font-medium">
                      {owner.urgent_count} urgent
                    </span>
                  )}
                  {owner.action_today_count > 0 && (
                    <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-medium">
                      {owner.action_today_count} today
                    </span>
                  )}
                  {owner.billing_issue_count > 0 && (
                    <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                      {owner.billing_issue_count} issue{owner.billing_issue_count > 1 ? 's' : ''}
                    </span>
                  )}
                  {owner.urgent_count === 0 && owner.action_today_count === 0 && owner.billing_issue_count === 0 && (
                    <span className="text-slate-400 text-[10px]">monitoring</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Urgent</p>
            <p className="text-sm font-bold text-red-600 mt-1">{capacityData.total.urgent_count}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today</p>
            <p className="text-sm font-bold text-amber-600 mt-1">{capacityData.total.action_today_count}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issues</p>
            <p className="text-sm font-bold text-blue-600 mt-1">{capacityData.total.billing_issue_count}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance</p>
            <p className="text-sm font-bold text-slate-700 mt-1 tabular-nums">${(capacityData.total.total_balance / 1000).toFixed(0)}k</p>
          </div>
        </div>
      )}
    </div>
  );
}