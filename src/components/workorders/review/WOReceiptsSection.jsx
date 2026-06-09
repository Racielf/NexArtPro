import React, { useState, useEffect, useRef } from 'react';
import { Receipt, Upload, Trash2, ExternalLink, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { nexartClient } from '@/api/nexartClient';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function WOReceiptsSection({ workOrder, woId }) {
  const [receipts, setReceipts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vendor: '', amount: '', receipt_date: '', notes: '', expense_id: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef();

  useEffect(() => { load(); }, [woId]);

  const load = async () => {
    const [r, e] = await Promise.all([
      nexartClient.entities.WorkOrderReceipt.filter({ work_order_id: woId }, '-created_date'),
      nexartClient.entities.WorkOrderExpense.filter({ work_order_id: woId }),
    ]);
    setReceipts(r);
    setExpenses(e);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) { toast.error('Select a file first'); return; }
    setUploading(true);
    const { file_url } = await nexartClient.integrations.Core.UploadFile({ file: selectedFile });
    const user = await nexartClient.auth.me();
    await nexartClient.entities.WorkOrderReceipt.create({
      work_order_id: woId,
      expense_id: form.expense_id || null,
      uploaded_by: user?.full_name || user?.email || 'Admin',
      file_url,
      file_name: selectedFile.name,
      vendor: form.vendor,
      amount: parseFloat(form.amount) || 0,
      receipt_date: form.receipt_date,
      notes: form.notes,
    });
    toast.success('Receipt uploaded');
    setUploading(false);
    setShowForm(false);
    setSelectedFile(null);
    setForm({ vendor: '', amount: '', receipt_date: '', notes: '', expense_id: '' });
    load();
  };

  const handleDelete = async (id) => {
    await nexartClient.entities.WorkOrderReceipt.delete(id);
    toast.success('Receipt removed');
    load();
  };

  const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-primary" />
          Receipts &amp; Tickets
          {receipts.length > 0 && (
            <span className="ml-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{receipts.length}</span>
          )}
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Upload className="w-3.5 h-3.5" />Upload Receipt
        </Button>
      </div>

      {/* UPLOAD FORM */}
      {showForm && (
        <div className="border border-primary/30 rounded-lg p-4 mb-4 bg-primary/5">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">File (image or PDF)</label>
              <div
                onClick={() => fileRef.current.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors">
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      className="text-slate-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">
                    <Upload className="w-5 h-5 mx-auto mb-1" />
                    Click to select file
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Vendor</label>
              <Input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} className="h-8 text-sm" placeholder="Home Depot..." />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Amount ($)</label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="h-8 text-sm" placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Receipt Date</label>
              <Input type="date" value={form.receipt_date} onChange={e => setForm(f => ({ ...f, receipt_date: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Link to Expense</label>
              <select value={form.expense_id} onChange={e => setForm(f => ({ ...f, expense_id: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-primary h-8">
                <option value="">— None —</option>
                {expenses.map(exp => (
                  <option key={exp.id} value={exp.id}>
                    {exp.expense_type.replace('_', ' ')} · ${exp.amount?.toFixed(2)} {exp.vendor ? `· ${exp.vendor}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Notes</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-8 text-sm" placeholder="Notes about this receipt..." />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleUpload} disabled={uploading} className="bg-primary hover:bg-primary/90 text-white gap-1">
              <Upload className="w-3.5 h-3.5" />{uploading ? 'Uploading...' : 'Upload'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {receipts.length === 0 && !showForm && (
        <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
          No receipts uploaded yet.
        </div>
      )}

      {/* RECEIPTS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {receipts.map(r => (
          <div key={r.id} className="border border-slate-200 rounded-lg overflow-hidden group hover:border-slate-300 transition-colors">
            {isImage(r.file_url) ? (
              <a href={r.file_url} target="_blank" rel="noreferrer">
                <img src={r.file_url} alt={r.file_name || 'receipt'} className="w-full h-32 object-cover bg-slate-50" />
              </a>
            ) : (
              <a href={r.file_url} target="_blank" rel="noreferrer"
                className="w-full h-32 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors">
                <FileText className="w-8 h-8 text-slate-300 mb-1" />
                <span className="text-xs text-slate-500 text-center px-2 truncate w-full text-center">
                  {r.file_name || 'Document'}
                </span>
              </a>
            )}
            <div className="p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {r.vendor && <p className="text-xs font-semibold text-slate-700 truncate">{r.vendor}</p>}
                  {r.amount > 0 && <p className="text-xs text-green-700 font-bold">${r.amount.toFixed(2)}</p>}
                  {r.receipt_date && (
                    <p className="text-[10px] text-slate-400">{format(new Date(r.receipt_date + 'T12:00:00'), 'MMM d, yyyy')}</p>
                  )}
                </div>
                <div className="flex gap-1 ml-1">
                  <a href={r.file_url} target="_blank" rel="noreferrer"
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-primary">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button onClick={() => handleDelete(r.id)}
                    className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {r.notes && <p className="text-[10px] text-slate-400 mt-1 italic">{r.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}