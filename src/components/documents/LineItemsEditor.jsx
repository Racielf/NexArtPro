import { Trash2, Plus, BookOpen, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, calcLineTotal } from "@/utils/invoiceCalc";

const ITEM_TYPES = ["service","material","labor","fee","discount","custom"];

export const newLineItem = () => ({
  id: crypto.randomUUID(),
  item_type: "service",
  name: "",
  description: "",
  quantity: 1,
  unit: "each",
  unit_price: 0,
  taxable: true,
  tax_rate: 0,
  discount: 0,
  line_total: 0,
  sort_order: 0,
});

export default function LineItemsEditor({ items, onChange, globalTaxRate = 0, onOpenPriceBook }) {
  const update = (id, key, value) => {
    onChange(items.map(li => {
      if (li.id !== id) return li;
      const updated = { ...li, [key]: value };
      updated.line_total = calcLineTotal(updated);
      return updated;
    }));
  };

  const remove = (id) => onChange(items.filter(li => li.id !== id));
  const add = () => onChange([...items, newLineItem()]);

  return (
    <div className="bg-white rounded-2xl nx-shadow border border-nx-border overflow-hidden">
      <div className="px-6 py-4 border-b border-nx-border flex items-center justify-between">
        <h2 className="font-semibold text-nx-text">Line Items</h2>
        <div className="flex gap-2">
          {onOpenPriceBook && (
            <Button type="button" variant="outline" size="sm" onClick={onOpenPriceBook}>
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />Price Book
            </Button>
          )}
          <Button type="button" size="sm" onClick={add} className="nx-gradient-blue text-white border-0">
            <Plus className="w-3.5 h-3.5 mr-1.5" />Add Item
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 text-nx-muted">
          <p className="text-sm">No line items yet.</p>
          <p className="text-xs mt-1">Add items manually or pick from your Price Book.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-nx-bg border-b border-nx-border text-xs text-nx-muted">
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Item / Description</th>
                <th className="text-left px-4 py-3 font-medium w-20">Qty</th>
                <th className="text-left px-4 py-3 font-medium w-24">Unit Price</th>
                <th className="text-left px-4 py-3 font-medium w-24">Tax</th>
                <th className="text-right px-4 py-3 font-medium w-24">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-nx-border">
              {items.map(li => (
                <tr key={li.id} className="hover:bg-nx-bg/50">
                  <td className="px-4 py-3">
                    <select value={li.item_type} onChange={e => update(li.id, "item_type", e.target.value)} className="text-xs border border-nx-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary/30">
                      {ITEM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input value={li.name} onChange={e => update(li.id, "name", e.target.value)} placeholder="Item name" className="w-full text-sm border border-nx-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 mb-1" />
                    <input value={li.description} onChange={e => update(li.id, "description", e.target.value)} placeholder="Description (optional)" className="w-full text-xs border border-nx-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 text-nx-muted" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min="0" step="0.01" value={li.quantity} onChange={e => update(li.id, "quantity", parseFloat(e.target.value) || 0)} className="w-full text-sm border border-nx-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min="0" step="0.01" value={li.unit_price} onChange={e => update(li.id, "unit_price", parseFloat(e.target.value) || 0)} className="w-full text-sm border border-nx-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <input type="checkbox" checked={!!li.taxable} onChange={e => update(li.id, "taxable", e.target.checked)} className="rounded" />
                      {li.taxable && <input type="number" min="0" max="100" step="0.01" value={li.tax_rate || globalTaxRate} onChange={e => update(li.id, "tax_rate", parseFloat(e.target.value) || 0)} className="w-14 text-xs border border-nx-border rounded-lg px-1.5 py-1 focus:outline-none" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-right text-nx-text">{formatCurrency(li.line_total)}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => remove(li.id)} className="p-1 text-nx-muted hover:text-nx-error rounded-lg transition-colors">
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
  );
}