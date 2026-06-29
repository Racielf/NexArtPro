import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProjectFinancialSummary from '@/components/projects/ProjectFinancialSummary';
import { buildFinancialSummary, formatCurrency } from '@/lib/financialsApi';
import { nexartClient } from '@/api/nexartClient';

function KpiChip({ label, value, highlight }) {
  return (
    <div className={`rounded-lg border px-4 py-3 flex flex-col gap-0.5 ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-background border-border'}`}>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`text-lg font-bold font-display ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

export default function ProjectOverview() {
  const { project } = useOutletContext();

  const { data: analyses = [] } = useQuery({
    queryKey: ['flip-analyses', project.id],
    queryFn: () => nexartClient.entities.FlipAnalysis.filter(
      { project_id: project.id }, '-version', 1
    ),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(project.id),
  });

  const analysis = analyses[0] ?? null;
  const { profit_gross = 0, profit_neto = 0, balance_due = 0 } =
    analysis ? buildFinancialSummary(analysis) : {};

  return (
    <div className="space-y-5 max-w-4xl">
      {analysis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiChip label="ARV"          value={formatCurrency(analysis.arv)} />
          <KpiChip label="Balance Due"  value={formatCurrency(balance_due)} />
          <KpiChip label="Gross Profit" value={formatCurrency(profit_gross)} highlight />
          <KpiChip label="Net Profit"   value={formatCurrency(profit_neto)}  highlight />
        </div>
      )}

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
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-border/40 pb-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
