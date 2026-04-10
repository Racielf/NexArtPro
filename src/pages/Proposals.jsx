import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import { FileText, Plus, Search, Pencil, Trash2, CheckCircle, Send, Clock } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  draft:    { label: 'Draft',    icon: Clock,        cls: 'bg-slate-100 text-slate-600' },
  sent:     { label: 'Bid Sent', icon: Send,         cls: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Invoice',  icon: CheckCircle,  cls: 'bg-green-100 text-green-800' },
};

export default function Proposals() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, proposal: null });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Proposal.list('-created_date');
    setProposals(data);
    setLoading(false);
  };

  const handleNew = async () => {
    setCreating(true);
    const list = await base44.entities.Proposal.list('-created_date');
    const nextNum = list.length ? Math.max(...list.map(p => p.proposal_number || 0)) + 1 : 1001;
    const created = await base44.entities.Proposal.create({
      proposal_number: nextNum,
      status: 'draft',
      client_name: '',
      items: [],
      subtotal: 0,
      tax_rate: 0,
      tax_amount: 0,
      discount_value: 0,
      total_amount: 0,
    });
    setCreating(false);
    navigate(`/proposal-editor?id=${created.id}&new=1`);
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

  return (
    <div className="flex flex-col h-full">

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

      <PageHeader
        title="Proposals"
        subtitle={`${proposals.length} total — Draft → Bid → Invoice`}
        actionLabel={creating ? 'Creating…' : 'New Proposal'}
        onAction={handleNew}
      />

      <div className="p-6 space-y-4 flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search proposals…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium mb-4">No proposals yet</p>
            <Button onClick={handleNew} disabled={creating}>
              <Plus className="w-4 h-4 mr-2" /> New Proposal
            </Button>
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
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-muted-foreground">
                          {p.title && <span>{p.title}</span>}
                          <span className="font-semibold text-foreground">${(p.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          {p.invoice_number && <span className="text-xs text-green-700 font-semibold">{p.invoice_number}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5"
                          onClick={e => { e.stopPropagation(); navigate(`/proposal-editor?id=${p.id}`); }}>
                          <Pencil className="w-3.5 h-3.5" /> Open
                        </Button>
                        {p.status === 'draft' && (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={e => { e.stopPropagation(); setDeleteModal({ open: true, proposal: p }); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
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