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
  name:           z.string().min(2, 'Project name is required'),
  address:        z.string().default(''),
  status:         z.enum(['planning', 'active', 'completed', 'on_hold', 'cancelled']).default('planning'),
  responsible:    z.string().default(''),
  purchase_date:  z.string().optional().nullable(),
  purchase_price: z.coerce.number().min(0).default(0),
});

const STATUS_OPTIONS = [
  { value: 'planning',   label: 'Planning' },
  { value: 'active',     label: 'Active' },
  { value: 'completed',  label: 'Completed' },
  { value: 'on_hold',    label: 'On Hold' },
  { value: 'cancelled',  label: 'Cancelled' },
];

export default function ProjectNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,

    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name:           '',
      address:        '',
      status:         'planning',
      responsible:    '',
      purchase_date:  null,
      purchase_price: 0,
    },
  });

  const createProject = useMutation({
    mutationFn: (data) =>
      nexartClient.entities.Project.create({
        company_id: 'rc-art',
        ...data,
        purchase_price: Number(data.purchase_price) || 0,
        purchase_date:  data.purchase_date || null,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created.');
      navigate(`/projects/${created.id}`);
    },
    onError: (err) => toast.error(`Failed to create project: ${err.message}`),
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 text-muted-foreground"
        onClick={() => navigate('/projects')}
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Projects
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">New Project</h1>
        <p className="text-sm text-muted-foreground">
          Create a flip project to start tracking capital and investor returns.
        </p>
      </div>

      <form onSubmit={handleSubmit((data) => createProject.mutate(data))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="e.g. 123 Maple St Flip"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="123 Maple St, Miami, FL 33101"
                {...register('address')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  defaultValue="planning"
                  onValueChange={(val) => setValue('status', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="responsible">Responsible</Label>
                <Input
                  id="responsible"
                  placeholder="Racin"
                  {...register('responsible')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  {...register('purchase_date')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="purchase_price">Purchase Price ($)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  {...register('purchase_price')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/projects')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createProject.isPending || isSubmitting}>
            {createProject.isPending ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </div>
  );
}
