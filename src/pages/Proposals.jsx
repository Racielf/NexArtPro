import React, { useState, useEffect } from 'react';
import { archiveWithSnapshot, archiveManyWithSnapshot, filterActiveRecords } from '@/lib/softDelete';
import { logAuditEvent } from '@/lib/auditLog';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/layout/PageShell';
import StatusBadge from '@/components/shared/StatusBadge';
import NewProposalCustomerModal from '@/components/proposals/NewProposalCustomerModal';
import DeleteReasonModal from '@/components/shared/DeleteReasonModal';
import { ScrollText, Plus, Search, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { getNextDocumentNumber } from '@/lib/documentNumbering';
import { computeProposalReminders } from '@/lib/proposalReminders';
import ProposalReminderBar from '@/components/proposals/ProposalReminderBar';

export default function Proposals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const actor = user?.email || user?.id || 'unknown';
  const [proposals, setProposals] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, proposal: null });
  const [showFromEstimate, setShowFromEstimate] = useState(false);
  const [estimateSearch, setEstimateSearch] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [archiveModal, setArchiveModal] = useState({ open: false, proposal: null, reason: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [props, ests] = await Promise.all([
      base44.entities.Proposal.list('-created_date'),
      base44.entities.Estimate.list('-created_date', 100),
    ]);
    setProposals(filterActiveRecords(props));
    setEstimates(ests);
    setLoading(false);
  };

  // Removed: inline nextProposalNumber — now uses shared getNextDocumentNumber

  const handleNew = () => {
    setShowClientModal(true);
  };

  const handleClientSelected = async (client) => {
    setCreating(true);
    const num = await getNextDocumentNumber('proposal');
    const created = await base44.entities.Proposal.create({
      proposal_number: num,
      status: 'draft',
      creation_mode: 'new_proposal',
      client_id: client.id || '',
      client_name: client.full_name || '',
      client_email: client.email || '',
      client_phone: client.phone || '',
      client_address: [client.address, client.city, client.state].filter(Boolean).join(', '),
      document_language: 'en',
      items: [],
      subtotal: 0,
      tax_rate: 0,
      tax_amount: 0,
      discount_value: 0,
      total_amount: 0,
      total_cost: 0,
      gross_margin: 0,
      gross_margin_pct: 0,
      notes: '',
      internal_notes: '',
      payment_terms: '',
      legal_terms: '',
    });
    setCreating(false);
    navigate(`/proposal-editor?id=${created.id}&new=1`);
  };

  const handleFromEstimate = async (estimate) => {
    setCreating(true);
    const num = await getNextDocumentNumber('proposal');
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
    setDeleteModal({ open: false, proposal: null });
    setArchiveModal({ open: true, proposal: p, reason: '' });
  };

  const handleConfirmArchive = async (reason) => {
    const p = archiveModal.proposal;
    if (!p) return;
    setArchiveModal({ open: false, proposal: null, reason: '' });
    await archiveWithSnapshot(base44.entities.Proposal, 'Proposal', p.id, actor, reason);
    setProposals(proposals.filter(x => x.id !== p.id));
    setSelectedIds(prev => { const s = new Set(prev); s.delete(p.id); return s; });
    toast.success(`Proposal #${p.proposal_number} deleted`);
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const handleDeleteSelected = async (reason) => {
    const idsArray = Array.from(selectedIds);
    await archiveManyWithSnapshot(base44.entities.Proposal, 'Proposal', idsArray, actor, reason);
    setProposals(proposals.filter(p => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setDeleteModal({ open: false, proposal: null });
    toast.success(`${idsArray.length} proposal(s) deleted`);
  };

  const filtered = proposals.filter(p =>
    p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(p.proposal_number).includes(search) ||
    p.title?.toLowerCase().includes(search.toLowerCase())
  );

  const reminders = computeProposalReminders(proposals);

  const filteredEstimates = estimates.filter(e =>
    e.client_name?.toLowerCase().includes(estimateSearch.toLowerCase()) ||
    String(e.estimate_number).includes(estimateSearch) ||
    e.title?.toLowerCase().includes(estimateSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">

      {/* Customer Selection Modal */}
      <NewProposalCustomerModal
        open={showClientModal}
        onOpenChange={setShowClientModal}
        onCustomerSelected={handleClientSelected}
      />

      {/* Delete Reason Modal */}
      <DeleteReasonModal
        open={archiveModal.open}
        onCancel={() => setArchiveModal({ open: false, proposal: null, reason: '' })}
        onConfirm={handleConfirmArchive}
        entityLabel={archiveModal.proposal ? `Proposal #${archiveModal.proposal.proposal_number}` : 'Proposal'}
      />

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-bold mb-2">Delete {deleteModal.proposal ? 'Proposal' : 'Proposals'}?</h2>
            <p className="text-sm text-slate-500 mb-4">
              {deleteModal.proposal 
                ? `Proposal #${deleteModal.proposal.proposal_number} will be deleted.`
                : `${selectedIds.size} proposal(s) will be deleted.`}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteModal({ open: false, proposal: null })}>Cancel</Button>
              <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" 
                onClick={deleteModal.proposal ? handleDelete : () => { setDeleteModal({ open: false, proposal: null }); setArchiveModal({ open: true, proposal: null, reason: '' }); handleDeleteSelected(''); }}>
                Delete
              </Button>
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
        disabled={creating}
      />

      <PageShell>
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          {filtered.length > 0 && (
            <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors">
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-medium text-muted-foreground">Select all</span>
            </label>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search proposals…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button variant="outline" onClick={() => setShowFromEstimate(true)} className="gap-1.5 flex-shrink-0">
            <ChevronDown className="w-3.5 h-3.5" /> From Estimate
          </Button>
        </div>

        {/* Reminder Bar */}
        <ProposalReminderBar reminders={reminders} linkTo="/sales-pipeline" />

        {/* Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-primary">{selectedIds.size} selected</span>
            <Button size="sm" variant="destructive" className="gap-1.5"
              onClick={() => setDeleteModal({ open: true, proposal: null })}>
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </Button>
          </div>
        )}

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

              return (
                <Card key={p.id} className="bg-white hover:shadow-sm hover:border-border/70 transition-all border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </label>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/proposal-editor?id=${p.id}`)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-primary text-sm">#{p.proposal_number}</span>
                          <span className="font-semibold text-foreground text-sm">
                            {p.client_name || <span className="text-muted-foreground italic font-normal">No client</span>}
                          </span>
                          <StatusBadge status={p.status} />
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageShell>
    </div>
  );
}