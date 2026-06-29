import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import ProjectFinancialSummary from '@/components/projects/ProjectFinancialSummary';
import ProjectWOCosts from '@/components/projects/ProjectWOCosts';
import { nexartClient } from '@/api/nexartClient';

export default function ProjectFinancials() {
  const { project } = useOutletContext();
  const queryClient = useQueryClient();

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['flip-analyses', project.id],
    queryFn: () => nexartClient.entities.FlipAnalysis.filter(
      { project_id: project.id }, '-version', 1
    ),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(project.id),
  });

  const analysis = analyses[0] ?? null;

  const syncMutation = useMutation({
    mutationFn: ({ actual_materials, actual_services }) => {
      if (!analysis) {
        throw new Error('Create a Flip Analysis first (Flip Analysis tab).');
      }
      return nexartClient.entities.FlipAnalysis.update(analysis.id, {
        actual_materials,
        actual_services,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flip-analyses', project.id] });
      toast.success('Actuals synced to Flip Analysis.');
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold font-display">Financials</h2>
        <p className="text-sm text-muted-foreground">
          Cost projections and actuals from work orders for {project.name}.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          <ProjectFinancialSummary analysis={analysis} />

          <ProjectWOCosts
            projectId={project.id}
            onSync={(actuals) => syncMutation.mutate(actuals)}
            syncLoading={syncMutation.isPending}
          />
        </div>
      )}
    </div>
  );
}
