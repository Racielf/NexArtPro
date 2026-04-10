import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import ClientFormModal from '@/components/proposals/ClientFormModal';
import { ScrollText, Plus, Search, Pencil, Trash2, CheckCircle, Send, Clock, AlertCircle, FileText, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  draft:                   { label: 'Draft',              icon: Clock,         cls: 'bg-slate-100 text-slate-600' },
  review_needed:           { label: 'Review Needed',      icon: AlertCircle,   cls: 'bg-amber-100 text-amber-700' },
  sent:                    { label: 'Sent',               icon: Send,          cls: 'bg-blue-100 text-blue-700' },
  approved:                { label: 'Approved',           icon: CheckCircle,   cls: 'bg-emerald-100 text-emerald-800' },
  accepted:                { label: 'Accepted',           icon: CheckCircle,   cls: 'bg-emerald-100 text-emerald-800' },
  rejected:                { label: 'Rejected',           icon: AlertCircle,   cls: 'bg-red-100 text-red-700' },
  converted_to_invoice:    { label: 'Invoiced',           icon: FileText,      cls: 'bg-teal-100 text-teal-800' },
  converted_to_work_order: { label: 'Work Order',         icon: CheckCircle,   cls: 'bg-purple-100 text-purple-800' },
  pending_adjustment:      { label: 'Pending Adjustment', icon: AlertCircle,   cls: 'bg-amber-100 text-amber-800' },
};

export default function Proposals() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, proposal: null });
  const [showFromEstimate, setShowFromEstimate] = useState(false);
  const [estimateSearch, setEstimateSearch] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [props, ests] = await Promise.all([
      base44.entities.Proposal.list('-created_date'),
      base44.entities.Estimate.list('-created_date', 100),
    ]);
    setProposals(props);
    setEstimates(ests);
    setLoading(false);
  };

  const nextProposalNumber = async () => {
    const list = await base44.entities.Proposal.list('-created_date');
    return list.length ? Math.max(...list.map(p => p.proposal_number || 0)) + 1 : 1001;
  };

  const handleNew = () => {
    setShowClientModal(true);
  };

  const handleClientModalSave = async (customer) => {
    setCreating(true);
    const num = await nextProposalNumber();
    const created = await base44.entities.Proposal.create({
      proposal_number: num,
      status: 'draft',
      creation_mode: 'new_proposal',
      client_id: customer.id,
      client_name: customer.display_name || `${customer.first_name} ${customer.last_name}`,
      client_email: customer.email,
      client_phone: customer.phone,
      client_address: customer.service_address,
      items: [],
      subtotal: 0,
      tax_rate: 0,
      tax_amount: 0,
      discount_value: 0,
      total_amount: 0,
    });
    setCreating(false);
    setShowClientModal(false);
    navigate(`/proposal-editor?id=${created.id}&new=1`);
  };

  const handleFromEstimate = async (estimate) => {
    setCreating(true);
    const num = await nextProposalNumber();
    const items = estimate.groups
      ? estimate.groups.flatMap(g => g.items || [])
      : (estimate.line_items || []);

    const created = await base44.entities.Proposal.create({
      proposal_number: num,
      source_estimate_id: estimate.id,
      creation_mode: 'from_estimate',
      status: 'draft',
      client_id: estimate.client_id,
      client_name: estimate.client_name,
      client_email: estimate.client_email,
      client_phone: estimate.client_phone,
      client_address: estimate.client_address,
      title: estimate.title,
      items: items.map(it => ({ ...it })),
      subtotal: estimate.subtotal,
      tax_rate: estimate.tax_rate || 0,
      tax_amount: estimate.tax_amount || 0,
      discount_value: estimate.discount_value || 0,
      total_amount: estimate.total || estimate.total_amount || 0,
      payment_terms: estimate.payment_terms,
      legal_terms: estimate.legal_terms,
      notes: estimate.notes,
    });
    setCreating(false);
    setShowFromEstimate(false);
    navigate(`/proposal-editor?id=${created.id}`);
  };

  const handleDelete = async () => {
    const p = deleteModal.proposal;
    if (!p) return;
    await base44.entities.Proposal.delete(p.id);
    setProposals(proposals.filter(x => x.id !== p.id));
    setDeleteModal({ open: false, proposal: null });
    toast.success(`Proposal #${p.proposal_number} deleted`);
  };

  const filtered = proposals.filter(p =>
    p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(p.proposal_number).includes(search) ||
    p.title?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEstimates = estimates.filter(e =>
    e.client_name?.toLowerCase().includes(estimateSearch.toLowerCase()) ||
    String(e.estimate_number).includes(estimateSearch) ||
    e.title?.toLowerCase().includes(estimateSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">

      {/* Client Form Modal */}
      {showClientModal && (
        <ClientFormModal
          onSave={handleClientModalSave}
          onClose={() => setShowClientModal(false)}
          mode="new"
        />
      )}

      {/* Delete Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-bold mb-2">Delete Proposal?</h2>
            <p className="text-sm text-slate-500 mb-4">Proposal #{deleteModal.proposal?.proposal_number} will be permanently deleted.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteModal({ open: false, proposal: null })}>Cancel</Button>
              <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* From Estimate Picker */}
      {showFromEstimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold">Create Proposal from Estimate</h2>
              <button onClick={() => setShowFromEstimate(false)} className="text-slate-400 hover:text-slate-600 text-xs font-medium">✕</button>
            </div>
            <div className="p-4">
              <Input placeholder="Search estimates…" value={estimateSearch}
                onChange={e => setEstimateSearch(e.target.value)} className="mb-3" />
              <div className="max-h-72 overflow-y-auto space-y-1">
                {filteredEstimates.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6">No estimates found</p>
                )}
                {filteredEstimates.map(e => (
                  <button key={e.id} onClick={() => handleFromEstimate(e)} disabled={creating}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary text-sm">#{e.estimate_number}</span>
                      <span className="font-semibold text-slate-800 text-sm truncate">{e.client_name}</span>
                      {e.title && <span className="text-slate-400 text-xs truncate">{e.title}</span>}
                      <span className="ml-auto text-xs font-semibold text-slate-600">${(e.total || 0).toLocaleString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title="Proposals"
        subtitle={`${proposals.length} total · Draft → Review → Sent → Approved → Invoice`}
        actionLabel={creating ? 'Creating…' : 'New Proposal'}
        onAction={handleNew}
      />

      <div className="p-6 space-y-4 flex-1">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search proposals…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button variant="outline" onClick={() => setShowFromEstimate(true)} className="gap-1.5 flex-shrink-0">
            <ChevronDown className="w-3.5 h-3.5" /> From Estimate
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ScrollText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium mb-4">No proposals yet</p>
            <div className="flex items-center gap-2 justify-center">
              <Button onClick={handleNew} disabled={creating} size="sm">
                <Plus className="w-4 h-4 mr-1" /> New Proposal
              </Button>
              <Button variant="outline" onClick={() => setShowFromEstimate(true)} size="sm">
                From Estimate
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => {
              const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
              const Icon = cfg.icon;
              return (
                <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/proposal-editor?id=${p.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-primary">#{p.proposal_number}</span>
                          <span className="font-semibold text-foreground">
                            {p.client_name || <span className="text-muted-foreground italic">No client</span>}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.cls}`}>
                            <Icon className="w-3 h-3" />{cfg.label}
                          </span>
                          {p.source_estimate_id && (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">From EST</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-muted-foreground">
                          {p.title && <span>{p.title}</span>}
                          <span className="font-semibold text-foreground">
                            ${(p.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          {p.invoice_number && (
                            <button onClick={e => { e.stopPropagation(); navigate(`/invoice-detail?id=${p.invoice_id}`); }}
                              className="text-xs text-emerald-700 font-semibold hover:underline">
                              INV #{p.invoice_number} →
                            </button>
                          )}
                          {p.work_order_number && (
                            <button onClick={e => { e.stopPropagation(); navigate(`/work-orders/${p.work_order_id}`); }}
                              className="text-xs text-purple-700 font-semibold hover:underline">
                              WO #{p.work_order_number} →
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" className="gap-1.5"
                          onClick={e => { e.stopPropagation(); navigate(`/proposal-editor?id=${p.id}`); }}>
                          <Pencil className="w-3.5 h-3.5" /> Open
                        </Button>
                        <Button variant="ghost" size="sm" disabled={p.status !== 'draft'} className="text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          onClick={e => { e.stopPropagation(); if (p.status === 'draft') setDeleteModal({ open: true, proposal: p }); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}