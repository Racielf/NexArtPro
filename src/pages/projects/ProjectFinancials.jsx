import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ProjectFinancialSummary from '@/components/projects/ProjectFinancialSummary';

export default function ProjectFinancials() {
  // Phase 5: replace null with useQuery result for flip_analyses
  const { project } = useOutletContext();

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Financials</h2>
        <p className="text-sm text-muted-foreground">Cost breakdown and profit projections for {project.name}.</p>
      </div>
      <ProjectFinancialSummary analysis={null} />
    </div>
  );
}
