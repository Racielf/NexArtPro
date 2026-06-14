import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FlipAnalysisPanel from '@/components/projects/FlipAnalysisPanel';
import ProjectFinancialSummary from '@/components/projects/ProjectFinancialSummary';
import { nexartClient } from '@/api/nexartClient';

export default function ProjectOverview() {
  const { project } = useOutletContext();

  // Shares cache with FlipAnalysis and ProjectFinancials tabs — no extra fetch
  const { data: analyses = [] } = useQuery({
    queryKey: ['flip-analyses', project.id],
    queryFn: () => nexartClient.entities.FlipAnalysis.filter(
      { project_id: project.id }, '-version', 1
    ),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(project.id),
  });

  const analysis = analyses[0] ?? null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Project Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Project #"   value={project.project_number} />
            <Row label="Address"     value={project.address || '—'} />
            <Row label="Status"      value={project.status} />
            <Row label="Responsible" value={project.responsible || '—'} />
            <Row label="Purchase"    value={project.purchase_date || '—'} />
          </CardContent>
        </Card>

        <ProjectFinancialSummary analysis={analysis} />
      </div>

      <FlipAnalysisPanel analysis={analysis} />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b pb-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
