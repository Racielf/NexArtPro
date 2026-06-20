import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InvestorTable from '@/components/projects/InvestorTable';
import AddInvestorToProjectForm from '@/components/projects/AddInvestorToProjectForm';
import { getTotalEquityPct } from '@/lib/investorsApi';
import { nexartClient } from '@/api/nexartClient';
import { buildFinancialSummary } from '@/lib/financialsApi';

export default function ProjectInvestors() {
  const { project } = useOutletContext();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: projectInvestors = [], isLoading } = useQuery({
    queryKey: ['project-investors', project.id],
    queryFn: () => nexartClient.entities.ProjectInvestor.filter(
      { project_id: project.id },
      '-created_at',
      100,
      '*, investor:investors(id, name, type, status)'
    ),
    staleTime: 1000 * 60 * 2,
    enabled: Boolean(project.id),
  });

  const { data: activeInvestors = [] } = useQuery({
    queryKey: ['investors-active'],
    queryFn: () => nexartClient.entities.Investor.filter({ status: 'active' }, '-created_at', 100),
    staleTime: 1000 * 60 * 5,
  });

  const addInvestor = useMutation({
    mutationFn: (data) =>
      nexartClient.entities.ProjectInvestor.create({
        project_id: project.id,
        ...data,
        equity_pct: Number(data.equity_pct),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-investors', project.id] });
      setShowForm(false);
      toast.success('Investor added to project.');
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const totalEquity = getTotalEquityPct(projectInvestors);
  const { profit_neto = 0 } = project ? buildFinancialSummary(project) : {};

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Investors</h2>
          <p className="text-sm text-muted-foreground">
            Equity partners for {project.name}.
            {projectInvestors.length > 0 && (
              <span className={totalEquity === 100 ? ' text-green-600' : ' text-yellow-600'}>
                {' '}{totalEquity.toFixed(1)}% allocated.
              </span>
            )}
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Investor
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Link Investor to Project</CardTitle>
          </CardHeader>
          <CardContent>
            <AddInvestorToProjectForm
              investors={activeInvestors}
              usedEquity={totalEquity}
              isLoading={addInvestor.isPending}
              onSubmit={(data) => addInvestor.mutate(data)}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Equity Partners</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <InvestorTable projectInvestors={projectInvestors} profitNeto={profit_neto} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
