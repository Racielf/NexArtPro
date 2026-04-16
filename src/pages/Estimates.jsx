import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/layout/PageShell';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { FileText, Plus, Pencil, Search, X, Trash2 } from 'lucide-react';
import { getNextDocumentNumber } from '@/lib/documentNumbering';

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

  // Removed: inline getNextNumber — now uses shared getNextDocumentNumber

  const handleNewEstimate = () => {
    setShowConfirm(true);
  };

  const handleConfirmCreate = async () => {
    setShowConfirm(false);
    setCreating(true);
    const nextNum = await getNextDocumentNumber('estimate');
    const created = await base44.entities.Estimate.create({
      estimate_number: nextNum,
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
        eyebrow="OPERATIONS"
        title="Estimates"
        subtitle={`${estimates.length} total estimates`}
        actionLabel={creating ? 'Creating...' : 'New Estimate'}
        onAction={handleNewEstimate}
        disabled={creating}
      />

      <PageShell>
        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client name or estimate #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            />
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <span className="text-sm font-semibold text-red-700">{selectedIds.size} selected</span>
              <Button size="sm" variant="destructive" className="gap-1.5 h-7 text-xs"
                onClick={() => setDeleteModal({ open: true, estimate: null, canDelete: true })}>
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            </div>
          )}
        </div>

        {/* ── List ── */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="px-4 py-4 animate-pulse flex items-center gap-4">
                <div className="w-4 h-4 bg-slate-100 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-100 rounded w-1/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-20 text-center">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm mb-1">No estimates found</p>
            <p className="text-xs text-slate-400 mb-4">Create your first estimate to get started</p>
            <Button onClick={handleNewEstimate} disabled={creating} size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />{creating ? 'Creating...' : 'New Estimate'}
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid items-center px-4 py-3 border-b border-slate-100 bg-slate-50/80 gap-4"
              style={{ gridTemplateColumns: '20px 1fr 140px 100px 80px' }}>
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
              />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Client / Estimate</span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Total</span>
              <div />
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {filtered.map(est => {
                const isSelected = selectedIds.has(est.id);
                return (
                  <div
                    key={est.id}
                    className="grid items-center px-4 py-3.5 gap-4 transition-colors duration-100 group cursor-pointer"
                    style={{
                      gridTemplateColumns: '20px 1fr 140px 100px 80px',
                      background: isSelected ? '#eff6ff' : undefined,
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ''; }}
                    onClick={() => navigate(`/estimate-editor?id=${est.id}`)}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(est.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
                    />

                    {/* Client + number */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 tabular-nums">#{est.estimate_number}</span>
                        <span className="font-semibold text-slate-800 text-[13px] truncate">
                          {est.client_name || <span className="italic text-slate-400 font-normal">No client</span>}
                        </span>
                      </div>
                      {est.title && (
                        <p className="text-[12px] text-slate-400 truncate mt-0.5">{est.title}</p>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <StatusBadge status={est.status} />
                    </div>

                    {/* Total */}
                    <div className="text-right">
                      <span className="text-[13px] font-bold text-slate-800 tabular-nums">
                        ${(est.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      {est.expiration_date && (
                        <p className="text-[11px] text-slate-400 mt-0.5">Exp {est.expiration_date}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/estimate-editor?id=${est.id}`)}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-colors"
                        title="Open"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(est)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[11px] text-slate-400">{filtered.length} estimate{filtered.length !== 1 ? 's' : ''} shown</p>
            </div>
          </div>
        )}
      </PageShell>
    </div>
  );
}