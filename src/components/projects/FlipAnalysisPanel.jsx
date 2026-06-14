import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, calcProfitGross, calcProfitNeto, calcBalanceDue } from '@/lib/projectsApi';

function Field({ label, value, highlight }) {
  return (
    <div className={`flex justify-between py-1.5 border-b last:border-0 ${highlight ? 'font-semibold' : ''}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{formatCurrency(value)}</span>
    </div>
  );
}

export default function FlipAnalysisPanel({ analysis }) {
  if (!analysis) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Flip Analysis</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No flip analysis record yet. Create one to see projections.</p>
        </CardContent>
      </Card>
    );
  }

  const balance_due   = calcBalanceDue(analysis);
  const profit_gross  = calcProfitGross(analysis);
  const profit_neto   = calcProfitNeto({ profit_gross, ...analysis });
  const roi_pct       = analysis.purchase_price
    ? ((profit_neto / analysis.purchase_price) * 100).toFixed(1)
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-base">Flip Analysis</CardTitle>
          {analysis.version && (
            <span className="text-xs text-muted-foreground">v{analysis.version}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="Purchase Price"   value={analysis.purchase_price} />
        <Field label="ARV"              value={analysis.arv} />
        <Field label="Loan Amount"      value={analysis.loan_amount} />
        <Field label="Holdback"         value={analysis.holdback} />
        <Field label="Earnest Money"    value={analysis.earnest_money} />
        <Field label="Closing Costs"    value={analysis.closing_costs} />
        <Field label="Reno Budget"      value={analysis.renovation_budget} />
        <Field label="Commission"       value={analysis.arv ? analysis.arv * ((analysis.commission_pct ?? 6) / 100) : null} />

        <div className="border-t pt-3 space-y-1">
          <Field label="Balance Due"    value={balance_due}  highlight />
          <Field label="Gross Profit"   value={profit_gross} highlight />
          <Field label="Net Profit"     value={profit_neto}  highlight />
          {roi_pct && (
            <div className="flex justify-between pt-1">
              <span className="text-sm font-semibold text-muted-foreground">ROI</span>
              <span className="text-sm font-semibold">{roi_pct}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
