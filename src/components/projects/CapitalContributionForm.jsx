import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CONTRIBUTION_METHODS,
  CONTRIBUTION_STATUSES,
  CONTRIBUTION_TYPES,
} from '@/lib/investorsApi';

const METHOD_LABELS = {
  wire:            'Wire Transfer',
  check:           'Check',
  cash:            'Cash',
  company_payment: 'Company Payment',
};

const TYPE_LABELS = {
  initial:       'Initial',
  additional:    'Additional',
  closing:       'Closing',
  reimbursement: 'Reimbursement',
};

const schema = z.object({
  investor_id:        z.string().min(1, 'Required'),
  amount:             z.coerce.number().positive('Must be positive'),
  date:               z.string().min(1, 'Date required'),
  method:             z.enum(CONTRIBUTION_METHODS),
  type:               z.enum(CONTRIBUTION_TYPES),
  status:             z.enum(CONTRIBUTION_STATUSES),
  evidence_reference: z.string().optional(),
  notes:              z.string().optional(),
});

export default function CapitalContributionForm({ investors = [], onSubmit, onCancel, isLoading }) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      method: 'wire',
      type:   'initial',
      status: 'pending',
      date:   new Date().toISOString().slice(0, 10),
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label>Investor *</Label>
        <select
          {...register('investor_id')}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">Select investor…</option>
          {investors.map((inv) => (
            <option key={inv.id} value={inv.id}>{inv.name}</option>
          ))}
        </select>
        {errors.investor_id && <p className="text-xs text-destructive">{errors.investor_id.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Amount (USD) *</Label>
          <Input type="number" step="0.01" min="0.01" placeholder="0.00" {...register('amount')} />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Date *</Label>
          <Input type="date" {...register('date')} />
          {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Type</Label>
          <Select defaultValue="initial" onValueChange={(v) => setValue('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTRIBUTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t] ?? t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Method</Label>
          <Select defaultValue="wire" onValueChange={(v) => setValue('method', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTRIBUTION_METHODS.map((m) => (
                <SelectItem key={m} value={m}>{METHOD_LABELS[m] ?? m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select defaultValue="pending" onValueChange={(v) => setValue('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTRIBUTION_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Evidence / Reference</Label>
          <Input {...register('evidence_reference')} placeholder="Wire #, check #…" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Notes</Label>
        <Input {...register('notes')} placeholder="Optional" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving…' : 'Save Contribution'}
        </Button>
      </div>
    </form>
  );
}
