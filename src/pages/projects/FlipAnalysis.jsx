import React from 'react';
import { useOutletContext } from 'react-router-dom';
import FlipAnalysisPanel from '@/components/projects/FlipAnalysisPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildFinancialSummary } from '@/lib/financialsApi';
import { calcInvestorReturn, formatCurrency } from '@/lib/projectsApi';

export default function FlipAnalysis() {
  const { project } = useOutletContext();

  const analysis = null;
  const projectInvestors = [];

  const { profit_neto = 0 } = analysis ? buildFinancialSummary(analysis) : {};

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Flip Analysis</h2>
        <p className="text-sm text-muted-foreground">Projected and actual P&L for {project.name}.</p>
      </div>

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
                    <span>{pi.investor?.name ?? '--'} ({pi.equity_pct ?? 0}%)</span>
                    <span className="font-medium">
                      {formatCurrency(calcInvestorReturn({ profit_neto, equity_pct: pi.equity_pct ?? 0 }))}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold pt-1">
                  <span>Total</span>
                  <span>{formatCurrency(profit_neto)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
