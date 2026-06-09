import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Search, FileText, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { computeInvoiceDerivedFields, isInvoiceOverdue } from "@/lib/invoiceHelpers";
import { formatCurrency } from "@/utils/invoiceCalc";
import { toast } from "sonner";

const STATUSES = ["all","draft","sent","viewed","partial","paid","overdue","void"];

function StatusBadge({ status }) {
  const map = {
    draft:   "bg-slate-100 text-slate-600",
    sent:    "bg-blue-100 text-blue-700",
    viewed:  "bg-cyan-100 text-cyan-700",
    partial: "bg-amber-100 text-amber-700",
    paid:    "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
    void:    "bg-slate-100 text-slate-400 line-through",
  };
  const label = status === "partial" ? "Partial" : status ? status.charAt(0).toUpperCase() + status.slice(1) : "Draft";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[status] || map.draft}`}>
      {label}
    </span>
  );
}

export default function Invoices() {
  const [invoices, setInvoices]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [searchParams]              = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.Invoice.list("-created_date", 200).then(d => {
      setInvoices(d || []);
      setLoading(false);
    });
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const derived = computeInvoiceDerivedFields(deleteTarget);
    if (
      (deleteTarget.payments && deleteTarget.payments.length > 0) ||
      deleteTarget.status !== "draft" ||
      derived.payment_status === "paid" ||
      derived.payment_status === "partial" ||
      derived.amount_paid > 0
    ) {
      toast.error("Cannot delete invoice with active payments or non-draft status.");
      setDeleteTarget(null);
      return;
    }

    setDeleting(true);
    try {
      await base44.entities.Invoice.delete(deleteTarget.id);
      setInvoices(prev => prev.filter(i => i.id !== deleteTarget.id));
      toast.success(`Invoice ${deleteTarget.invoice_number || ''} deleted`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.message || "Failed to delete invoice");
    } finally {
      setDeleting(false);
    }
  };

  const enriched = invoices.map(inv => {
    const derived = computeInvoiceDerivedFields(inv);
    const overdue  = isInvoiceOverdue({ ...inv, ...derived });
    const status   = overdue && derived.payment_status !== "paid" ? "overdue"
                   : derived.payment_status === "paid"  ? "paid"
                   : derived.payment_status === "partial" ? "partial"
                   : inv.status || "draft";
    return { ...inv, ...derived, _status: status };
  });

  const filtered = enriched.filter(inv => {
    if (statusFilter !== "all" && inv._status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (inv.invoice_number || "").toString().toLowerCase().includes(q) ||
      (inv.client_name    || "").toLowerCase().includes(q) ||
      (inv.client_email   || "").toLowerCase().includes(q)
    );
  });

  const totalOutstanding = enriched
    .filter(i => ["sent","viewed","partial","overdue"].includes(i._status))
    .reduce((s, i) => s + (i.balance_due || 0), 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {invoices.length} total · <span className="font-semibold text-red-600">{formatCurrency(totalOutstanding)}</span> outstanding
          </p>
        </div>
        <Button onClick={() => navigate("/invoice-create")} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2">
          <Plus className="w-4 h-4" />New Invoice
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
              statusFilter === s
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            {s === "all" ? "All" : s.replace(/_/g," ").replace(/\b\w/g, l => l.toUpperCase())}
            <span className="ml-1.5 opacity-60 text-[10px]">
              {s === "all" ? enriched.length : enriched.filter(i => i._status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by invoice # or client..."
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-200 animate-pulse h-14" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-700 font-semibold mb-1">No invoices found</h3>
          <p className="text-slate-400 text-sm mb-4">
            {statusFilter !== "all" ? "Try a different filter" : "Create your first invoice to get started"}
          </p>
          {statusFilter === "all" && (
            <Button onClick={() => navigate("/invoice-create")} className="bg-blue-600 text-white gap-2">
              <Plus className="w-4 h-4" />New Invoice
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Invoice</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden sm:table-cell">Client</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden md:table-cell">Due</th>
                <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Total</th>
                <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Balance</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Status</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(inv => (
                <tr
                  key={inv.id}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  onClick={() => navigate(`/invoice-detail?id=${inv.id}`)}
                >
                  <td className="px-6 py-3">
                    <span className="font-semibold text-sm text-blue-600">
                      {inv.invoice_number || `#${(inv.id || "").slice(-6)}`}
                    </span>
                    {inv.created_date && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {format(new Date(inv.created_date), "MMM d, yyyy")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 hidden sm:table-cell">
                    <div className="font-medium">{inv.client_name || "—"}</div>
                    {inv.client_email && <div className="text-[11px] text-slate-400">{inv.client_email}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell" style={{ color: inv._status === "overdue" ? "#EF4444" : "#94A3B8" }}>
                    {inv.due_date ? format(new Date(inv.due_date), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">
                    {formatCurrency(inv.total)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-right" style={{ color: (inv.balance_due || 0) > 0 ? "#EF4444" : "#10B981" }}>
                    {formatCurrency(inv.balance_due)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={inv._status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/invoice-detail?id=${inv.id}`); }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                        title="View"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget(inv); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-4 h-4" />
              Delete Invoice
            </DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Are you sure you want to delete invoice <strong>{deleteTarget.invoice_number || deleteTarget.id?.slice(-6)}</strong>
                {deleteTarget.client_name ? ` for ${deleteTarget.client_name}` : ""}?
              </p>
              {deleteTarget._status !== "draft" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  ⚠️ This invoice has status <strong>{deleteTarget._status}</strong>. Deleting it cannot be undone.
                </div>
              )}
              {(deleteTarget.amount_paid || 0) > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                  🚨 This invoice has <strong>{formatCurrency(deleteTarget.amount_paid)}</strong> in recorded payments. Deleting will remove all payment records.
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                >
                  {deleting ? "Deleting…" : "Delete Invoice"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}