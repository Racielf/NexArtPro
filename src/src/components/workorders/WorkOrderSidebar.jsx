import React, { useState } from 'react';
import { MapPin, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function WorkOrderSidebar({ workOrder, onUpdate, saving }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(workOrder);

  const handleSave = async () => {
    await onUpdate(formData);
    setEditing(false);
    toast.success('Work Order updated');
  };

  const STATUS_OPTIONS = ['draft', 'assigned', 'scheduled', 'on_the_way', 'in_progress', 'completed', 'cancelled', 'invoiced'];

  return (
    <div className="divide-y divide-slate-100">
      {/* Customer */}
      <div className="px-4 py-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Customer</p>
        {editing ? (
          <div className="space-y-2">
            <Input
              value={formData.client_name || ''}
              onChange={e => setFormData({ ...formData, client_name: e.target.value })}
              placeholder="Client name"
            />
            <Input
              value={formData.client_email || ''}
              onChange={e => setFormData({ ...formData, client_email: e.target.value })}
              placeholder="Email"
              type="email"
            />
            <Input
              value={formData.client_phone || ''}
              onChange={e => setFormData({ ...formData, client_phone: e.target.value })}
              placeholder="Phone"
            />
          </div>
        ) : (
          <>
            <p className="font-bold text-slate-900">{workOrder.client_name}</p>
            {workOrder.client_address && (
              <div className="flex items-start gap-1.5 text-xs text-slate-600 mt-2">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{workOrder.client_address}</span>
              </div>
            )}
            {workOrder.client_phone && (
              <p className="text-xs text-slate-600 mt-2">📞 {workOrder.client_phone}</p>
            )}
          </>
        )}
      </div>

      {/* Service Address */}
      <div className="px-4 py-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Service Address</p>
        {editing ? (
          <Textarea
            value={formData.client_address || ''}
            onChange={e => setFormData({ ...formData, client_address: e.target.value })}
            placeholder="Address"
            rows={2}
            className="text-sm"
          />
        ) : (
          <p className="text-sm text-slate-700">{workOrder.client_address || 'Not specified'}</p>
        )}
      </div>

      {/* Status */}
      <div className="px-4 py-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Work Status</p>
        <select
          value={formData.status || 'draft'}
          onChange={e => setFormData({ ...formData, status: e.target.value })}
          className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
      </div>

      {/* Scheduled Date */}
      <div className="px-4 py-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Scheduled Date</p>
        {editing ? (
          <Input
            type="date"
            value={formData.scheduled_date || ''}
            onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })}
            className="h-8 text-sm"
          />
        ) : (
          <p className="text-sm text-slate-700">{formData.scheduled_date || 'Not scheduled'}</p>
        )}
      </div>

      {/* Assigned Worker */}
      <div className="px-4 py-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Assigned Worker</p>
        {editing ? (
          <Input
            value={formData.assigned_worker_name || ''}
            onChange={e => setFormData({ ...formData, assigned_worker_name: e.target.value })}
            placeholder="Worker name"
            className="text-sm"
          />
        ) : (
          <p className="text-sm text-slate-700">{formData.assigned_worker_name || 'Not assigned'}</p>
        )}
      </div>

      {/* Notes */}
      <div className="px-4 py-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Instructions</p>
        {editing ? (
          <Textarea
            value={formData.notes || ''}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Operational notes and instructions..."
            rows={2}
            className="text-sm"
          />
        ) : (
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{formData.notes || 'No instructions'}</p>
        )}
      </div>

      {/* Internal Notes */}
      <div className="px-4 py-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Internal Notes</p>
        {editing ? (
          <Textarea
            value={formData.internal_notes || ''}
            onChange={e => setFormData({ ...formData, internal_notes: e.target.value })}
            placeholder="Team notes..."
            rows={2}
            className="text-sm"
          />
        ) : (
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{formData.internal_notes || 'No internal notes'}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-4 space-y-2">
        {editing ? (
          <>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFormData(workOrder);
                setEditing(false);
              }}
              className="w-full"
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            onClick={() => setEditing(true)}
            className="w-full"
          >
            Edit Details
          </Button>
        )}
      </div>
    </div>
  );
}