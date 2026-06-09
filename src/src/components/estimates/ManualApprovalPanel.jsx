import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle, ThumbsDown, ThumbsUp, Loader2, UserCheck, History } from 'lucide-react';
import { toast } from 'sonner';
import { logComm } from '@/lib/commTracking';

/**
 * ManualApprovalPanel — admin panel inside EstimateEditor for manual approval/decline.
 * Shown when estimate status is sent, viewed, or changes_requested.
 */
export default function ManualApprovalPanel({ estimate, onRefresh }) {
  const [note, setNote] = useState('');
  const [acting, setActing] = useState(false);

  if (!['sent', 'viewed', 'changes_requested', 'approved'].includes(estimate?.status)) return null;

  const handleApprove = async () => {
    if (!note.trim()) { toast.error('Please add an internal approval note'); return; }
    setActing(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.Estimate.update(estimate.id, {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.full_name || user?.email || 'Admin',
        approval_note: note.trim(),
      });
      await logComm({
        event_type: 'estimate_approved',
        client_id: estimate.client_id || '',
        client_name: estimate.client_name,
        client_email: estimate.client_email || '',
        estimate_id: estimate.id,
        subject: `Estimate #${estimate.estimate_number} manually approved`,
        status: 'delivered',
      });
      toast.success('Estimate approved');
      setNote('');
      onRefresh();
    } finally {
      setActing(false);
    }
  };

  const handleDecline = async () => {
    if (!note.trim()) { toast.error('Please add a reason for declining'); return; }
    setActing(true);
    try {
      await base44.entities.Estimate.update(estimate.id, {
        status: 'declined',
        declined_reason: note.trim(),
      });
      await logComm({
        event_type: 'estimate_declined',
        client_id: estimate.client_id || '',
        client_name: estimate.client_name,
        client_email: estimate.client_email || '',
        estimate_id: estimate.id,
        subject: `Estimate #${estimate.estimate_number} declined`,
        status: 'delivered',
      });
      toast.success('Estimate declined');
      setNote('');
      onRefresh();
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="mx-4 mb-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-slate-800 flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-white/70" />
        <span className="text-xs font-bold text-white uppercase tracking-wide">Manual Approval</span>
        {estimate.version > 1 && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-white/50">
            <History className="w-3 h-3" />v{estimate.version}
          </span>
        )}
      </div>

      {estimate.status === 'approved' && (
        <div className="px-4 py-3 flex items-start gap-2 bg-green-50 border-b border-green-100">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-green-800">Approved</p>
            {estimate.approved_by && <p className="text-[11px] text-green-600">By {estimate.approved_by}</p>}
            {estimate.approval_note && <p className="text-[11px] text-green-700 mt-0.5 italic">"{estimate.approval_note}"</p>}
          </div>
        </div>
      )}

      {estimate.status === 'changes_requested' && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-xs font-semibold text-amber-800">Client requested changes</p>
          {estimate.changes_requested_note && (
            <p className="text-xs text-amber-700 mt-1 italic">"{estimate.changes_requested_note}"</p>
          )}
        </div>
      )}

      {estimate.status !== 'approved' && (
        <div className="px-4 py-3 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Internal Note</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Add note before approving or declining..."
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={acting}
              onClick={handleDecline}
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 text-xs gap-1"
            >
              <ThumbsDown className="w-3 h-3" />Decline
            </Button>
            <Button
              size="sm"
              disabled={acting}
              onClick={handleApprove}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
            >
              {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
              Approve
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}