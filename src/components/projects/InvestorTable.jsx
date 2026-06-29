import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/projectsApi';
import { calcInvestorReturn } from '@/lib/financialsApi';

const STATUS_DOT = {
  confirmed: 'bg-emerald-500',
  pending:   'bg-amber-500',
  cancelled: 'bg-slate-400',
};

const STATUS_CLS = {
  confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  pending:   'bg-amber-50 text-amber-800 border-amber-200',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
};

const ROLE_LABELS = {
  equity_partner:  'Equity Partner',
  lead_contractor: 'Lead Contractor',
  silent_partner:  'Silent Partner',
  other:           'Other',
};

export default function InvestorTable({ projectInvestors = [], profitNeto = 0 }) {
  if (!projectInvestors.length) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No investors linked to this project yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Investor</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Ownership %</TableHead>
          <TableHead className="text-right">Profit Split %</TableHead>
          <TableHead className="text-right">Est. Return</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projectInvestors.map((pi) => {
          const name       = pi.investor?.name ?? 'Unknown';
          const ownership  = pi.ownership_percentage ?? 0;
          const profitSplit = pi.profit_split_percentage ?? ownership;
          const estReturn  = calcInvestorReturn({ profit_neto: profitNeto, equity_pct: profitSplit });
          const status     = pi.status ?? 'pending';

          return (
            <TableRow key={pi.id}>
              <TableCell className="font-medium">{name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {ROLE_LABELS[pi.role] ?? (pi.role ?? '').replace(/_/g, ' ')}
              </TableCell>
              <TableCell className="text-right text-sm">
                {ownership != null ? `${ownership}%` : '—'}
              </TableCell>
              <TableCell className="text-right text-sm">
                {pi.profit_split_percentage != null ? `${pi.profit_split_percentage}%` : '—'}
              </TableCell>
              <TableCell className="text-right text-sm font-medium">
                {profitNeto ? formatCurrency(estReturn) : '—'}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-[11px] font-medium gap-1.5 ${STATUS_CLS[status] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[status] ?? 'bg-slate-400'}`} />
                  {status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                {pi.agreement_notes ?? ''}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
