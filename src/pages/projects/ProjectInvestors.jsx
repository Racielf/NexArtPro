import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InvestorTable from '@/components/projects/InvestorTable';
import { getTotalEquityPct } from '@/lib/investorsApi';

export default function ProjectInvestors() {
  const { project } = useOutletContext();

  // Phase 5: replace [] with useQuery for project_investors joined with investors
  const projectInvestors = [];
  const totalEquity = getTotalEquityPct(projectInvestors);

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Investors</h2>
          <p className="text-sm text-muted-foreground">
            Equity partners for {project.name}.
            {projectInvestors.length > 0 && (
              <span className={totalEquity === 100 ? ' text-green-600' : ' text-yellow-600'}>
                {' '}{totalEquity}% allocated.
              </span>
            )}
          </p>
        </div>
        <Button size="sm">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Investor
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Equity Partners</CardTitle></CardHeader>
        <CardContent>
          <InvestorTable projectInvestors={projectInvestors} profitNeto={0} />
        </CardContent>
      </Card>
    </div>
  );
}
