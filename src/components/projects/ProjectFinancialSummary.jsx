import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/projectsApi';
import { buildFinancialSummary } from '@/lib/financialsApi';

function StatRow({ label, value, highlight = false }) {
  return (
    <div className={`flex justify-between items-center py-1.5 border-b last:border-0 ${highlight ? 'font-semibold' : ''}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm ${highlight ? 'text-foreground' : 'text-foreground'}`}>{formatCurrency(value)}</span>
    </div>
  );
}

export default function ProjectFinancialSummary({ analysis }) {
  if (!analysis) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Financial Summary</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No flip analysis on record yet.</p>
        </CardContent>
      </Card>
    );
  }

  const {
    commission_usd,
    profit_gross,
    profit_neto,
    balance_due,
    actual_total,
    budget_variance,
  } = buildFinancialSummary(analysis);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Financial Summary</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Acquisition</p>
          <StatRow label="Purchase Price"  value={analysis.purchase_price} />
          <StatRow label="Loan Amount"     value={analysis.loan_amount} />
          <StatRow label="Earnest Money"   value={analysis.earnest_money} />
          <StatRow label="Closing Costs"   value={analysis.closing_costs} />
          <StatRow label="Balance Due"     value={balance_due} highlight />
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Sale</p>
          <StatRow label="ARV"             value={analysis.arv} />
          <StatRow label={`Commission (${analysis.commission_pct ?? 6}%)`} value={commission_usd} />
          <StatRow label="Gross Profit"    value={profit_gross} highlight />
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Renovation</p>
          <StatRow label="Budget"          value={analysis.renovation_budget} />
          <StatRow label="Actual Total"    value={actual_total} />
          <StatRow label={`Variance`}      value={budget_variance} highlight />
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Net</p>
          <StatRow label="Labor"           value={analysis.actual_labor} />
          <StatRow label="Materials"       value={analysis.actual_materials} />
          <StatRow label="Services"        value={analysis.actual_services} />
          <StatRow label="Draws Received"  value={analysis.draws_received} />
          <StatRow label="Net Profit"      value={profit_neto} highlight />
        </div>
      </CardContent>
    </Card>
  );
}
