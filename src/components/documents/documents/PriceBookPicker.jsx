import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PriceBookPicker({ open, onOpenChange, onPick }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) base44.entities.PriceBookItem.filter({ is_active: true }).then(setItems);
  }, [open]);

  const filtered = items.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return i.name?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>Select from Price Book</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nx-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-nx-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="space-y-2 overflow-y-auto pt-2 -mr-2 pr-2">
          {filtered.length === 0 ? (
            <p className="text-nx-muted text-sm text-center py-6">No active items. Add items in the Price Book.</p>
          ) : filtered.map(item => (
            <button key={item.id} type="button" onClick={() => { onPick(item); onOpenChange(false); }} className="w-full flex items-center justify-between p-3 rounded-xl border border-nx-border hover:border-primary/40 hover:bg-blue-50 transition-all text-left group">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-nx-text group-hover:text-nx-primary truncate">{item.name}</div>
                {item.description && <div className="text-xs text-nx-muted truncate">{item.description}</div>}
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-nx-muted">
                  <Tag className="w-3 h-3" />{item.category} · {item.unit}
                </div>
              </div>
              <div className="text-sm font-semibold text-nx-text ml-4 whitespace-nowrap">
                {item.price_type === "range" ? `$${item.min_price}-$${item.max_price}` : item.price_type === "custom" ? "Custom" : `$${Number(item.price || 0).toFixed(2)}`}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}