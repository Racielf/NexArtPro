/**
 * PriceBookImport — CSV bulk import for the Price Book.
 * Merge logic: if service_name matches existing → updates book_price.
 * If not found → creates new entry.
 * INTERNAL ONLY — never affects client-facing documents.
 */
import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react';
import { parsePriceBookCSV } from '@/utils/csvParser';

export default function PriceBookImport({ onImport }) {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null); // { added, updated, skipped, errors }
  const [error, setError]       = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const rows = await parsePriceBookCSV(file);
      const summary = onImport(rows); // PriceBookSection handles merge
      setResult(summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = null;
    }
  };

  const dismiss = () => { setResult(null); setError(null); };

  return (
    <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Importar CSV de Precios</p>
          <p className="text-xs text-slate-400 mt-0.5">Columnas requeridas: <code className="bg-slate-100 px-1 rounded">service_name</code>, <code className="bg-slate-100 px-1 rounded">book_price</code> · Opcionales: <code className="bg-slate-100 px-1 rounded">category</code>, <code className="bg-slate-100 px-1 rounded">uom</code>, <code className="bg-slate-100 px-1 rounded">notes</code></p>
        </div>
        <label className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border cursor-pointer transition select-none ${
          loading
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-400'
        }`}>
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {loading ? 'Procesando…' : 'Seleccionar CSV'}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            disabled={loading}
            className="hidden"
          />
        </label>
      </div>

      {/* Result */}
      {result && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-emerald-800 leading-relaxed">
            <span className="font-semibold">Importación exitosa.</span>{' '}
            {result.updated > 0 && <span>{result.updated} precio(s) actualizado(s). </span>}
            {result.added > 0 && <span>{result.added} servicio(s) nuevo(s) agregado(s). </span>}
            {result.skipped > 0 && <span className="text-emerald-600">{result.skipped} fila(s) omitida(s) (sin nombre).</span>}
          </div>
          <button onClick={dismiss} className="text-emerald-400 hover:text-emerald-600"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="flex-1 text-xs text-red-700">{error}</p>
          <button onClick={dismiss} className="text-red-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Template hint */}
      <div className="flex items-center gap-1.5 mt-3">
        <FileText className="w-3 h-3 text-slate-300" />
        <span className="text-[10px] text-slate-400">Formato: <code>service_name,book_price,category,uom,notes</code></span>
      </div>
    </div>
  );
}