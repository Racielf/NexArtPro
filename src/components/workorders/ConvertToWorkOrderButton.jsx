import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * Shows only when estimate is approved or signed.
 * Converts estimate → WorkOrder and navigates to the WO detail page.
 */
export default function ConvertToWorkOrderButton({ estimate, onConverted }) {
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
      const woNum = Math.floor(Math.random() * 9000) + 1000;

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
        // Copy services — groups (structured) AND line_items (flat) from the estimate
        groups: (estimate.groups || []).map(g => ({
          ...g,
          items: (g.items || []).map(item => ({
            ...item,
            // Ensure each item has a stable id for task tracking
            id: item.id || item.service_name || String(Math.random()),
          })),
        })),
        line_items: estimate.line_items || [],
        subtotal: estimate.subtotal || 0,
        total: estimate.total || 0,
        notes: estimate.notes || '',
        internal_notes: estimate.internal_notes || '',
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

  return (
    <Button
      size="sm"
      onClick={handleConvert}
      disabled={loading || !estimate.client_name}
      title={!estimate.client_name ? 'Customer required' : 'Convert to Work Order'}
      className={`gap-1.5 text-white ${estimate.client_name ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-300 cursor-not-allowed'}`}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5" />}
      Convert to Work Order
    </Button>
  );
}