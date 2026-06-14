import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import CapitalContributionForm from '@/components/projects/CapitalContributionForm';
import { calcTotalCapital, formatCurrency } from '@/lib/projectsApi';

const STATUS_COLOR = {
  pending:  'bg-yellow-100 text-yellow-800',
  received: 'bg-green-100 text-green-800',
  returned: 'bg-gray-100 text-gray-500',
};

export default function ProjectCapital() {
  const { project } = useOutletContext();
  const [showForm, setShowForm] = useState(false);

  // Phase 5: replace [] with useQuery for capital_contributions
  const contributions = [];
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
              investors={[]}
              onSubmit={(data) => {
                // Phase 5: wire to nexartClient.entities.CapitalContribution.create
                console.log('new contribution', { project_id: project.id, ...data });
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent>
          {contributions.length === 0 ? (
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
                    <TableCell>{c.received_at ?? '—'}</TableCell>
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
