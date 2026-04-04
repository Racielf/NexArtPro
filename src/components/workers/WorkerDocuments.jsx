import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload, Trash2, FileText, ExternalLink, Plus, X } from 'lucide-react';
import { format } from 'date-fns';

const DOC_TYPES = {
  id: 'ID / Passport',
  license: 'Driver\'s License',
  insurance: 'Insurance Certificate',
  contract: 'Employment Contract',
  certification: 'Certification',
  w9: 'W-9 Form',
  other: 'Other',
};
const DOC_COLORS = {
  id: 'bg-blue-100 text-blue-700',
  license: 'bg-green-100 text-green-700',
  insurance: 'bg-amber-100 text-amber-700',
  contract: 'bg-purple-100 text-purple-700',
  certification: 'bg-cyan-100 text-cyan-700',
  w9: 'bg-orange-100 text-orange-700',
  other: 'bg-slate-100 text-slate-600',
};

const EMPTY_FORM = { doc_type: 'other', name: '', expiry_date: '', notes: '' };

export default function WorkerDocuments({ worker }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => { loadDocs(); }, [worker.id]);

  const loadDocs = async () => {
    setLoading(true);
    const data = await base44.entities.WorkerDocument.filter({ worker_id: worker.id }, '-created_date');
    setDocs(data);
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) { toast.error('Please select a file'); return; }
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
    await base44.entities.WorkerDocument.create({
      worker_id: worker.id,
      worker_name: worker.full_name,
      doc_type: form.doc_type,
      name: form.name || selectedFile.name,
      file_url,
      file_name: selectedFile.name,
      expiry_date: form.expiry_date || null,
      notes: form.notes,
    });
    toast.success('Document uploaded');
    setUploading(false);
    setSelectedFile(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
    loadDocs();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    await base44.entities.WorkerDocument.delete(id);
    toast.success('Document removed');
    loadDocs();
  };

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    const days = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    return days < 30 && days > 0;
  };
  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900">Employment Documents</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
          {showForm ? <><X className="w-3.5 h-3.5 mr-1" />Cancel</> : <><Plus className="w-3.5 h-3.5 mr-1" />Add Document</>}
        </Button>
      </div>

      {showForm && (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Document Type</label>
              <select value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))}
                className="w-full h-9 text-sm border border-slate-200 rounded-md px-2 focus:outline-none focus:border-primary bg-white">
                {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Label (optional)</label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Insurance 2025" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Expiry Date</label>
              <Input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">File *</label>
              <input type="file" onChange={handleFileChange}
                className="w-full text-xs text-slate-600 border border-slate-200 rounded-md px-2 py-2 bg-white cursor-pointer file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary file:text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Notes</label>
            <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." />
          </div>
          <Button size="sm" onClick={handleUpload} disabled={uploading || !selectedFile} className="w-full">
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 py-4">Loading documents...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => {
            const expired = isExpired(doc.expiry_date);
            const expiring = isExpiringSoon(doc.expiry_date);
            return (
              <div key={doc.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3">
                <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800 truncate">{doc.name || doc.file_name}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${DOC_COLORS[doc.doc_type] || DOC_COLORS.other}`}>
                      {DOC_TYPES[doc.doc_type] || doc.doc_type}
                    </span>
                    {expired && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">EXPIRED</span>}
                    {expiring && !expired && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Expiring Soon</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {doc.expiry_date && (
                      <span className={`text-xs ${expired ? 'text-red-500' : expiring ? 'text-amber-600' : 'text-slate-400'}`}>
                        Expires: {format(new Date(doc.expiry_date), 'MMM d, yyyy')}
                      </span>
                    )}
                    {doc.notes && <span className="text-xs text-slate-400 truncate">{doc.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-slate-100 transition-colors text-primary" title="Open file">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => handleDelete(doc.id)}
                    className="p-1.5 rounded hover:bg-red-50 transition-colors text-red-400" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}