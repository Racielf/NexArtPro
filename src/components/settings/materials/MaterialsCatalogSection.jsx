import React, { useState, useEffect, useMemo } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { Search, Plus, Upload, Download, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import MaterialFormModal from './MaterialFormModal';
import MaterialsImport from './MaterialsImport';
import { MATERIALS_SEED, MATERIAL_CATEGORIES } from './materialsSeed';

export default function MaterialsCatalogSection() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await nexartClient.entities.Material.list('-created_date', 500);
    setMaterials(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = materials;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        (m.material_name || '').toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q) ||
        (m.supplier || '').toLowerCase().includes(q) ||
        (m.sku_or_ref || '').toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      list = list.filter(m => m.category === categoryFilter);
    }
    return list;
  }, [materials, search, categoryFilter]);

  const handleSave = async (data) => {
    if (editItem) {
      await nexartClient.entities.Material.update(editItem.id, data);
      toast.success('Material updated');
    } else {
      await nexartClient.entities.Material.create(data);
      toast.success('Material added');
    }
    setFormOpen(false);
    setEditItem(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this material?')) return;
    await nexartClient.entities.Material.delete(id);
    toast.success('Material deleted');
    load();
  };

  const handleSeed = async () => {
    if (!confirm(`This will add ${MATERIALS_SEED.length} starter materials. Continue?`)) return;
    setSeeding(true);
    for (let i = 0; i < MATERIALS_SEED.length; i += 25) {
      await nexartClient.entities.Material.bulkCreate(
        MATERIALS_SEED.slice(i, i + 25).map(m => ({ ...m, is_active: true }))
      );
    }
    toast.success(`${MATERIALS_SEED.length} starter materials added`);
    setSeeding(false);
    load();
  };

  const openEdit = (m) => { setEditItem(m); setFormOpen(true); };
  const openAdd = () => { setEditItem(null); setFormOpen(true); };

  const categories = useMemo(() => {
    const cats = new Set(materials.map(m => m.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [materials]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search materials..." className="pl-9 h-9" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="h-9 text-sm border border-slate-200 rounded-md px-3 bg-white text-slate-600 min-w-[160px]">
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-2 ml-auto">
          {materials.length === 0 && !loading && (
            <Button size="sm" variant="outline" onClick={handleSeed} disabled={seeding} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
              <Package className="w-3.5 h-3.5" />{seeding ? 'Seeding...' : 'Load Starter Materials'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </Button>
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Material
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span>{materials.length} total</span>
        <span>{filtered.length} shown</span>
        <span>{materials.filter(m => m.is_active !== false).length} active</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading materials...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {materials.length === 0 ? 'No materials yet. Add manually or load starter materials.' : 'No materials match your search.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Material</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Cost</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-4 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 cursor-pointer"
                    onClick={() => openEdit(m)}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800">{m.material_name}</div>
                      {m.notes && <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[250px]">{m.notes}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{m.category || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{m.unit || 'ea'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-700">${(m.unit_cost || 0).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{m.supplier || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">{m.sku_or_ref || '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        m.is_active !== false ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {m.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleDelete(m.id)}
                        className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <MaterialFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }} onSave={handleSave} material={editItem} />
      <MaterialsImport open={importOpen} onClose={() => setImportOpen(false)} onImported={load} />
    </div>
  );
}