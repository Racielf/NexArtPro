import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ClipboardList, Loader2 } from 'lucide-react';
import { prepareDownstreamDocument } from '@/lib/downstreamItemMapper';
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
        // Copy services — normalize groups + populate canonical flat line_items
        ...prepareDownstreamDocument(estimate.groups || []),
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

  const enabled = !!estimate.client_name && !loading;

  return (
    <button
      onClick={handleConvert}
      disabled={!enabled}
      title={!estimate.client_name ? 'Customer required' : 'Convert to Work Order'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 14px',
        fontSize: '13px',
        fontWeight: 600,
        borderRadius: '6px',
        border: '1px solid transparent',
        cursor: enabled ? 'pointer' : 'not-allowed',
        fontFamily: 'Inter, system-ui, sans-serif',
        letterSpacing: '0.3px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: enabled ? '#6366f1' : '#cbd5e1',
        color: 'white',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        opacity: enabled ? 1 : 0.7,
      }}
      onMouseEnter={e => {
        if (!enabled) return;
        e.currentTarget.style.backgroundColor = '#4f46e5';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.25)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        if (!enabled) return;
        e.currentTarget.style.backgroundColor = '#6366f1';
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
      onMouseUp={e => { if (enabled) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.25)'; } }}
    >
      {loading ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <ClipboardList style={{ width: 14, height: 14 }} />}
      Convert to Work Order
    </button>
  );
}