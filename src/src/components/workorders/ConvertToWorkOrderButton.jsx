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
 * ConvertToWorkOrderButton — Converts an approved or signed Estimate → WorkOrder.
 *
 * FIX (May 2025):
 * - Now accepts BOTH 'approved' AND 'signed' statuses (was blocking signed estimates)
 * - Sets origin_type: 'estimate' on the created WorkOrder
 * - Marks source estimate as status: 'converted' after successful WO creation
 * - Copies full traceability fields (source_estimate_number, etc.)
 * - Creates execution_checklist and field_notes on the new WO
 */
export default function ConvertToWorkOrderButton({ estimate, onConverted, asDropdownItem = false }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!estimate) return null;

  // FIX: Accept both 'approved' and 'signed' — signed estimates were getting stuck
  const canConvert = ['approved', 'signed'].includes(estimate.status);

  const handleConvert = async () => {
    if (!canConvert) {
      toast.error('Estimate must be approved or signed before converting to a Work Order.');
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
            completed_at: null,
          });
        });
      });

      // Create WorkOrder with full traceability
      const wo = await base44.entities.WorkOrder.create({
        work_order_number: woNum,
        // FIX: Set origin_type
        origin_type: 'estimate',
        estimate_id: estimate.id,
        estimate_version: estimateVersion,
        // Source traceability
        source_estimate_id: estimate.id,
        source_estimate_number: estimate.estimate_number,
        source_estimate_version: estimateVersion,
        source_document_type: estimate.document_type,
        source_estimate_status: estimate.status,
        source_estimate_total: estimate.total || 0,
        source_estimate_signed_at: estimate.signed_at || null,
        source_estimate_signed_by: estimate.signature_name || null,
        source_estimate_final_pdf_url: estimate.final_signed_pdf_url || null,
        // Client
        appointment_id: estimate.appointment_id || '',
        client_id: estimate.client_id || '',
        client_name: estimate.client_name,
        client_email: estimate.client_email || '',
        client_address: estimate.client_address || '',
        client_phone: estimate.client_phone || '',
        // Content
        title: estimate.title || `Work Order from Estimate #${estimate.estimate_number}`,
        description: estimate.notes || '',
        status: 'draft',
        ...prepareDownstreamDocument(estimate.groups || []),
        // Financials
        subtotal: estimate.subtotal || 0,
        total: estimate.total || 0,
        materials_subtotal: estimate.materials_subtotal || 0,
        materials_cost: estimate.materials_cost || 0,
        other_costs_total: estimate.other_costs_total || 0,
        total_cost: estimate.total_cost || 0,
        gross_margin: estimate.gross_margin || 0,
        gross_margin_pct: estimate.gross_margin_pct || 0,
        // Terms
        payment_terms: estimate.payment_terms || '',
        warranty_terms: estimate.warranty_terms || '',
        exclusions: estimate.exclusions || '',
        scope_summary: estimate.scope_summary || '',
        assumptions: estimate.assumptions || '',
        // Notes
        notes: estimate.notes || '',
        internal_notes: estimate.internal_notes || '',
        // Tasks & execution
        tasks,
        task_statuses: {},
        execution_checklist: [
          { id: 'materials_ready', item: 'Materials ready / verified', completed: false },
          { id: 'site_prepared', item: 'Job site prepared', completed: false },
          { id: 'work_completed', item: 'Work completed according to approved estimate', completed: false },
          { id: 'photos_uploaded', item: 'Completion photos uploaded', completed: false },
          { id: 'client_reviewed', item: 'Client reviewed completed work', completed: false },
        ],
        field_notes: [],
        // Assignment
        assigned_by: user?.full_name || user?.email || 'Admin',
        assigned_at: new Date().toISOString(),
        company_id: estimate.company_id || 'rc-art',
      });

      // FIX: Mark estimate as converted
      await base44.entities.Estimate.update(estimate.id, {
        status: 'converted',
        converted_to_work_order_at: new Date().toISOString(),
        converted_work_order_id: wo.id,
      });

      toast.success(`Work Order #${woNum} created successfully`);
      onConverted?.();
      navigate(`/work-orders/${wo.id}`);
    } finally {
      setLoading(false);
    }
  };

  const enabled = !!estimate.client_name && !loading && canConvert;
  const disabledTitle = !estimate.client_name
    ? 'Customer required'
    : !canConvert
      ? 'Estimate must be approved or signed first'
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