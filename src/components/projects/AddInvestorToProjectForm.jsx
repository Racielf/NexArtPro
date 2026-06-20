import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const schema = z.object({
  investor_id: z.string().min(1, 'Select an investor'),
  equity_pct:  z.coerce.number().min(0.01, 'Required').max(100, 'Max 100%'),
  status:      z.enum(['pending', 'confirmed', 'void']).default('pending'),
  notes:       z.string().optional(),
});

export default function AddInvestorToProjectForm({
  investors = [],
  usedEquity = 0,
  onSubmit,
  onCancel,
  isLoading,
}) {
  const remaining = Math.max(0, 100 - usedEquity).toFixed(1);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { investor_id: '', equity_pct: '', status: 'pending', notes: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
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
        {errors.investor_id && (
          <p className="text-xs text-destructive">{errors.investor_id.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>
            Equity %{' '}
            {usedEquity > 0 && (
              <span className="text-xs text-muted-foreground">
                ({remaining}% available)
              </span>
            )}
          </Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max="100"
            placeholder="e.g. 25"
            {...register('equity_pct')}
          />
          {errors.equity_pct && (
            <p className="text-xs text-destructive">{errors.equity_pct.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select defaultValue="pending" onValueChange={(v) => setValue('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Input {...register('notes')} placeholder="Optional" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Adding…' : 'Add to Project'}
        </Button>
      </div>
    </form>
  );
}
