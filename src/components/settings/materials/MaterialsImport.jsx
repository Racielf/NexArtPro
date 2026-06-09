import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { nexartClient } from '@/api/nexartClient';

/**
 * CSV import for Materials.
 * Expected columns: material_name, category, unit, unit_cost, supplier, sku_or_ref, notes
 */
function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  return lines.slice(1).map(line => {
    const vals = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { vals.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    vals.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

function mapRow(row) {
  return {
    material_name: row.material_name || row.name || '',
    category: row.category || '',
    unit: row.unit || 'ea',
    unit_cost: parseFloat(row.unit_cost || row.cost || '0') || 0,
    supplier: row.supplier || row.vendor || '',
    sku_or_ref: row.sku_or_ref || row.sku || row.ref || '',
    notes: row.notes || '',
    is_active: true,
  };
}

export default function MaterialsImport({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result).map(mapRow).filter(r => r.material_name);
      setPreview(rows);
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!preview.length) return;
    setImporting(true);
    let success = 0, failed = 0;
    // Bulk create in batches of 25
    for (let i = 0; i < preview.length; i += 25) {
      const batch = preview.slice(i, i + 25);
      try {
        await nexartClient.entities.Material.bulkCreate(batch);
        success += batch.length;
      } catch {
        failed += batch.length;
      }
    }
    setResult({ success, failed });
    setImporting(false);
    if (onImported) onImported();
  };

  const reset = () => { setFile(null); setPreview([]); setResult(null); };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="w-4 h-4" /> Import Materials from CSV</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Import complete</p>
            <p className="text-xs text-slate-500">{result.success} imported{result.failed > 0 ? `, ${result.failed} failed` : ''}</p>
            <Button onClick={() => { reset(); onClose(); }}>Done</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3 pt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-medium text-slate-600 mb-2">CSV format (first row = headers):</p>
                <code className="text-[10px] text-slate-500 block leading-relaxed">
                  material_name, category, unit, unit_cost, supplier, sku_or_ref, notes
                </code>
              </div>

              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-lg py-6 cursor-pointer hover:border-primary/40 transition-colors">
                <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-500">{file ? file.name : 'Click to select CSV file'}</span>
              </label>

              {preview.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-auto max-h-52">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-left">
                        <th className="px-3 py-2 font-semibold text-slate-500">Name</th>
                        <th className="px-3 py-2 font-semibold text-slate-500">Category</th>
                        <th className="px-3 py-2 font-semibold text-slate-500">Unit</th>
                        <th className="px-3 py-2 font-semibold text-slate-500 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 10).map((r, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-1.5 font-medium text-slate-700">{r.material_name}</td>
                          <td className="px-3 py-1.5 text-slate-500">{r.category}</td>
                          <td className="px-3 py-1.5 text-slate-500">{r.unit}</td>
                          <td className="px-3 py-1.5 text-slate-500 text-right">${r.unit_cost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 10 && (
                    <p className="text-center text-[10px] text-slate-400 py-2">+{preview.length - 10} more rows</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3">
              <Button variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              <Button className="flex-1" onClick={handleImport} disabled={!preview.length || importing}>
                {importing ? 'Importing...' : `Import ${preview.length} materials`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}