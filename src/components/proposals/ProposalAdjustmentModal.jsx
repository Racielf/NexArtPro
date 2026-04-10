import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FileEdit } from 'lucide-react';

/**
 * ProposalAdjustmentModal
 * Creates a new Adjustment Estimate from a Proposal.
 * Props:
 *   open         — boolean
 *   onClose      — () => void
 *   proposal     — the source proposal object
 *   onConverted  — (newStatus, extra) => void
 */
export default function ProposalAdjustmentModal({ open, onClose, proposal, onConverted }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!reason.trim()) {
      toast.error('Please describe the requested changes.');
      return;
    }
    setLoading(true);

    // Get next estimate number
    const list = await base44.entities.Estimate.list('-created_date', 20);
    const nextNum = list.length ? Math.max(...list.map(e => e.estimate_number || 0)) + 1 : 1001;

    // Build groups from proposal items
    const items = (proposal.items || []).map(it => ({ ...it }));
    const groups = [{
      id: 'g1',
      name: 'Scope of Work',
      collapsed: false,
      items: items,
    }];

    const newEstimate = await base44.entities.Estimate.create({
      estimate_number: nextNum,
      source_proposal_id: proposal.id,
      client_id: proposal.client_id,
      client_name: proposal.client_name,
      client_email: proposal.client_email,
      client_phone: proposal.client_phone,
      client_address: proposal.client_address,
      title: proposal.title ? `[Adjustment] ${proposal.title}` : `Adjustment Estimate`,
      status: 'draft',
      groups,
      line_items: items,
      subtotal: proposal.subtotal || 0,
      tax_rate: proposal.tax_rate || 0,
      tax_amount: proposal.tax_amount || 0,
      discount_value: proposal.discount_value || 0,
      discount_type: 'fixed',
      total: proposal.total_amount || 0,
      payment_terms: proposal.payment_terms || '',
      legal_terms: proposal.legal_terms || '',
      notes: proposal.notes || '',
      internal_notes: `Adjustment requested from Proposal #${proposal.proposal_number}.\n\nChange log:\n${reason}`,
    });

    // Mark proposal as pending_adjustment with reference
    await base44.entities.Proposal.update(proposal.id, {
      status: 'pending_adjustment',
      adjustment_estimate_id: newEstimate.id,
      adjustment_estimate_number: nextNum,
      adjustment_reason: reason,
    });

    setLoading(false);
    toast.success(`Adjustment Estimate #${nextNum} created`);
    onConverted('pending_adjustment', {
      adjustment_estimate_id: newEstimate.id,
      adjustment_estimate_number: nextNum,
      adjustment_reason: reason,
    });
    setReason('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-amber-600" />
            Generate Adjustment Estimate
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <p className="text-sm text-slate-500">
            This will create a new <strong>Estimate</strong> from this proposal so the client's changes can be negotiated and re-approved before converting to Invoice or Work Order.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Change Log / Adjustment Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              rows={5}
              placeholder="Describe what the client requested to change..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">What happens next:</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700">
              <li>A new Estimate is created with all items copied</li>
              <li>This Proposal is marked <strong>Pending Adjustment</strong></li>
              <li>The new Estimate must be approved before billing</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-end pt-1 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleCreate} disabled={loading || !reason.trim()}>
              {loading ? 'Creating…' : 'Create Adjustment Estimate'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}