import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { nexartClient } from '@/api/nexartClient';

const schema = z.object({
  name:      z.string().min(2, 'Name is required'),
  type:      z.enum(['person', 'company']).default('person'),
  phone:     z.string().default(''),
  email:     z.string().email('Invalid email').or(z.literal('')).default(''),
  address:   z.string().default(''),
  city:      z.string().default(''),
  state:     z.string().default(''),
  zip:       z.string().default(''),
  status:    z.enum(['active', 'inactive']).default('active'),
  tax_id:    z.string().default(''),
  tax_notes: z.string().default(''),
  notes:     z.string().default(''),
});

export default function InvestorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: investor, isLoading, isError } = useQuery({
    queryKey: ['investor', id],
    queryFn: async () => {
      const rows = await nexartClient.entities.Investor.filter({ id }, '-created_at', 1);
      if (!rows.length) throw new Error('Investor not found');
      return rows[0];
    },
    enabled: Boolean(id),
  });

  const { register, handleSubmit, setValue, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(schema),
    values: investor
      ? {
          name:      investor.name      ?? '',
          type:      investor.type      ?? 'person',
          phone:     investor.phone     ?? '',
          email:     investor.email     ?? '',
          address:   investor.address   ?? '',
          city:      investor.city      ?? '',
          state:     investor.state     ?? '',
          zip:       investor.zip       ?? '',
          status:    investor.status    ?? 'active',
          tax_id:    investor.tax_id    ?? '',
          tax_notes: investor.tax_notes ?? '',
          notes:     investor.notes     ?? '',
        }
      : undefined,
  });

  const updateInvestor = useMutation({
    mutationFn: (data) => nexartClient.entities.Investor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investors'] });
      queryClient.invalidateQueries({ queryKey: ['investors-active'] });
      queryClient.invalidateQueries({ queryKey: ['investor', id] });
      toast.success('Investor updated.');
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (isError || !investor) return (
    <div className="p-6 text-center">
      <p className="text-destructive mb-4">Investor not found.</p>
      <Button variant="outline" onClick={() => navigate('/investors')}>Back to Investors</Button>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 text-muted-foreground"
        onClick={() => navigate('/investors')}
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Investors
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{investor.name}</h1>
        <p className="text-sm text-muted-foreground capitalize">
          {investor.type === 'person' ? 'Individual' : 'LLC / Company'} &middot; {investor.status}
        </p>
      </div>

      <form
        onSubmit={handleSubmit((data) => updateInvestor.mutate(data))}
        className="space-y-6"
      >
        <Card>
          <CardHeader><CardTitle className="text-base">Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name / Entity Name *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select defaultValue={investor.type} onValueChange={(v) => setValue('type', v, { shouldDirty: true })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="person">Individual</SelectItem>
                    <SelectItem value="company">LLC / Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select defaultValue={investor.status} onValueChange={(v) => setValue('status', v, { shouldDirty: true })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register('phone')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input id="state" maxLength={2} className="uppercase" {...register('state')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" {...register('zip')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Legal &amp; Tax</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tax_id">SSN / EIN</Label>
              <Input id="tax_id" {...register('tax_id')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax_notes">Tax Notes</Label>
              <Textarea id="tax_notes" rows={3} {...register('tax_notes')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">General Notes</Label>
              <Textarea id="notes" rows={3} {...register('notes')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate('/investors')}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateInvestor.isPending || !isDirty}>
            {updateInvestor.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
