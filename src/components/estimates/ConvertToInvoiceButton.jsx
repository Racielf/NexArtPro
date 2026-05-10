import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { FileText, Loader2 } from 'lucide-react';
import { prepareDownstreamDocument } from '@/lib/downstreamItemMapper';
import { getNextDocumentNumber } from '@/lib/documentNumbering';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

function buildInitialPaymentState(total = 0) {
  return {
    payments: [],
    amount_paid: 0,
    balance_due: total || 0,
    payment_status: 'unpaid',
  };
}

async function markEstimateConverted(estimateId, invoiceId) {
  const now = new Date().toISOString();

  // 1. Critical update — must succeed
  await base44.entities.Estimate.update(estimateId, {
    status: 'converted',
    sales_stage: 'converted',
  });

  // 2. Optional metadata — best effort
  await base44.entities.Estimate.update(estimateId, {
    invoice_id: invoiceId,
    converted_at: now,
    converted_to_invoice_at: now,
    last_activity_at: now,
  }).catch(err => console.warn('Optional converted metadata update failed:', err));
}

/**
 * Enabled when the estimate has approval evidence:
 *  - status approved/signed, OR
 *  - approved_at / signed_at / terms_accepted = true
 * Declined estimates are always blocked.
 */
const hasApprovalEvidence = (estimate) => {
  if (!estimate) return false;
  if (['approved', 'signed'].includes(estimate.status)) return true;
  if (estimate.status === 'declined') return false;
  return Boolean(
    estimate.approved_at ||
    estimate.signed_at ||
    estimate.terms_accepted === true
  );
};

export default function ConvertToInvoiceButton({ estimate, onConverted, asDropdownItem = false }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!estimate) return null;

  const canConvert = hasApprovalEvidence(estimate);

  const handleConvert = async () => {
    if (!canConvert) {
      toast.error('Estimate must be approved or signed before converting to an invoice.');
      return;
    }
    setLoading(true);
    try {
      const existing = await base44.entities.Invoice.filter({ estimate_id: estimate.id });

      if (existing.length > 1) {
        toast.error(`Multiple invoices found (${existing.length}). Contact support to resolve.`);
        setLoading(false);
        return;
      }

      if (existing.length === 1) {
        toast.info(`Invoice #${existing[0].invoice_number} already created`);
        if (estimate.status !== 'converted') {
          await markEstimateConverted(estimate.id, existing[0].id);
        }
        navigate(`/invoice-detail?id=${existing[0].id}`);
        setLoading(false);
        return;
      }

      const invoiceNum = await getNextDocumentNumber('invoice');
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const total = estimate.total || 0;

      let work_order_id = estimate.work_order_id || null;
      if (!work_order_id) {
        const woList = await base44.entities.WorkOrder.filter({ estimate_id: estimate.id });
        work_order_id = woList?.[0]?.id || null;
      }

      const invoice = await base44.entities.Invoice.create({
        invoice_number: invoiceNum,
        estimate_id: estimate.id,
        ...(work_order_id ? { work_order_id } : {}),
        ...(estimate.version_number != null ? { estimate_version: estimate.version_number } : {}),
        client_id: estimate.client_id || '',
        client_name: estimate.client_name,
        client_email: estimate.client_email || '',
        client_address: estimate.client_address || '',
        client_phone: estimate.client_phone || '',
        title: estimate.title || `Invoice from Estimate #${estimate.estimate_number}`,
        status: 'draft',
        ...prepareDownstreamDocument(estimate.groups || []),
        subtotal: estimate.subtotal || 0,
        discount_type: estimate.discount_type || 'percent',
        discount_value: estimate.discount_value || 0,
        discount_amount: estimate.discount_amount || 0,
        tax_rate: estimate.tax_rate || 0,
        tax_amount: estimate.tax_amount || 0,
        total,
        ...buildInitialPaymentState(total),
        due_date: dueDate.toISOString().split('T')[0],
        notes: estimate.notes || '',
        payment_terms: estimate.payment_terms || '',
        company_id: estimate.company_id || 'rc-art',
      });

      await markEstimateConverted(estimate.id, invoice.id);

      toast.success(`Invoice #${invoiceNum} created successfully`);
      onConverted?.();
      navigate(`/invoice-detail?id=${invoice.id}`);
    } finally {
      setLoading(false);
    }
  };

  const enabled = !!estimate.client_name && !loading && canConvert;

  if (asDropdownItem) {
    return (
      <div>
        <DropdownMenuItem
          onClick={handleConvert}
          disabled={!enabled}
          className="gap-2 cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Convert to Invoice
        </DropdownMenuItem>
        {!canConvert && (
          <p className="px-3 pb-1.5 text-[10px] text-amber-600 font-medium">
            Approve or sign the estimate first
          </p>
        )}
      </div>
    );
  }

  return (
    <Button
      onClick={handleConvert}
      disabled={!enabled}
      variant="outline"
      size="sm"
      className="gap-1.5"
      title={!estimate.client_name ? 'Customer required' : !canConvert ? 'Estimate must be approved or signed first' : 'Convert to Invoice'}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
      Convert to Invoice
    </Button>
  );
}