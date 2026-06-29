import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Loader2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import CapitalContributionForm from '@/components/projects/CapitalContributionForm';
import { calcTotalCapital, formatCurrency } from '@/lib/projectsApi';
import { nexartClient } from '@/api/nexartClient';

const STATUS_COLOR = {
  pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

const TYPE_LABELS = {
  initial:       'Initial',
  additional:    'Additional',
  closing:       'Closing',
  reimbursement: 'Reimbursement',
};

const METHOD_LABELS = {
  wire:            'Wire',
  check:           'Check',
  cash:            'Cash',
  company_payment: 'Co. Payment',
};

export default function ProjectCapital() {
  const { project } = useOutletContext();
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: contributions = [], isLoading } = useQuery({
    queryKey: ['capital-contributions', project.id],
    queryFn: () => nexartClient.entities.CapitalContribution.filter(
      { project_id: project.id },
      '-created_at',
      200,
      '*, investor:investors(id, name)'
    ),
    staleTime: 1000 * 60 * 2,
    enabled: Boolean(project.id),
  });

  const { data: investors = [] } = useQuery({
    queryKey: ['investors-active'],
    queryFn: () => nexartClient.entities.Investor.filter({ status: 'active' }, '-created_at', 100),
    staleTime: 1000 * 60 * 5,
  });

  const createContribution = useMutation({
    mutationFn: (formData) => nexartClient.entities.CapitalContribution.create({
      project_id: project.id,
      ...formData,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capital-contributions', project.id] });
      setShowForm(false);
      toast.success('Contribution recorded.');
    },
    onError: (err) => toast.error(`Failed to save: ${err.message}`),
  });

  const total = calcTotalCapital(contributions);
  const confirmed = calcTotalCapital(contributions.filter((c) => c.status === 'confirmed'));

  return (
    <div className="max-w-4xl space-y-4">
      {/* Control Room banner */}
      <div className="investor-control-room">
        <div className="investor-control-room-badge">Capital</div>
        <h2 className="investor-control-room-title">{project.name}</h2>
        <p className="investor-control-room-sub">
          Capital contributions from equity partners.
          {contributions.length > 0 && (
            <span className="text-amber-300">
              {' '}{formatCurrency(confirmed)} confirmed of {formatCurrency(total)} committed.
            </span>
          )}
        </p>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Contribution
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Contribution</CardTitle></CardHeader>
          <CardContent>
            <CapitalContributionForm
              investors={investors}
              isLoading={createContribution.isPending}
              onSubmit={(data) => createContribution.mutate(data)}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">History</CardTitle>
            {contributions.length > 0 && (
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <DollarSign className="w-4 h-4 text-primary" />
                {formatCurrency(total)} total
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No contributions recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.investor?.name ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(c.amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {TYPE_LABELS[c.type] ?? c.type}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {METHOD_LABELS[c.method] ?? c.method}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] ${STATUS_COLOR[c.status] ?? ''}`}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.date ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.evidence_reference || c.notes || ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
