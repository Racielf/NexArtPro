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

  if (!estimate || !['approved', 'signed'].includes(estimate.status)) return null;

  const handleConvert = async () => {
    setLoading(true);
    try {
      // Check if already converted
      const existing = await base44.entities.WorkOrder.filter({ estimate_id: estimate.id });
      if (existing.length > 0) {
        toast.error('Already converted to Work Order #' + existing[0].work_order_number);
        navigate(`/work-order-detail?id=${existing[0].id}`);
        return;
      }

      const user = await base44.auth.me();
      const woNum = Math.floor(Math.random() * 9000) + 1000;

      const wo = await base44.entities.WorkOrder.create({
        work_order_number: woNum,
        estimate_id: estimate.id,
        client_id: estimate.client_id || '',
        client_name: estimate.client_name,
        client_email: estimate.client_email || '',
        client_address: estimate.client_address || '',
        client_phone: estimate.client_phone || '',
        title: estimate.title || `Work Order from Estimate #${estimate.estimate_number}`,
        description: estimate.notes || '',
        status: 'draft',
        groups: estimate.groups || [],
        line_items: estimate.line_items || [],
        subtotal: estimate.subtotal || 0,
        total: estimate.total || 0,
        notes: estimate.notes || '',
        internal_notes: estimate.internal_notes || '',
        assigned_by: user?.full_name || user?.email || 'Admin',
        assigned_at: new Date().toISOString(),
      });

      await base44.entities.Estimate.update(estimate.id, { status: 'converted' });

      toast.success(`Work Order #${woNum} created!`);
      onConverted?.();
      navigate(`/work-order-detail?id=${wo.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      onClick={handleConvert}
      disabled={loading}
      className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5" />}
      Convert to Work Order
    </Button>
  );
}