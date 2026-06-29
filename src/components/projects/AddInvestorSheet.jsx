import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { nexartClient } from '@/api/nexartClient';

const schema = z.object({
  investor_id:            z.string().uuid('Select an investor'),
  role:                   z.enum(['equity_partner','lead_contractor','silent_partner','other']).default('equity_partner'),
  ownership_percentage:   z.coerce.number().min(0).max(100).default(50),
  profit_split_percentage:z.coerce.number().min(0).max(100).default(50),
  status:                 z.enum(['pending','confirmed','cancelled']).default('confirmed'),
  agreement_notes:        z.string().default(''),
});

const ROLE_LABELS = {
  equity_partner:  'Equity Partner',
  lead_contractor: 'Lead Contractor',
  silent_partner:  'Silent Partner',
  other:           'Other',
};

export default function AddInvestorSheet({ projectId, open, onOpenChange }) {
  const queryClient = useQueryClient();

  const { data: activeInvestors = [], isLoading: loadingInvestors } = useQuery({
    queryKey: ['investors-active'],
    queryFn: () => nexartClient.entities.Investor.filter({ status: 'active' }, '-created_at', 100),
    staleTime: 1000 * 60 * 5,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      investor_id:             '',
      role:                    'equity_partner',
      ownership_percentage:    50,
      profit_split_percentage: 50,
      status:                  'confirmed',
      agreement_notes:         '',
    },
  });

  const addInvestor = useMutation({
    mutationFn: (data) =>
      nexartClient.entities.ProjectInvestor.create({
        company_id: 'rc-art',
        project_id: projectId,
        ...data,
        ownership_percentage:    Number(data.ownership_percentage),
        profit_split_percentage: Number(data.profit_split_percentage),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-investors', projectId] });
      toast.success('Investor linked to project.');
      reset();
      onOpenChange(false);
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="mb-6">
          <SheetTitle>Add Investor</SheetTitle>
          <SheetDescription>
            Link a capital partner to this project and set their equity terms.
          </SheetDescription>
        </SheetHeader>

        {loadingInvestors ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : activeInvestors.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No active investors found.
            <br />
            Register investors at <strong>/investors</strong> first.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit((data) => addInvestor.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Investor *</Label>
              <Select onValueChange={(val) => setValue('investor_id', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select investor..." />
                </SelectTrigger>
                <SelectContent>
                  {activeInvestors.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.investor_id && (
                <p className="text-xs text-destructive">{errors.investor_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                defaultValue="equity_partner"
                onValueChange={(val) => setValue('role', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ownership_percentage">Ownership %</Label>
                <Input
                  id="ownership_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="50"
                  {...register('ownership_percentage')}
                />
                {errors.ownership_percentage && (
                  <p className="text-xs text-destructive">{errors.ownership_percentage.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profit_split_percentage">Profit Split %</Label>
                <Input
                  id="profit_split_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="50"
                  {...register('profit_split_percentage')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                defaultValue="confirmed"
                onValueChange={(val) => setValue('status', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agreement_notes">Notes</Label>
              <Textarea
                id="agreement_notes"
                placeholder="Agreement terms, conditions..."
                rows={3}
                {...register('agreement_notes')}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addInvestor.isPending}>
                {addInvestor.isPending ? 'Linking...' : 'Add to Project'}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
