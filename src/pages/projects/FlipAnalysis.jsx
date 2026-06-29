import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FlipAnalysisPanel from '@/components/projects/FlipAnalysisPanel';
import FlipAnalysisForm from '@/components/projects/FlipAnalysisForm';
import { buildFinancialSummary, formatCurrency } from '@/lib/financialsApi';
import { calcInvestorReturn } from '@/lib/projectsApi';
import { nexartClient } from '@/api/nexartClient';

export default function FlipAnalysis() {
  const { project } = useOutletContext();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: analyses = [], isLoading: loadingAnalysis } = useQuery({
    queryKey: ['flip-analyses', project.id],
    queryFn: () => nexartClient.entities.FlipAnalysis.filter(
      { project_id: project.id }, '-version', 10
    ),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(project.id),
  });

  const { data: projectInvestors = [] } = useQuery({
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

  const analysis = analyses[0] ?? null;

  const saveMutation = useMutation({
    mutationFn: (formData) => {
      if (analysis) {
        return nexartClient.entities.FlipAnalysis.update(analysis.id, formData);
      }
      return nexartClient.entities.FlipAnalysis.create({
        project_id: project.id,
        company_id: 'rc-art',
        version:    1,
        ...formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flip-analyses', project.id] });
      setEditing(false);
      toast.success('Analysis saved.');
    },
    onError: (err) => toast.error(`Failed to save: ${err.message}`),
  });

  const { profit_neto = 0 } = analysis ? buildFinancialSummary(analysis) : {};

  if (loadingAnalysis) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Flip Analysis</h2>
          <p className="text-sm text-muted-foreground">Projected and actual P&L for {project.name}.</p>
        </div>
        {!editing && (
          <Button size="sm" onClick={() => setEditing(true)}>
            {analysis
              ? <><Pencil className="w-4 h-4 mr-2" />Edit Analysis</>
              : <><Plus className="w-4 h-4 mr-2" />Create Analysis</>
            }
          </Button>
        )}
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {analysis ? `Edit Analysis v${analysis.version}` : 'New Flip Analysis'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FlipAnalysisForm
              defaultValues={analysis ?? {}}
              isLoading={saveMutation.isPending}
              onSubmit={(data) => saveMutation.mutate(data)}
              onCancel={() => setEditing(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FlipAnalysisPanel analysis={analysis} />

          <Card>
            <CardHeader><CardTitle className="text-base">Profit Distribution</CardTitle></CardHeader>
            <CardContent>
              {projectInvestors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No investors linked yet.</p>
              ) : (
                <div className="space-y-2">
                  {projectInvestors.map((pi) => (
                    <div key={pi.id} className="flex justify-between text-sm border-b pb-1 last:border-0">
                      <span>{pi.investor?.name ?? '--'} ({pi.profit_split_percentage ?? pi.ownership_percentage ?? 0}%)</span>
                      <span className="font-medium">
                        {formatCurrency(calcInvestorReturn({ profit_neto, equity_pct: pi.profit_split_percentage ?? pi.ownership_percentage ?? 0 }))}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold pt-1 border-t mt-1">
                    <span>Total Net</span>
                    <span>{formatCurrency(profit_neto)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
