import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InvestorTable from '@/components/projects/InvestorTable';
import { getTotalEquityPct } from '@/lib/investorsApi';
import { nexartClient } from '@/api/nexartClient';
import { buildFinancialSummary } from '@/lib/financialsApi';

export default function ProjectInvestors() {
  const { project } = useOutletContext();

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
        <Button size="sm" disabled>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Investor
        </Button>
      </div>

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
