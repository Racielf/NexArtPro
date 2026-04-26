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
 * Shows only when estimate is in an approved state.
 * Valid trigger statuses: approved (strict lifecycle — no 'signed', no 'converted').
 * Converts estimate → WorkOrder with full version traceability.
 */
export default function ConvertToWorkOrderButton({ estimate, onConverted, asDropdownItem = false }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!estimate) return null;

  // Strict lifecycle: only 'approved' is valid. 'signed' and 'converted' are NOT valid estimate statuses.
  const isApproved = estimate.status === 'approved';

  const handleConvert = async () => {
    if (!isApproved) {
      toast.error('Estimate must be approved before converting to a Work Order.');
      return;
    }

    setLoading(true);
    try {
      const estimateVersion = estimate.version_number ?? 1;

      // Version-aware duplicate prevention: one WO per estimate_id + version_number
      const existing = await base44.entities.WorkOrder.filter({ estimate_id: estimate.id });
      const versionMatch = existing.filter(wo => (wo.estimate_version ?? 1) === estimateVersion);

      if (versionMatch.length > 0) {
        toast.info(`Work Order #${versionMatch[0].work_order_number} already exists for this version`);
        navigate(`/work-orders/${versionMatch[0].id}`);
        setLoading(false);
        return;
      }

      const user = await base44.auth.me();
      const woNum = await getNextDocumentNumber('work_order');

      // Generate tasks from estimate groups (stable — preserves service_name + description)
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
            completed_at: null,
          });
        });
      });

      // Create WorkOrder — totals are COPIED not recalculated, groups preserved
      const wo = await base44.entities.WorkOrder.create({
        work_order_number: woNum,
        estimate_id: estimate.id,
        estimate_version: estimateVersion,           // version traceability
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
        tasks,
        task_statuses: {},                           // legacy compat field
        assigned_by: user?.full_name || user?.email || 'Admin',
        assigned_at: new Date().toISOString(),
        company_id: estimate.company_id || 'rc-art',
      });

      // INTENTIONALLY NOT mutating estimate status — lifecycle stays at 'approved'
      // Estimate tracks its own lifecycle independently from WO creation

      toast.success(`Work Order #${woNum} created successfully`);
      onConverted?.();
      navigate(`/work-orders/${wo.id}`);
    } finally {
      setLoading(false);
    }
  };

  const enabled = !!estimate.client_name && !loading && isApproved;
  const disabledTitle = !estimate.client_name
    ? 'Customer required'
    : !isApproved
      ? 'Estimate must be approved first'
      : 'Convert to Work Order';

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
      title={disabledTitle}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5" />}
      Convert to Work Order
    </Button>
  );
}