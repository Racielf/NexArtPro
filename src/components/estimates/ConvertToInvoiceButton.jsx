import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { normalizeGroups } from '@/lib/lineItemNormalizer';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * Shows only when estimate is approved or signed.
 * Converts estimate → Invoice and navigates to the invoice detail page.
 */
export default function ConvertToInvoiceButton({ estimate, onConverted }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!estimate) return null;

  const handleConvert = async () => {
    setLoading(true);
    try {
      // Check if invoice(s) already exist for this estimate
      const existing = await base44.entities.Invoice.filter({ estimate_id: estimate.id });
      
      if (existing.length > 1) {
        toast.error(`Multiple invoices found (${existing.length}). Contact support to resolve.`);
        setLoading(false);
        return;
      }
      
      if (existing.length === 1) {
        toast.info(`Invoice #${existing[0].invoice_number} already created`);
        navigate(`/invoice-detail?id=${existing[0].id}`);
        setLoading(false);
        return;
      }

      // Create new invoice
      const invoiceNum = Math.floor(Math.random() * 9000) + 1000;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoice = await base44.entities.Invoice.create({
        invoice_number: invoiceNum,
        estimate_id: estimate.id,
        client_id: estimate.client_id || '',
        client_name: estimate.client_name,
        client_email: estimate.client_email || '',
        client_address: estimate.client_address || '',
        client_phone: estimate.client_phone || '',
        title: estimate.title || `Invoice from Estimate #${estimate.estimate_number}`,
        status: 'draft',
        groups: normalizeGroups(estimate.groups || []),
        line_items: [],
        subtotal: estimate.subtotal || 0,
        discount_type: estimate.discount_type || 'percent',
        discount_value: estimate.discount_value || 0,
        discount_amount: estimate.discount_amount || 0,
        tax_rate: estimate.tax_rate || 0,
        tax_amount: estimate.tax_amount || 0,
        total: estimate.total || 0,
        due_date: dueDate.toISOString().split('T')[0],
        notes: estimate.notes || '',
      });

      toast.success(`Invoice #${invoiceNum} created successfully`);
      onConverted?.();
      navigate(`/invoice-detail?id=${invoice.id}`);
    } finally {
      setLoading(false);
    }
  };

  const enabled = !!estimate.client_name && !loading;

  return (
    <button
      onClick={handleConvert}
      disabled={!enabled}
      title={!estimate.client_name ? 'Customer required' : 'Convert to Invoice'}
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
        backgroundColor: enabled ? '#10b981' : '#cbd5e1',
        color: 'white',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        opacity: enabled ? 1 : 0.7,
      }}
      onMouseEnter={e => {
        if (!enabled) return;
        e.currentTarget.style.backgroundColor = '#059669';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.25)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        if (!enabled) return;
        e.currentTarget.style.backgroundColor = '#10b981';
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
      onMouseUp={e => { if (enabled) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.25)'; } }}
    >
      {loading ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <FileText style={{ width: 14, height: 14 }} />}
      Convert to Invoice
    </button>
  );
}