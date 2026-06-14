import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { nexartClient } from '@/api/nexartClient';

const schema = z.object({
  name:   z.string().min(2, 'Name is required'),
  type:   z.enum(['person', 'company']).default('person'),
  phone:  z.string().default(''),
  email:  z.string().email('Invalid email').or(z.literal('')).default(''),
  status: z.enum(['active', 'inactive']).default('active'),
  notes:  z.string().default(''),
});

export default function InvestorNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', type: 'person', phone: '', email: '', status: 'active', notes: '',
    },
  });

  const createInvestor = useMutation({
    mutationFn: (data) =>
      nexartClient.entities.Investor.create({ company_id: 'rc-art', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investors'] });
      queryClient.invalidateQueries({ queryKey: ['investors-active'] });
      toast.success('Investor registered.');
      navigate('/investors');
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  return (
    <div className="p-6 max-w-xl mx-auto">
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
        <h1 className="text-2xl font-semibold">New Investor</h1>
        <p className="text-sm text-muted-foreground">
          Register a capital partner to link to flip projects.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((data) => createInvestor.mutate(data))}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investor Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name / Entity Name *</Label>
              <Input
                id="name"
                placeholder="Dora Montes / Blue Sky Properties LLC"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  defaultValue="person"
                  onValueChange={(val) => setValue('type', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="person">Individual</SelectItem>
                    <SelectItem value="company">LLC / Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  defaultValue="active"
                  onValueChange={(val) => setValue('status', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Input
                  id="phone"
                  placeholder="(503) 926-1377"
                  {...register('phone')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="dora@email.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Partnership terms, relationship notes..."
                rows={3}
                {...register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/investors')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createInvestor.isPending}>
            {createInvestor.isPending ? 'Saving...' : 'Register Investor'}
          </Button>
        </div>
      </form>
    </div>
  );
}
