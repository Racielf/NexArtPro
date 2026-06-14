import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import CapitalContributionForm from '@/components/projects/CapitalContributionForm';
import { calcTotalCapital, formatCurrency } from '@/lib/projectsApi';
import { nexartClient } from '@/api/nexartClient';

const STATUS_COLOR = {
  pending:  'bg-yellow-100 text-yellow-800',
  received: 'bg-green-100 text-green-800',
  returned: 'bg-gray-100 text-gray-500',
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
      company_id: 'rc-art',
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

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Capital Contributions</h2>
          <p className="text-sm text-muted-foreground">
            Total raised: <span className="font-medium text-foreground">{formatCurrency(total)}</span>
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contribution
        </Button>
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
        <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
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
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.investor?.name ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(c.amount)}</TableCell>
                    <TableCell className="capitalize">{c.method}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLOR[c.status] ?? ''}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>{c.date ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.notes ?? ''}</TableCell>
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
