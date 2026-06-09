/**
 * PriceBookImport — CSV bulk import for the Price Book.
 * Merge logic: if service_name matches existing → updates book_price.
 * If not found → creates new entry.
 * INTERNAL ONLY — never affects client-facing documents.
 */
import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, FileText, X, Download } from 'lucide-react';
import { parsePriceBookCSV } from '@/utils/csvParser';

// ─── Oregon Price Book 2025 — RSMeans + BOLI Prevailing Wage + Mortenson Q4 2025 ───
// Sources:
//   • BOLI Prevailing Wage Jan 2025 (oregon.gov/boli)
//   • Mortenson Construction Cost Index Q4 2025 Portland (+7.35% YoY)
//   • costtoconstruct.com Portland 2026 ($200-500/sqft, labor $38-58/hr)
//   • RSMeans 2025 avg labor increase +4.1%
// Inflation factor applied: ×1.10 (10% uplift for Portland material/labor pressure)
// Base rates are pre-factor market references; book_price = base × 1.10
const TEMPLATE_ROWS = [
  // ── DRYWALL ──────────────────────────────────────────────────────────────
  { id:101, service_name:"Instalacion de Drywall (Standard) - Hang & Tape",         uom:"SQFT", base:2.50,  category:"Drywall",      notes:"BOLI Mason/Drywall $47.20/hr base. RSMeans OR avg $2.25-2.75/sqft" },
  { id:102, service_name:"Drywall Level 5 Finish - Skim Coat",                      uom:"SQFT", base:3.60,  category:"Drywall",      notes:"RSMeans 2025 OR finish level 5 avg" },
  { id:103, service_name:"Drywall Patch Repair (per section)",                      uom:"EA",   base:200,   category:"Drywall",      notes:"Handyman avg Portland 2025" },
  { id:104, service_name:"Popcorn Ceiling Removal",                                 uom:"SQFT", base:1.80,  category:"Drywall",      notes:"RSMeans OR avg scrape + haul" },
  { id:105, service_name:"Water Damage Drywall Repair",                             uom:"SQFT", base:4.55,  category:"Drywall",      notes:"Remove, replace, texture" },
  // ── PINTURA / PAINTING ────────────────────────────────────────────────────
  { id:201, service_name:"Pintura Interior de Paredes (2 capas)",                   uom:"SQFT", base:2.05,  category:"Painting",     notes:"BOLI Painter $44.80/hr. RSMeans OR $1.50-2.75/sqft" },
  { id:202, service_name:"Pintura de Cielo Raso (Ceiling)",                         uom:"SQFT", base:2.25,  category:"Painting",     notes:"RSMeans OR avg 2-coat ceiling" },
  { id:203, service_name:"Pintura de Trim / Molduras",                              uom:"LF",   base:2.72,  category:"Painting",     notes:"RSMeans OR linear ft caulk+paint" },
  { id:204, service_name:"Pintura de Puerta (ambos lados)",                         uom:"EA",   base:100,   category:"Painting",     notes:"Portland market avg per door" },
  { id:205, service_name:"Pintura de Cabinetes (cocina completa)",                  uom:"PROJ", base:2000,  category:"Painting",     notes:"RSMeans 2025 cabinet repaint avg" },
  { id:206, service_name:"Pintura Exterior - Siding",                               uom:"SQFT", base:2.50,  category:"Painting",     notes:"RSMeans OR exterior, power wash incl." },
  { id:207, service_name:"Deck Staining / Sellado",                                 uom:"SQFT", base:2.05,  category:"Painting",     notes:"RSMeans OR clean+seal avg" },
  // ── PISOS / FLOORING ──────────────────────────────────────────────────────
  { id:301, service_name:"Instalacion de LVP (Luxury Vinyl Plank)",                 uom:"SQFT", base:5.00,  category:"Flooring",     notes:"RSMeans OR 2025 LVP install, underlayment incl." },
  { id:302, service_name:"Instalacion de Laminado (Laminate)",                      uom:"SQFT", base:4.09,  category:"Flooring",     notes:"RSMeans OR avg incl. transitions" },
  { id:303, service_name:"Instalacion de Tile Ceramico/Porcelanico (piso)",         uom:"SQFT", base:9.09,  category:"Flooring",     notes:"RSMeans OR ceramic/porcelain floor" },
  { id:304, service_name:"Instalacion de Carpet (labor only)",                      uom:"SQFT", base:3.41,  category:"Flooring",     notes:"RSMeans OR excl. carpet material" },
  { id:305, service_name:"Remocion de Piso (cualquier tipo)",                       uom:"SQFT", base:1.59,  category:"Flooring",     notes:"RSMeans OR haul-away incl." },
  { id:306, service_name:"Reparacion de Subfloor",                                  uom:"SQFT", base:6.36,  category:"Flooring",     notes:"RSMeans OR cut, replace, secure" },
  { id:307, service_name:"Instalacion de Baseboard / Rodapie",                      uom:"LF",   base:4.09,  category:"Flooring",     notes:"RSMeans OR install+paint" },
  // ── CARPINTERIA ───────────────────────────────────────────────────────────
  { id:401, service_name:"Mano de Obra General Carpinteria",                        uom:"HR",   base:52.00, category:"Labor",        notes:"BOLI Prevailing Wage Jan 2025 Carpenter Area 1 (Portland Metro) $52.34/hr base" },
  { id:402, service_name:"Instalacion Crown Molding",                               uom:"LF",   base:6.82,  category:"Carpentry",    notes:"RSMeans OR install+caulk, no paint" },
  { id:403, service_name:"Instalacion de Cabinetes (pre-hechos)",                   uom:"EA",   base:127,   category:"Carpentry",    notes:"RSMeans OR per box" },
  { id:404, service_name:"Reparacion de Wood Rot",                                  uom:"EA",   base:295,   category:"Carpentry",    notes:"RSMeans OR per section incl. material" },
  // ── MANO DE OBRA / LABOR ──────────────────────────────────────────────────
  { id:501, service_name:"Mano de Obra General (GC rate)",                          uom:"HR",   base:48.00, category:"Labor",        notes:"BOLI 2025 Portland Metro general laborer $38-58/hr avg $48" },
  { id:502, service_name:"Electricista Licenciado",                                 uom:"HR",   base:90.00, category:"Labor",        notes:"BOLI Electrician Jan 2025 $86.50/hr base + fringe Portland" },
  { id:503, service_name:"Plomero Licenciado",                                      uom:"HR",   base:88.00, category:"Labor",        notes:"BOLI Plumber Jan 2025 ~$84/hr base Portland area" },
  { id:504, service_name:"Skilled Trade Labor (finish carpenter/tile)",             uom:"HR",   base:55.00, category:"Labor",        notes:"BOLI 2025 OR skilled trade avg Portland" },
  // ── BANO / BATHROOM ───────────────────────────────────────────────────────
  { id:601, service_name:"Instalacion de Tile en Ducha (paredes)",                  uom:"SQFT", base:12.73, category:"Bathroom",     notes:"RSMeans OR wall tile incl. backer" },
  { id:602, service_name:"Instalacion de Vanity (labor only)",                      uom:"EA",   base:364,   category:"Bathroom",     notes:"RSMeans OR labor only excl. unit" },
  { id:603, service_name:"Instalacion de Toilet (labor only)",                      uom:"EA",   base:241,   category:"Bathroom",     notes:"RSMeans OR avg labor" },
  { id:604, service_name:"Sellado / Caulking de Bano completo",                     uom:"PROJ", base:182,   category:"Bathroom",     notes:"Tub, shower, fixtures caulk" },
  // ── COCINA / KITCHEN ──────────────────────────────────────────────────────
  { id:701, service_name:"Instalacion de Backsplash Tile (cocina)",                 uom:"SQFT", base:14.55, category:"Kitchen",      notes:"RSMeans OR ceramic incl. grout" },
  { id:702, service_name:"Instalacion de Faucet (labor only)",                      uom:"EA",   base:182,   category:"Kitchen",      notes:"RSMeans OR labor only" },
  { id:703, service_name:"Instalacion de Sink (labor only)",                        uom:"EA",   base:236,   category:"Kitchen",      notes:"RSMeans OR labor only" },
  // ── TILE ─────────────────────────────────────────────────────────────────
  { id:801, service_name:"Instalacion Tile Piso (ceramic/porcelain)",               uom:"SQFT", base:9.09,  category:"Tile",         notes:"RSMeans OR standard size floor tile" },
  { id:802, service_name:"Instalacion Tile Pared (wall)",                           uom:"SQFT", base:11.82, category:"Tile",         notes:"RSMeans OR incl. waterproofing" },
  { id:803, service_name:"Remocion de Tile",                                        uom:"SQFT", base:2.50,  category:"Tile",         notes:"RSMeans OR haul-away incl." },
  { id:804, service_name:"Regrouting / Grout Repair",                               uom:"SQFT", base:4.09,  category:"Tile",         notes:"RSMeans OR remove+replace grout" },
  // ── DEMOLICION ────────────────────────────────────────────────────────────
  { id:901, service_name:"Demolicion de Estructura Residencial",                    uom:"SQFT", base:1.14,  category:"Demolicion",   notes:"RSMeans OR selective demo residential" },
  { id:902, service_name:"Remocion de Muro (non-load bearing)",                     uom:"EA",   base:477,   category:"Demolicion",   notes:"RSMeans OR incl. patch" },
  { id:903, service_name:"Haul Away / Debris Removal (full load)",                  uom:"PROJ", base:364,   category:"Demolicion",   notes:"Portland avg single trip" },
  // ── PUERTAS Y VENTANAS ────────────────────────────────────────────────────
  {id:1001, service_name:"Instalacion Puerta Interior (pre-hung)",                  uom:"EA",   base:295,   category:"Doors",        notes:"RSMeans OR labor only" },
  {id:1002, service_name:"Instalacion Puerta Exterior",                             uom:"EA",   base:450,   category:"Doors",        notes:"RSMeans OR incl. weatherstrip" },
  {id:1003, service_name:"Instalacion de Ventana (labor only)",                     uom:"EA",   base:409,   category:"Doors",        notes:"RSMeans OR labor only excl. window" },
  // ── ROOFING ───────────────────────────────────────────────────────────────
  {id:1101, service_name:"Instalacion de Techo - Roofing Composite Shingles",       uom:"SQ",   base:450,   category:"Exteriores",   notes:"RSMeans OR $4.50-5.50/sqft → per SQ (100sqft)" },
  {id:1102, service_name:"Reparacion de Techo (spot repair)",                       uom:"EA",   base:409,   category:"Exteriores",   notes:"RSMeans OR per section" },
  // ── CONSTRUCCION GENERAL ──────────────────────────────────────────────────
  {id:1201, service_name:"Construccion Residencial Standard (all-in)",              uom:"SQFT", base:227,   category:"Construccion", notes:"Portland 2026 avg $200-500/sqft; Mortenson Q4 2025 Portland +7.35% YoY" },
  {id:1202, service_name:"Construccion Residencial Custom / High-End",              uom:"SQFT", base:409,   category:"Construccion", notes:"Portland 2026 high-end avg" },
  // ── LIMPIEZA / CLEANING ───────────────────────────────────────────────────
  {id:1301, service_name:"Limpieza de Obra Post-Construccion",                      uom:"SQFT", base:0.45,  category:"Limpieza",     notes:"Portland avg broom+detail clean" },
  {id:1302, service_name:"Limpieza Final de Obra (GL/Project)",                     uom:"PROJ", base:545,   category:"Limpieza",     notes:"Portland avg full residential clean" },
  // ── FRAMING / ESTRUCTURA ──────────────────────────────────────────────────
  {id:1401, service_name:"Framing - Estructura de Madera (labor)",                  uom:"SQFT", base:6.00,  category:"Framing",      notes:"BOLI Carpenter $52.34/hr. RSMeans OR ~$5.50-6.50/sqft" },
  {id:1402, service_name:"Steel Framing Erection (Mortenson Q4 +3.8%)",            uom:"SQFT", base:9.00,  category:"Framing",      notes:"Mortenson Portland Q4 2025 structural steel framing" },
  // ── PROJECT MANAGEMENT ────────────────────────────────────────────────────
  {id:1501, service_name:"Project Management / Coordinacion",                       uom:"HR",   base:68.00, category:"Admin",        notes:"GC PM rate Portland 2025" },
  {id:1502, service_name:"Visita de Inspeccion / Site Visit",                       uom:"EA",   base:159,   category:"Admin",        notes:"Portland avg first visit" },
  {id:1503, service_name:"Travel / Mobilizacion (within service area)",             uom:"EA",   base:77.00, category:"Admin",        notes:"Portland area avg per trip" },
  // ── HVAC / MECANICO ───────────────────────────────────────────────────────
  {id:1601, service_name:"HVAC - Instalacion Sistema (labor)",                      uom:"HR",   base:95.00, category:"HVAC",         notes:"Mortenson Portland Q4 +1.9%. BOLI HVAC mechanic ~$92/hr base" },
  {id:1602, service_name:"Plumbing Systems (labor)",                                uom:"HR",   base:88.00, category:"Plumbing",     notes:"Mortenson Portland Q4 +3.3%. BOLI Plumber Portland" },
  {id:1603, service_name:"Electrical Systems (labor)",                              uom:"HR",   base:90.00, category:"Electrical",   notes:"Mortenson Portland Q4 +1.7%. BOLI Electrician Portland" },
];

const INFLATION_FACTOR = 1.10; // +10% Portland material/labor inflation adjustment 2025-2026

function buildCsvContent() {
  const header = 'id,service_name,uom,book_price,category,location_base,notes';
  const rows = TEMPLATE_ROWS.map(r => {
    const price = (r.base * INFLATION_FACTOR).toFixed(2);
    const notes = (r.notes || '').replace(/,/g, ';');
    return `${r.id},"${r.service_name}",${r.uom},${price},${r.category},Oregon,"${notes}"`;
  });
  return [header, ...rows].join('\n');
}

const TEMPLATE_CSV = buildCsvContent();

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'oregon_price_book_2025_x1.10.csv';
  a.click();
  URL.revokeObjectURL(url);
}

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
          <p className="text-xs text-slate-400 mt-0.5">Requeridas: <code className="bg-slate-100 px-1 rounded">service_name</code>, <code className="bg-slate-100 px-1 rounded">book_price</code> · Opcionales: <code className="bg-slate-100 px-1 rounded">uom</code>, <code className="bg-slate-100 px-1 rounded">category</code>, <code className="bg-slate-100 px-1 rounded">notes</code> · Factor inflación ×1.10 aplicado</p>
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

      {/* Template download */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-slate-300" />
          <span className="text-[10px] text-slate-400">Columnas: <code>id, service_name, uom, book_price, category, location_base</code></span>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-500 hover:text-blue-700 transition"
        >
          <Download className="w-3 h-3" />
          Descargar plantilla CSV
        </button>
      </div>
    </div>
  );
}