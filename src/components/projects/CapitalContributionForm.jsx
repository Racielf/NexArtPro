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
import { CONTRIBUTION_METHODS, CONTRIBUTION_STATUSES } from '@/lib/investorsApi';

const schema = z.object({
  investor_id: z.string().min(1, 'Required'),
  amount:      z.coerce.number().positive('Must be positive'),
  method:      z.enum(CONTRIBUTION_METHODS),
  status:      z.enum(CONTRIBUTION_STATUSES),
  received_at: z.string().optional(),
  notes:       z.string().optional(),
});

export default function CapitalContributionForm({ investors = [], onSubmit, onCancel, isLoading }) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { method: 'wire', status: 'pending' },
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
        {errors.investor_id && <p className="text-xs text-red-500">{errors.investor_id.message}</p>}
      </div>

      <div className="space-y-1">
        <Label>Amount (USD) *</Label>
        <Input type="number" step="0.01" {...register('amount')} />
        {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Method</Label>
          <Select defaultValue="wire" onValueChange={(v) => setValue('method', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTRIBUTION_METHODS.map((m) => (
                <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
      </div>

      <div className="space-y-1">
        <Label>Date Received</Label>
        <Input type="date" {...register('received_at')} />
      </div>

      <div className="space-y-1">
        <Label>Notes</Label>
        <Input {...register('notes')} placeholder="Optional" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving…' : 'Save Contribution'}
        </Button>
      </div>
    </form>
  );
}
