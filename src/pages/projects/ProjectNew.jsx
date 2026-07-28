import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { nexartClient } from '@/api/nexartClient';

const schema = z.object({
  // Step 1 — Basic info
  name:           z.string().min(2, 'Project name is required'),
  address:        z.string().default(''),
  property_type:  z.string().default('residential'),
  beds:           z.coerce.number().min(0).default(0),
  baths:          z.coerce.number().min(0).default(0),
  sqft:           z.coerce.number().min(0).default(0),
  year_built:     z.coerce.number().min(0).default(0),
  status:         z.enum(['planning', 'active', 'completed', 'on_hold', 'cancelled']).default('planning'),
  responsible:    z.string().default(''),

  // Step 2 — Acquisition
  purchase_price: z.coerce.number().min(0).default(0),
  purchase_date:  z.string().optional().nullable(),
  down_payment:   z.coerce.number().min(0).default(0),
  loan_amount:    z.coerce.number().min(0).default(0),
  lender_name:    z.string().default(''),

  // Step 3 — Closing costs
  title_company:      z.string().default(''),
  title_company_fee:  z.coerce.number().min(0).default(0),
  realtor_fee:        z.coerce.number().min(0).default(0),
  closing_costs:      z.coerce.number().min(0).default(0),
  inspection_fee:     z.coerce.number().min(0).default(0),
  insurance:          z.coerce.number().min(0).default(0),
});

const STATUS_OPTIONS = [
  { value: 'planning',   label: 'Planning' },
  { value: 'active',     label: 'Active' },
  { value: 'completed',  label: 'Completed' },
  { value: 'on_hold',    label: 'On Hold' },
  { value: 'cancelled',  label: 'Cancelled' },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: 'residential',  label: 'Residential' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'commercial',   label: 'Commercial' },
  { value: 'land',         label: 'Land' },
  { value: 'other',        label: 'Other' },
];

const STEPS = [
  { id: 1, title: 'Basic Info',       fields: ['name', 'address', 'property_type', 'beds', 'baths', 'sqft', 'year_built', 'status', 'responsible'] },
  { id: 2, title: 'Acquisition',      fields: ['purchase_price', 'purchase_date', 'down_payment', 'loan_amount', 'lender_name'] },
  { id: 3, title: 'Closing Costs',    fields: ['title_company', 'title_company_fee', 'realtor_fee', 'closing_costs', 'inspection_fee', 'insurance'] },
];

const DEFAULT_VALUES = {
  name: '', address: '', property_type: 'residential', beds: 0, baths: 0, sqft: 0, year_built: 0,
  status: 'planning', responsible: '',
  purchase_price: 0, purchase_date: null, down_payment: 0, loan_amount: 0, lender_name: '',
  title_company: '', title_company_fee: 0, realtor_fee: 0, closing_costs: 0, inspection_fee: 0, insurance: 0,
};

export default function ProjectNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const currentStep = STEPS[step - 1];

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  const createProject = useMutation({
    mutationFn: (data) =>
      nexartClient.entities.Project.create({
        company_id: 'rc-art',
        ...data,
        purchase_date: data.purchase_date || null,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created.');
      navigate(`/projects/${created.id}`);
    },
    onError: (err) => toast.error(`Failed to create project: ${err.message}`),
  });

  const goNext = async () => {
    const valid = await trigger(currentStep.fields);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

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

      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Step {step} of {STEPS.length}: {currentStep.title}</span>
          <span className="text-muted-foreground">{Math.round((step / STEPS.length) * 100)}%</span>
        </div>
        <Progress value={(step / STEPS.length) * 100} />
      </div>

      <form
        onSubmit={handleSubmit((data) => createProject.mutate(data))}
        className="space-y-6"
      >
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Info</CardTitle>
              <CardDescription>Property identity and who's responsible.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Project Name *</Label>
                <Input id="name" placeholder="e.g. 123 Maple St Flip" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="123 Maple St, Miami, FL 33101" {...register('address')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Property Type</Label>
                  <Select
                    defaultValue={watch('property_type')}
                    onValueChange={(val) => setValue('property_type', val)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    defaultValue={watch('status')}
                    onValueChange={(val) => setValue('status', val)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="beds">Beds</Label>
                  <Input id="beds" type="number" min="0" {...register('beds')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="baths">Baths</Label>
                  <Input id="baths" type="number" min="0" step="0.5" {...register('baths')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sqft">Sqft</Label>
                  <Input id="sqft" type="number" min="0" {...register('sqft')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="year_built">Year Built</Label>
                  <Input id="year_built" type="number" min="0" {...register('year_built')} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="responsible">Responsible</Label>
                <Input id="responsible" placeholder="Racin" {...register('responsible')} />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acquisition</CardTitle>
              <CardDescription>How the property is being purchased.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="purchase_price">Purchase Price ($)</Label>
                  <Input id="purchase_price" type="number" min="0" step="1000" {...register('purchase_price')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <Input id="purchase_date" type="date" {...register('purchase_date')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="down_payment">Down Payment ($)</Label>
                  <Input id="down_payment" type="number" min="0" step="1000" {...register('down_payment')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loan_amount">Loan Amount ($)</Label>
                  <Input id="loan_amount" type="number" min="0" step="1000" {...register('loan_amount')} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lender_name">Lender Name</Label>
                <Input id="lender_name" placeholder="e.g. Kiavi" {...register('lender_name')} />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Closing Costs</CardTitle>
              <CardDescription>Fees due at closing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title_company">Title Company</Label>
                  <Input id="title_company" placeholder="e.g. First American" {...register('title_company')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="title_company_fee">Title Company Fee ($)</Label>
                  <Input id="title_company_fee" type="number" min="0" step="10" {...register('title_company_fee')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="realtor_fee">Realtor Fee ($)</Label>
                  <Input id="realtor_fee" type="number" min="0" step="10" {...register('realtor_fee')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="closing_costs">Closing Costs ($)</Label>
                  <Input id="closing_costs" type="number" min="0" step="10" {...register('closing_costs')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inspection_fee">Inspection Fee ($)</Label>
                  <Input id="inspection_fee" type="number" min="0" step="10" {...register('inspection_fee')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="insurance">Insurance ($)</Label>
                  <Input id="insurance" type="number" min="0" step="10" {...register('insurance')} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => (step === 1 ? navigate('/projects') : goBack())}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < STEPS.length ? (
            <Button type="button" onClick={goNext}>
              Next
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={createProject.isPending || isSubmitting}>
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
