import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const money = z.coerce.number().min(0).nullable().optional();

const schema = z.object({
  purchase_price:    money,
  loan_amount:       money,
  holdback:          money,
  earnest_money:     money,
  closing_costs:     money,
  arv:               money,
  commission_pct:    z.coerce.number().min(0).max(100).default(6),
  renovation_budget: money,
  actual_labor:      money,
  actual_materials:  money,
  actual_services:   money,
  draws_received:    money,
  notes:             z.string().optional(),
});

function MoneyField({ label, name, register, errors }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type="number" step="0.01" min="0" placeholder="0.00" {...register(name)} />
      {errors[name] && <p className="text-xs text-red-500">{errors[name].message}</p>}
    </div>
  );
}

function SectionHeading({ label }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-1">{label}</p>
  );
}

export default function FlipAnalysisForm({ defaultValues = {}, onSubmit, onCancel, isLoading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { commission_pct: 6, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <SectionHeading label="Acquisition" />
      <div className="grid grid-cols-2 gap-4">
        <MoneyField label="Purchase Price"  name="purchase_price"  register={register} errors={errors} />
        <MoneyField label="Loan Amount"     name="loan_amount"     register={register} errors={errors} />
        <MoneyField label="Holdback"        name="holdback"        register={register} errors={errors} />
        <MoneyField label="Earnest Money"   name="earnest_money"   register={register} errors={errors} />
        <MoneyField label="Closing Costs"   name="closing_costs"   register={register} errors={errors} />
      </div>

      <SectionHeading label="Valuation" />
      <div className="grid grid-cols-2 gap-4">
        <MoneyField label="ARV"             name="arv"             register={register} errors={errors} />
        <div className="space-y-1">
          <Label>Commission %</Label>
          <Input type="number" step="0.1" min="0" max="100" {...register('commission_pct')} />
        </div>
      </div>

      <SectionHeading label="Renovation" />
      <div className="grid grid-cols-2 gap-4">
        <MoneyField label="Budget"          name="renovation_budget" register={register} errors={errors} />
      </div>

      <SectionHeading label="Actuals" />
      <div className="grid grid-cols-2 gap-4">
        <MoneyField label="Labor"           name="actual_labor"    register={register} errors={errors} />
        <MoneyField label="Materials"       name="actual_materials" register={register} errors={errors} />
        <MoneyField label="Services"        name="actual_services" register={register} errors={errors} />
        <MoneyField label="Draws Received"  name="draws_received"  register={register} errors={errors} />
      </div>

      <div className="space-y-1">
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
          {isLoading ? 'Saving…' : 'Save Analysis'}
        </Button>
      </div>
    </form>
  );
}
