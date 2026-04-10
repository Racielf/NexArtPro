import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { FileText, Plus, Pencil, Search, X, Trash2 } from 'lucide-react';

export default function Estimates() {
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, estimate: null, canDelete: false });
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Estimate.list('-created_date');
    setEstimates(data);
    setLoading(false);
  };

  const getNextNumber = (list) => {
    if (!list.length) return 1;
    return Math.max(...list.map(e => e.estimate_number || 0)) + 1;
  };

  const handleNewEstimate = () => {
    setShowConfirm(true);
  };

  const handleConfirmCreate = async () => {
    setShowConfirm(false);
    setCreating(true);
    const list = await base44.entities.Estimate.list('-created_date');
    const created = await base44.entities.Estimate.create({
      estimate_number: getNextNumber(list),
      status: 'draft',
      client_name: '',
      line_items: [],
      tax_rate: 0,
      subtotal: 0,
      tax_amount: 0,
      total: 0,
      created_by: 'Admin',
      updated_by: 'Admin',
    });
    setCreating(false);
    navigate(`/estimate-editor?id=${created.id}&new=1`);
  };

  const filtered = estimates.filter(e =>
    e.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(e.estimate_number).includes(search)
  );

  const canDeleteEstimate = (est) => {
    return est.status === 'draft' || !est.sent_at;
  };

  const handleDeleteClick = (est) => {
    const can = canDeleteEstimate(est);
    setDeleteModal({ open: true, estimate: est, canDelete: can });
  };

  const handleConfirmDelete = async () => {
    const est = deleteModal.estimate;
    if (!est) return;
    await base44.entities.Estimate.delete(est.id);
    setEstimates(estimates.filter(e => e.id !== est.id));
    setSelectedIds(prev => { const s = new Set(prev); s.delete(est.id); return s; });
    setDeleteModal({ open: false, estimate: null, canDelete: false });
    toast.success(`Estimate #${est.estimate_number} deleted`);
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
      setSelectedIds(new Set(filtered.map(e => e.id)));
    }
  };

  const handleDeleteSelected = async () => {
    const idsArray = Array.from(selectedIds);
    await Promise.all(idsArray.map(id => base44.entities.Estimate.delete(id)));
    setEstimates(estimates.filter(e => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setDeleteModal({ open: false, estimate: null, canDelete: false });
    toast.success(`${idsArray.length} estimate(s) deleted`);
  };

  return (
    <div className="flex flex-col h-full">

      {/* Delete Estimate Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-bold text-slate-900 mb-2">Delete {deleteModal.estimate ? 'Estimate' : 'Estimates'}?</h2>
            {deleteModal.estimate ? (
              deleteModal.canDelete ? (
                <>
                  <p className="text-sm text-slate-500 mb-4">
                    Are you sure you want to delete Estimate #{deleteModal.estimate?.estimate_number}? This action cannot be undone.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setDeleteModal({ open: false, estimate: null, canDelete: false })}>
                      Cancel
                    </Button>
                    <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleConfirmDelete}>
                      Delete Estimate
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-500 mb-4">
                    This estimate cannot be deleted. You can archive it instead.
                  </p>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setDeleteModal({ open: false, estimate: null, canDelete: false })}>
                      Close
                    </Button>
                  </div>
                </>
              )
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-4">
                  {selectedIds.size} estimate(s) will be permanently deleted.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setDeleteModal({ open: false, estimate: null, canDelete: false })}>
                    Cancel
                  </Button>
                  <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDeleteSelected}>
                    Delete
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* New Estimate Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">New Estimate</h2>
              <button onClick={() => setShowConfirm(false)} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              You're about to create a new estimate. You can cancel at any time without saving.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirmCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Estimate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title="Estimates"
        subtitle={`${estimates.length} total`}
        actionLabel={creating ? 'Creating...' : 'New Estimate'}
        onAction={handleNewEstimate}
      />

      <div className="p-6 space-y-4 flex-1">
        <div className="flex items-center gap-3">
          {filtered.length > 0 && (
            <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-600">Select all</span>
            </label>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search estimates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <span className="text-sm font-semibold text-blue-900">{selectedIds.size} selected</span>
            <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white gap-1.5"
              onClick={() => setDeleteModal({ open: true, estimate: null, canDelete: true })}>
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </Button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium mb-1">No estimates yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first estimate to get started</p>
            <Button onClick={handleNewEstimate} disabled={creating}>
              <Plus className="w-4 h-4 mr-2" />
              {creating ? 'Creating...' : 'New Estimate'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(est => (
             <Card
               key={est.id}
               className="hover:shadow-md transition-shadow"
             >
               <CardContent className="p-4">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                   <label className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                     <input
                       type="checkbox"
                       checked={selectedIds.has(est.id)}
                       onChange={() => toggleSelect(est.id)}
                       className="w-4 h-4 cursor-pointer"
                     />
                   </label>
                   <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/estimate-editor?id=${est.id}`)}>
                     <div className="flex items-center gap-2 flex-wrap">
                       <span className="font-bold text-primary">#{est.estimate_number}</span>
                       <h3 className="font-semibold text-foreground">
                         {est.client_name || <span className="text-muted-foreground italic">No client</span>}
                       </h3>
                       <StatusBadge status={est.status} />
                     </div>
                     <div className="flex items-center gap-3 mt-1 flex-wrap">
                       {est.title && <span className="text-sm text-muted-foreground">{est.title}</span>}
                       <span className="text-sm font-semibold text-foreground">
                         ${(est.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                       </span>
                       {est.expiration_date && (
                         <span className="text-xs text-muted-foreground">Exp: {est.expiration_date}</span>
                       )}
                       {est.client_address && (
                         <span className="text-xs text-muted-foreground truncate max-w-[200px]">{est.client_address}</span>
                       )}
                     </div>
                   </div>
                   <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={e => { e.stopPropagation(); navigate(`/estimate-editor?id=${est.id}`); }}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}