import React, { useState } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { normalizeLineItem, normalizeGroups } from '@/lib/lineItemNormalizer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function WorkOrderGroups({ workOrder, onSave, saving }) {
  const [groups, setGroups] = useState(() => normalizeGroups(workOrder?.groups || []));

  const handleAddGroup = () => {
    const newGroup = {
      id: `g${Date.now()}`,
      name: `Group ${groups.length + 1}`,
      collapsed: false,
      items: [],
    };
    setGroups([...groups, newGroup]);
  };

  const handleToggleGroup = (groupId) => {
    setGroups(g => g.map(gr => gr.id === groupId ? { ...gr, collapsed: !gr.collapsed } : gr));
  };

  const handleDeleteGroup = (groupId) => {
    setGroups(g => g.filter(gr => gr.id !== groupId));
  };

  const handleGroupNameChange = (groupId, newName) => {
    setGroups(g => g.map(gr => gr.id === groupId ? { ...gr, name: newName } : gr));
  };

  const handleAddItem = (groupId) => {
    setGroups(g => g.map(gr => gr.id === groupId ? {
      ...gr, items: [...gr.items, normalizeLineItem({ id: `i${Date.now()}` })]
    } : gr));
  };

  const handleUpdateItem = (groupId, itemId, updates) => {
    setGroups(g => g.map(gr => gr.id === groupId ? {
      ...gr, items: gr.items.map(item => item.id === itemId ? { ...item, ...updates } : item)
    } : gr));
  };

  const handleDeleteItem = (groupId, itemId) => {
    setGroups(g => g.map(gr => gr.id === groupId ? {
      ...gr, items: gr.items.filter(item => item.id !== itemId)
    } : gr));
  };

  const handleSave = async () => {
    // Calculate totals
    let subtotal = 0;
    groups.forEach(g => {
      g.items.forEach(item => {
        subtotal += (item.line_total || 0);
      });
    });
    
    await onSave({
      ...workOrder,
      groups,
      subtotal,
      total: subtotal,
    });
  };

  return (
    <div className="space-y-3">
      {groups.map(group => (
        <div key={group.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
            onClick={() => handleToggleGroup(group.id)}>
            <div className="flex-1">
              <input
                type="text"
                value={group.name}
                onChange={e => handleGroupNameChange(group.id, e.target.value)}
                onClick={e => e.stopPropagation()}
                className="font-bold text-slate-900 bg-transparent border-none focus:outline-none w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 mr-2">{group.items?.length || 0} items</span>
              {group.collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
            </div>
          </div>

          {!group.collapsed && (
            <div className="px-5 py-4 space-y-2">
              {group.items?.map(item => (
                <div key={item.id} className="flex gap-2 items-end p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1">Service/Item</label>
                    <input
                      type="text"
                      value={item.service_name || ''}
                      onChange={e => handleUpdateItem(group.id, item.id, { service_name: e.target.value })}
                      placeholder="Service name..."
                      className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-slate-400 block mb-1">Qty</label>
                    <input
                      type="number"
                      value={item.quantity || 1}
                      onChange={e => handleUpdateItem(group.id, item.id, { quantity: parseFloat(e.target.value) || 1 })}
                      className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-slate-400 block mb-1">Unit Price</label>
                    <input
                      type="number"
                      value={item.unit_price || 0}
                      onChange={e => {
                        const up = parseFloat(e.target.value) || 0;
                        const lt = (item.quantity || 1) * up;
                        handleUpdateItem(group.id, item.id, { unit_price: up, line_total: lt });
                      }}
                      className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-slate-400 block mb-1">Total</label>
                    <div className="text-sm font-bold text-slate-900 px-2 py-1.5">${(item.line_total || 0).toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteItem(group.id, item.id)}
                    className="p-1.5 hover:bg-red-100 text-red-500 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleAddItem(group.id)}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-200 rounded-lg hover:border-slate-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" />Add Item
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={handleAddGroup}
        className="w-full py-2.5 text-sm font-medium text-primary border border-dashed border-primary rounded-lg hover:bg-primary/5 transition-colors"
      >
        <Plus className="w-3.5 h-3.5 inline mr-1" />Add Group
      </button>

      {/* Totals */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 mt-4">
        <div className="flex justify-end">
          <div className="w-64 space-y-1">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium">${groups.reduce((sum, g) => sum + (g.items?.reduce((s, i) => s + (i.line_total || 0), 0) || 0), 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-1.5">
              <span>Total</span>
              <span className="text-primary">${groups.reduce((sum, g) => sum + (g.items?.reduce((s, i) => s + (i.line_total || 0), 0) || 0), 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full bg-primary hover:bg-primary/90 text-white">
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}