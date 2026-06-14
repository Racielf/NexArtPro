import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import ProjectFinancialSummary from '@/components/projects/ProjectFinancialSummary';
import { nexartClient } from '@/api/nexartClient';

export default function ProjectFinancials() {
  const { project } = useOutletContext();

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['flip-analyses', project.id],
    queryFn: () => nexartClient.entities.FlipAnalysis.filter(
      { project_id: project.id }, '-version', 1
    ),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(project.id),
  });

  const analysis = analyses[0] ?? null;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Financials</h2>
        <p className="text-sm text-muted-foreground">Cost breakdown and profit projections for {project.name}.</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ProjectFinancialSummary analysis={analysis} />
      )}
    </div>
  );
}
