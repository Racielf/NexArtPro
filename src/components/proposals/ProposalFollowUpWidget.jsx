import React, { useState } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { toast } from 'sonner';
import { Bell, CheckCheck, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * ProposalFollowUpWidget — Lightweight follow-up tracking for active proposals.
 *
 * Shows: last follow-up date, next follow-up date, quick note.
 * Actions: Mark follow-up done, set next follow-up date.
 *
 * Only visible for commercially active statuses.
 */

const ACTIVE_STATUSES = ['sent', 'pending_adjustment', 'approved', 'accepted', 'review_needed'];

export default function ProposalFollowUpWidget({ proposal, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(proposal?.follow_up_note || '');
  const [nextDate, setNextDate] = useState(
    proposal?.next_follow_up_at ? proposal.next_follow_up_at.slice(0, 10) : ''
  );

  if (!ACTIVE_STATUSES.includes(proposal?.status)) return null;

  const lastFollowUp = proposal?.last_follow_up_at;
  const nextFollowUp = proposal?.next_follow_up_at;
  const followUpCount = proposal?.follow_up_count || 0;

  const isOverdue = nextFollowUp && new Date(nextFollowUp) < new Date();

  const handleMarkDone = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const updates = {
      last_follow_up_at: now,
      follow_up_count: followUpCount + 1,
      follow_up_note: note.trim() || proposal?.follow_up_note || '',
      next_follow_up_at: nextDate ? new Date(nextDate + 'T09:00:00').toISOString() : null,
    };
    await nexartClient.entities.Proposal.update(proposal.id, updates);
    setSaving(false);
    toast.success('Follow-up recorded');
    onUpdate({ ...proposal, ...updates });
    setOpen(false);
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bell className={`w-3.5 h-3.5 flex-shrink-0 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
            Follow-up
          </span>
          {followUpCount > 0 && (
            <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-px rounded-full">
              {followUpCount}×
            </span>
          )}
          {isOverdue && (
            <span className="text-[9px] bg-red-100 text-red-600 font-bold px-1.5 py-px rounded-full">OVERDUE</span>
          )}
        </div>
        {open ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
      </button>

      {/* Summary when collapsed */}
      {!open && (
        <div className="px-3 py-2 space-y-0.5">
          {lastFollowUp ? (
            <p className="text-[10px] text-slate-400">
              Last: <span className="text-slate-600 font-medium">{new Date(lastFollowUp).toLocaleDateString()}</span>
            </p>
          ) : (
            <p className="text-[10px] text-slate-400 italic">No follow-ups yet</p>
          )}
          {nextFollowUp && (
            <p className={`text-[10px] font-medium ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
              Next: {new Date(nextFollowUp).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Expanded form */}
      {open && (
        <div className="px-3 py-3 space-y-2.5 border-t border-slate-100">
          {/* Note */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Quick Note</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="What happened / what's next..."
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Next follow-up date */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
              <Calendar className="w-3 h-3 inline mr-1" />Schedule Next
            </label>
            <input
              type="date"
              value={nextDate}
              onChange={e => setNextDate(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-primary"
            />
          </div>

          {/* Actions */}
          <button
            onClick={handleMarkDone}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Mark Follow-up Done'}
          </button>
        </div>
      )}
    </div>
  );
}