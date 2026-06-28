import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { nexartClient } from '@/api/nexartClient';

const INVESTOR_TYPES = [
  { value: 'individual',  label: 'Individual / Person' },
  { value: 'llc',         label: 'LLC (Limited Liability Company)' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'trust',       label: 'Trust' },
  { value: 'fund',        label: 'Investment Fund' },
];

const FUNDING_SOURCES = [
  { value: 'cash',  label: 'Capital propio / Cash' },
  { value: 'heloc', label: 'HELOC — Línea de crédito hipotecaria' },
  { value: 'sdira', label: 'SDIRA — Cuenta de retiro autodirigida' },
  { value: 'other', label: 'Otros / Préstamos institucionales' },
];

const TIME_HORIZONS = [
  { value: 'short_term', label: 'Corto plazo — 6 a 12 meses (Flip)' },
  { value: 'mid_term',   label: 'Mediano plazo — 12 a 24 meses' },
  { value: 'long_term',  label: 'Largo plazo — Más de 24 meses' },
];

const RETURN_PREFS = [
  { value: 'fixed_rate', label: 'Interés Fijo — Deuda / Nota Promisoria' },
  { value: 'equity',     label: 'Participación de Utilidades — Miembro LLC' },
];

const STATUS_BADGE = {
  lead:     'bg-yellow-100 text-yellow-800',
  active:   'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-500',
};

const schema = z.object({
  name:               z.string().min(2, 'Name is required'),
  investor_type:      z.enum(['individual','llc','corporation','trust','fund']).default('individual'),
  investment_company: z.string().default(''),
  phone:              z.string().default(''),
  email:              z.string().email('Invalid email').or(z.literal('')).default(''),
  address:            z.string().default(''),
  city:               z.string().default(''),
  state:              z.string().default(''),
  zip:                z.string().default(''),
  estimated_capital:  z.coerce.number().min(0).default(0),
  funding_source:     z.enum(['cash','heloc','sdira','other']).optional().or(z.literal('')),
  is_accredited:      z.boolean().default(false),
  time_horizon:       z.enum(['short_term','mid_term','long_term']).optional().or(z.literal('')),
  return_preference:  z.enum(['fixed_rate','equity']).optional().or(z.literal('')),
  tax_id:             z.string().default(''),
  status:             z.enum(['lead','active','inactive']).default('lead'),
  tax_notes:          z.string().default(''),
  notes:              z.string().default(''),
});

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

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

  const { register, handleSubmit, watch, control, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(schema),
    values: investor ? {
      name:               investor.name               ?? '',
      investor_type:      investor.investor_type      ?? 'individual',
      investment_company: investor.investment_company ?? '',
      phone:              investor.phone              ?? '',
      email:              investor.email              ?? '',
      address:            investor.address            ?? '',
      city:               investor.city               ?? '',
      state:              investor.state              ?? '',
      zip:                investor.zip                ?? '',
      estimated_capital:  investor.estimated_capital  ?? 0,
      funding_source:     investor.funding_source     ?? '',
      is_accredited:      investor.is_accredited      ?? false,
      time_horizon:       investor.time_horizon       ?? '',
      return_preference:  investor.return_preference  ?? '',
      tax_id:             investor.tax_id             ?? '',
      status:             investor.status             ?? 'lead',
      tax_notes:          investor.tax_notes          ?? '',
      notes:              investor.notes              ?? '',
    } : undefined,
  });

  const isAccredited = watch('is_accredited');

  const updateInvestor = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        funding_source:    data.funding_source    || null,
        time_horizon:      data.time_horizon      || null,
        return_preference: data.return_preference || null,
      };
      return nexartClient.entities.Investor.update(id, payload);
    },
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

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{investor.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={STATUS_BADGE[investor.status] ?? ''}>
              {investor.status}
            </Badge>
            {investor.estimated_capital > 0 && (
              <span className="text-sm text-muted-foreground">
                {fmt.format(investor.estimated_capital)} available
              </span>
            )}
            {investor.is_accredited && (
              <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Accredited
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => updateInvestor.mutate(data))} className="space-y-6">

        {/* SECTION 1 — Identification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Identification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name / Entity Name *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Investor Type</Label>
                <Controller
                  name="investor_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INVESTOR_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="investment_company">LLC / Entity Name</Label>
                <Input id="investment_company" {...register('investment_company')} />
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

        {/* SECTION 2 — Capital Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Capital Profile</CardTitle>
            <CardDescription>Available capital and funding source for pipeline tracking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="estimated_capital">Estimated Available Capital (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input id="estimated_capital" type="number" step="1000" min="0" className="pl-7" {...register('estimated_capital')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Funding Source</Label>
              <Controller
                name="funding_source"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ''} onValueChange={(v) => field.onChange(v || null)}>
                    <SelectTrigger><SelectValue placeholder="Select source…" /></SelectTrigger>
                    <SelectContent>
                      {FUNDING_SOURCES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
              <input
                type="checkbox"
                id="is_accredited"
                className="mt-0.5 h-4 w-4 rounded border-input cursor-pointer accent-primary"
                {...register('is_accredited')}
              />
              <div>
                <label htmlFor="is_accredited" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                  <ShieldCheck className={`w-4 h-4 ${isAccredited ? 'text-green-600' : 'text-muted-foreground'}`} />
                  Accredited Investor (SEC)
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Net worth &gt; $1M (excl. primary residence) or income &gt; $200K/year.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3 — Investment Thesis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Investment Thesis</CardTitle>
            <CardDescription>Return horizon and preferred deal structure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Return Horizon</Label>
              <Controller
                name="time_horizon"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ''} onValueChange={(v) => field.onChange(v || null)}>
                    <SelectTrigger><SelectValue placeholder="Select horizon…" /></SelectTrigger>
                    <SelectContent>
                      {TIME_HORIZONS.map((h) => (
                        <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Preferred Return Structure</Label>
              <Controller
                name="return_preference"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ''} onValueChange={(v) => field.onChange(v || null)}>
                    <SelectTrigger><SelectValue placeholder="Select structure…" /></SelectTrigger>
                    <SelectContent>
                      {RETURN_PREFS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4 — Legal & Tax */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">4. Legal &amp; Tax</CardTitle>
            <CardDescription>For 1099 reporting, promissory notes, and operating agreements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tax_id">SSN / EIN</Label>
                <Input id="tax_id" placeholder="XX-XXXXXXX" {...register('tax_id')} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead — First contact</SelectItem>
                        <SelectItem value="active">Active — Proof of funds verified</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
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
          <Button type="button" variant="ghost" onClick={() => navigate('/investors')}>Cancel</Button>
          <Button type="submit" disabled={updateInvestor.isPending || !isDirty}>
            {updateInvestor.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
