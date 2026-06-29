import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InvestorTable from '@/components/projects/InvestorTable';
import AddInvestorSheet from '@/components/projects/AddInvestorSheet';
import { getTotalEquityPct } from '@/lib/investorsApi';
import { nexartClient } from '@/api/nexartClient';
import { buildFinancialSummary } from '@/lib/financialsApi';

export default function ProjectInvestors() {
  const { project } = useOutletContext();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const { data: latestAnalysis = null } = useQuery({
    queryKey: ['flip-analyses', project.id],
    queryFn: async () => {
      const rows = await nexartClient.entities.FlipAnalysis.filter(
        { project_id: project.id }, '-version', 1
      );
      return rows[0] ?? null;
    },
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(project.id),
  });

  const totalEquity = getTotalEquityPct(projectInvestors);
  const { profit_neto = 0 } = latestAnalysis ? buildFinancialSummary(latestAnalysis) : {};

  return (
    <div className="max-w-4xl space-y-4">
      {/* Control Room banner */}
      <div className="investor-control-room">
        <div className="investor-control-room-badge">Investor Hub</div>
        <h2 className="investor-control-room-title">{project.name}</h2>
        <p className="investor-control-room-sub">
          Equity partners and capital allocation.
          {projectInvestors.length > 0 && (
            <span className={totalEquity === 100 ? ' text-green-400' : ' text-yellow-300'}>
              {' '}{totalEquity.toFixed(1)}% allocated
              {totalEquity === 100 ? ' — fully subscribed.' : '.'}
            </span>
          )}
        </p>
        <Button
          size="sm"
          onClick={() => setSheetOpen(true)}
          className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30"
        >
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

      <AddInvestorSheet
        projectId={project.id}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
