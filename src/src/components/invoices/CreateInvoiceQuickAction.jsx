import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FilePlus2 } from 'lucide-react';

export default function CreateInvoiceQuickAction({ className = '' }) {
  const navigate = useNavigate();
  return (
    <Button
      onClick={() => navigate('/invoice-create')}
      className={`gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold ${className}`}
    >
      <FilePlus2 className="w-4 h-4" />
      Create Invoice
    </Button>
  );
}
