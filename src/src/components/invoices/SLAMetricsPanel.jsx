/**
 * SLAMetricsPanel — Compact collections dashboard
 *
 * Props:
 *   invoices: Invoice[]
 *   onDrillDown: (dimension, value) => void
 */
import React from 'react';
import { computeSLAMetrics } from '@/lib/invoiceSLAMetrics';
import { AlertTriangle, TrendingUp, Clock, User } from 'lucide-react';

export default function SLAMetricsPanel({ invoices = [], onDrillDown }) {
  const metrics = computeSLAMetrics(invoices);

  const MetricCard = ({ label, value, subtext, variant = 'default', onClick }) => {
    const baseClasses = 'rounded-lg border px-3 py-2.5 cursor-pointer transition-all hover:shadow-sm';
    const variantClasses = {
      default: 'bg-white border-slate-200 hover:border-slate-300',
      critical: 'bg-red-50 border-red-200 hover:bg-red-100/50',
      high: 'bg-amber-50 border-amber-200 hover:bg-amber-100/50',
      info: 'bg-blue-50 border-blue-200 hover:bg-blue-100/50',
    };

    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${variantClasses[variant]} text-left`}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-lg font-bold mt-0.5" style={{
          color: variant === 'critical' ? '#dc2626' : variant === 'high' ? '#b45309' : '#1f2937'
        }}>
          {value}
        </p>
        {subtext && <p className="text-xs text-slate-500 mt-0.5">{subtext}</p>}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {/* Top row: Critical + High breaches */}
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard
          label="🔴 Critical"
          value={metrics.criticalCount}
          variant="critical"
          onClick={() => onDrillDown?.('critical', true)}
        />
        <MetricCard
          label="🟠 High"
          value={metrics.highCount}
          variant="high"
          onClick={() => onDrillDown?.('high', true)}
        />
      </div>

      {/* Breach types */}
      {metrics.totalWithBreaches > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Breach Types</p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {Object.entries(metrics.breachesByType).map(([type, count]) => {
              if (count === 0) return null;
              const labels = {
                missed_followup: 'Missed Follow-up',
                broken_promise: 'Broken Promise',
                unassigned_issue: 'Unassigned Issue',
                stale_issue: 'Stale Issue',
                no_recent_contact: 'No Contact',
              };
              return (
                <button
                  key={type}
                  onClick={() => onDrillDown?.('breach_type', type)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition-colors text-left"
                >
                  <span className="font-medium">{count}</span> {labels[type]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Overdue + Promises + Issues */}
      <div className="grid grid-cols-3 gap-2.5">
        <MetricCard
          label="📋 Overdue"
          value={metrics.overdueCount}
          variant="info"
          onClick={() => onDrillDown?.('overdue', true)}
        />
        <MetricCard
          label="⏰ Broken Promise"
          value={metrics.brokenPromiseCount}
          variant="high"
          onClick={() => onDrillDown?.('broken_promise', true)}
        />
        <MetricCard
          label="👤 Unassigned Issue"
          value={metrics.unassignedIssueCount}
          variant="critical"
          onClick={() => onDrillDown?.('unassigned_issue', true)}
        />
      </div>

      {/* Aging buckets (if any overdue) */}
      {metrics.overdueCount > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Overdue Aging</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: '0-3d', label: '0–3 days' },
              { key: '4-7d', label: '4–7 days' },
              { key: '8+d', label: '8+ days' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onDrillDown?.('aging', key)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition-colors text-center"
              >
                <p className="text-sm font-bold text-slate-900">{metrics.agingBuckets[key]}</p>
                <p className="text-[10px] text-slate-500">{label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* By owner (compact) */}
      {Object.keys(metrics.invoicesByOwner).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">By Owner</p>
          <div className="space-y-1">
            {Object.entries(metrics.invoicesByOwner).map(([owner, data]) => (
              <button
                key={owner}
                onClick={() => onDrillDown?.('owner', owner)}
                className="w-full flex items-center justify-between px-2 py-1.5 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition-colors text-xs"
              >
                <span className="font-medium">{owner}</span>
                <span className="text-slate-500">
                  {data.total} ({data.urgent > 0 ? `${data.urgent}🔴` : ''}
                  {data.action_today > 0 ? ` ${data.action_today}🟠` : ''})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}