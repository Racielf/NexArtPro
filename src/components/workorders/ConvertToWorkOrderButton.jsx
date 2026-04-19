import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ClipboardList, Loader2 } from 'lucide-react';
import { prepareDownstreamDocument } from '@/lib/downstreamItemMapper';
import { getNextDocumentNumber } from '@/lib/documentNumbering';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * Shows only when estimate is approved or signed.
 * Converts estimate → WorkOrder and navigates to the WO detail page.
 */
export default function ConvertToWorkOrderButton({ estimate, onConverted, asDropdownItem = false }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!estimate) return null;

  const isApproved = ['approved', 'signed'].includes(estimate.status);

  const handleConvert = async () => {
    setLoading(true);
    try {
      // Check if work order(s) already exist for this estimate
      const existing = await base44.entities.WorkOrder.filter({ estimate_id: estimate.id });
      
      if (existing.length > 1) {
        toast.error(`Multiple work orders found (${existing.length}). Contact support to resolve.`);
        setLoading(false);
        return;
      }
      
      if (existing.length === 1) {
        toast.info(`Work Order #${existing[0].work_order_number} already created`);
        navigate(`/work-orders/${existing[0].id}`);
        setLoading(false);
        return;
      }

      const user = await base44.auth.me();
      const woNum = await getNextDocumentNumber('work_order');

      // Generate tasks from estimate groups
      const tasks = [];
      let order = 0;
      (estimate.groups || []).forEach(group => {
        (group.items || []).forEach(item => {
          tasks.push({
            id: `task-${order}`,
            title: item.service_name || `Task ${order + 1}`,
            description: item.description || '',
            status: 'pending',
            assigned_to: '',
            order: order++,
            started_at: null,
            completed_at: null
          });
        });
      });

      const wo = await base44.entities.WorkOrder.create({
        work_order_number: woNum,
        estimate_id: estimate.id,
        appointment_id: estimate.appointment_id || '',
        client_id: estimate.client_id || '',
        client_name: estimate.client_name,
        client_email: estimate.client_email || '',
        client_address: estimate.client_address || '',
        client_phone: estimate.client_phone || '',
        title: estimate.title || `Work Order from Estimate #${estimate.estimate_number}`,
        description: estimate.notes || '',
        status: 'draft',
        // Copy services — normalize groups + populate canonical flat line_items
        ...prepareDownstreamDocument(estimate.groups || []),
        subtotal: estimate.subtotal || 0,
        total: estimate.total || 0,
        notes: estimate.notes || '',
        internal_notes: estimate.internal_notes || '',
        tasks: tasks,
        task_statuses: {}, // legacy field, now using tasks array
        assigned_by: user?.full_name || user?.email || 'Admin',
        assigned_at: new Date().toISOString(),
      });

      await base44.entities.Estimate.update(estimate.id, { status: 'converted' });

      toast.success(`Work Order #${woNum} created successfully`);
      onConverted?.();
      navigate(`/work-orders/${wo.id}`);
    } finally {
      setLoading(false);
    }
  };

  const enabled = !!estimate.client_name && !loading;

  if (asDropdownItem) {
    return (
      <DropdownMenuItem
        onClick={handleConvert}
        disabled={!enabled}
        className="gap-2 cursor-pointer"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
        Convert to Work Order
      </DropdownMenuItem>
    );
  }

  return (
    <Button
      onClick={handleConvert}
      disabled={!enabled}
      variant="outline"
      size="sm"
      className="gap-1.5"
      title={!estimate.client_name ? 'Customer required' : 'Convert to Work Order'}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5" />}
      Convert to Work Order
    </Button>
  );
}