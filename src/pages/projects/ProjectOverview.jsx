import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FlipAnalysisPanel from '@/components/projects/FlipAnalysisPanel';
import ProjectFinancialSummary from '@/components/projects/ProjectFinancialSummary';

export default function ProjectOverview() {
  const { project } = useOutletContext();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Details card */}
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

        {/* Quick financial snapshot */}
        <ProjectFinancialSummary analysis={null} />
      </div>

      <FlipAnalysisPanel analysis={null} />
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
