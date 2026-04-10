import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, Save, Eye, Send, CheckCircle, Plus, Trash2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const STATUS_CONFIG = {
  draft:    { label: 'Draft (Estimate)',  cls: 'bg-slate-100 text-slate-600' },
  sent:     { label: 'Sent (Bid)',        cls: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepted (Invoice)', cls: 'bg-green-100 text-green-800' },
};

const emptyItem = () => ({
  id: Math.random().toString(36).slice(2),
  service_name: '',
  description: '',
  quantity: 1,
  unit: 'ea',
  unit_price: 0,
  line_total: 0,
});

export default function ProposalEditor() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const proposalId = urlParams.get('id');
  const isNew = urlParams.get('new') === '1';

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    if (!proposalId) { setLoading(false); return; }
    const list = await base44.entities.Proposal.filter({ id: proposalId });
    if (list.length) setProposal(list[0]);
    setLoading(false);
  };

  const isLocked = proposal?.status === 'accepted';
  const isEditable = proposal?.status === 'draft';

  // Recalculate totals whenever items change
  const recalc = (items, taxRate = 0, discountValue = 0) => {
    const subtotal = items.reduce((s, it) => s + (it.line_total || 0), 0);
    const discounted = Math.max(0, subtotal - discountValue);
    const taxAmount = discounted * (taxRate / 100);
    return { subtotal, tax_amount: taxAmount, total_amount: discounted + taxAmount };
  };

  const updateItem = (id, field, value) => {
    if (!isEditable) return;
    setProposal(p => {
      const items = p.items.map(it => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.line_total = (updated.quantity || 0) * (updated.unit_price || 0);
        }
        return updated;
      });
      return { ...p, items, ...recalc(items, p.tax_rate, p.discount_value) };
    });
  };

  const addItem = () => {
    if (!isEditable) return;
    setProposal(p => ({ ...p, items: [...(p.items || []), emptyItem()] }));
  };

  const removeItem = (id) => {
    if (!isEditable) return;
    setProposal(p => {
      const items = p.items.filter(it => it.id !== id);
      return { ...p, items, ...recalc(items, p.tax_rate, p.discount_value) };
    });
  };

  const updateField = (field, value) => {
    if (isLocked) return;
    setProposal(p => {
      const updated = { ...p, [field]: value };
      if (field === 'tax_rate' || field === 'discount_value') {
        Object.assign(updated, recalc(p.items || [], updated.tax_rate, updated.discount_value));
      }
      return updated;
    });
  };

  const save = async () => {
    setSaving(true);
    await base44.entities.Proposal.update(proposalId, proposal);
    setSaving(false);
    toast.success('Saved');
  };

  const sendToBid = async () => {
    if (proposal.status !== 'draft') return;
    setSaving(true);
    const updated = { ...proposal, status: 'sent', sent_at: new Date().toISOString() };
    await base44.entities.Proposal.update(proposalId, updated);
    setProposal(updated);
    setSaving(false);
    toast.success('Proposal sent — now in Bid status');
  };

  const fmtCurrency = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('Client link copied to clipboard');
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!proposal) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <p className="text-slate-500">Proposal not found</p>
    </div>
  );

  const statusBadge = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;
  const publicUrl = `${window.location.origin}/proposal-view?id=${proposalId}`;

  return (
    <div className="fixed inset-0 bg-[#f0f2f5] flex flex-col z-50 font-inter">

      {/* TOP BAR */}
      <div className="bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex items-center px-4 h-12 gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">PROPOSAL</span>
          <span className="text-base font-bold text-slate-900">#{proposal.proposal_number}</span>
          {proposal.client_name && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-sm font-semibold text-slate-700 truncate">{proposal.client_name}</span>
            </>
          )}
          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>

          <div className="flex-1" />

          {/* Actions */}
          {!isLocked && (
            <>
              {proposal.status === 'draft' && (
                <Button size="sm" variant="outline" onClick={sendToBid} className="gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Send as Bid
                </Button>
              )}
              {proposal.status === 'sent' && (
                <Button size="sm" variant="outline" onClick={handleCopyLink} className="gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50">
                  <Send className="w-3.5 h-3.5" /> Copy Client Link
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => window.open(publicUrl, '_blank')} className="gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Preview
              </Button>
              <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          )}
          {isLocked && (
            <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
              <CheckCircle className="w-4 h-4" /> Accepted — Invoice #{proposal.invoice_number || 'Pending'}
            </div>
          )}
          <button onClick={() => navigate('/proposals')} className="ml-2 p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full">

        {/* Client Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Client</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { field: 'client_name', label: 'Full Name *' },
              { field: 'client_email', label: 'Email' },
              { field: 'client_phone', label: 'Phone' },
              { field: 'client_address', label: 'Address' },
            ].map(({ field, label }) => (
              <div key={field} className={field === 'client_address' ? 'col-span-2' : ''}>
                <label className="text-xs text-slate-500 font-medium block mb-1">{label}</label>
                <Input
                  value={proposal[field] || ''}
                  onChange={e => updateField(field, e.target.value)}
                  disabled={isLocked}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <label className="text-xs text-slate-500 font-medium block mb-1">Project Title</label>
          <Input value={proposal.title || ''} onChange={e => updateField('title', e.target.value)} disabled={isLocked} placeholder="e.g. Kitchen Remodel" className="text-sm" />
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Services / Items</h2>
            <span className="text-xs text-slate-500">{(proposal.items || []).length} items</span>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            <div className="col-span-4">Service</div>
            <div className="col-span-2">Description</div>
            <div className="col-span-1 text-center">Qty</div>
            <div className="col-span-1 text-center">Unit</div>
            <div className="col-span-2 text-right">Unit Price</div>
            <div className="col-span-2 text-right">Total</div>
          </div>

          {(proposal.items || []).map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 px-5 py-2.5 border-b border-slate-50 items-center group hover:bg-slate-50/50">
              <div className="col-span-4">
                <Input value={item.service_name} onChange={e => updateItem(item.id, 'service_name', e.target.value)}
                  disabled={isLocked} placeholder="Service name" className="h-7 text-xs" />
              </div>
              <div className="col-span-2">
                <Input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                  disabled={isLocked} placeholder="Notes" className="h-7 text-xs" />
              </div>
              <div className="col-span-1">
                <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  disabled={isLocked} className="h-7 text-xs text-center" />
              </div>
              <div className="col-span-1">
                <Input value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}
                  disabled={isLocked} className="h-7 text-xs text-center" />
              </div>
              <div className="col-span-2">
                <Input type="number" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                  disabled={isLocked} className="h-7 text-xs text-right" />
              </div>
              <div className="col-span-1 text-right text-sm font-semibold text-slate-800">
                {fmtCurrency(item.line_total)}
              </div>
              {isEditable && (
                <div className="col-span-1 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => removeItem(item.id)} className="p-1 text-red-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {isEditable && (
            <button onClick={addItem} className="w-full flex items-center gap-2 px-5 py-3 text-xs text-primary hover:bg-primary/5 font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add line item
            </button>
          )}
        </div>

        {/* Totals */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <div className="max-w-xs ml-auto space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span><span className="font-semibold">{fmtCurrency(proposal.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-600">
              <span>Discount ($)</span>
              <Input type="number" value={proposal.discount_value || 0}
                onChange={e => updateField('discount_value', parseFloat(e.target.value) || 0)}
                disabled={isLocked} className="h-7 text-xs w-24 text-right" />
            </div>
            <div className="flex justify-between items-center text-sm text-slate-600">
              <span>Tax (%)</span>
              <Input type="number" value={proposal.tax_rate || 0}
                onChange={e => updateField('tax_rate', parseFloat(e.target.value) || 0)}
                disabled={isLocked} className="h-7 text-xs w-24 text-right" />
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total</span><span className="text-primary">{fmtCurrency(proposal.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Notes */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            { field: 'payment_terms', label: 'Payment Terms', placeholder: 'e.g. 50% deposit, balance on completion…' },
            { field: 'legal_terms', label: 'Legal Terms', placeholder: 'Legal language, warranty, liability…' },
            { field: 'notes', label: 'Client Notes', placeholder: 'Visible to client…' },
            { field: 'internal_notes', label: 'Internal Notes', placeholder: 'Team only — not visible to client…' },
          ].map(({ field, label, placeholder }) => (
            <div key={field} className="bg-white rounded-xl border border-slate-200 p-4">
              <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${field === 'internal_notes' ? 'text-amber-600' : 'text-slate-500'}`}>{label}</label>
              <textarea
                value={proposal[field] || ''}
                onChange={e => updateField(field, e.target.value)}
                disabled={isLocked}
                placeholder={placeholder}
                rows={3}
                className="w-full text-xs text-slate-700 resize-none focus:outline-none placeholder:text-slate-300 disabled:opacity-60"
              />
            </div>
          ))}
        </div>

        {/* Accepted info */}
        {isLocked && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-green-800">Accepted — Legally Binding</h3>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              {proposal.accepted_by_name && <p><span className="font-medium">Accepted by:</span> {proposal.accepted_by_name}</p>}
              {proposal.accepted_at && <p><span className="font-medium">At:</span> {new Date(proposal.accepted_at).toLocaleString()}</p>}
              {proposal.accepted_ip && <p><span className="font-medium">IP:</span> {proposal.accepted_ip}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}