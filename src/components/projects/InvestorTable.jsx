import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/projectsApi';
import { calcInvestorReturn } from '@/lib/financialsApi';

const STATUS_COLOR = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  void:      'bg-gray-100 text-gray-500',
};

export default function InvestorTable({ projectInvestors = [], profitNeto = 0 }) {
  if (!projectInvestors.length) {
    return <p className="text-sm text-muted-foreground py-4">No investors linked to this project yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Investor</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Equity %</TableHead>
          <TableHead className="text-right">Est. Return</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projectInvestors.map((pi) => {
          const name = pi.investor?.name ?? '—';
          const type = pi.investor?.type ?? '—';
          const estReturn = calcInvestorReturn({ profit_neto: profitNeto, equity_pct: pi.equity_pct ?? 0 });

          return (
            <TableRow key={pi.id}>
              <TableCell className="font-medium">{name}</TableCell>
              <TableCell className="capitalize">{type}</TableCell>
              <TableCell className="text-right">{pi.equity_pct != null ? `${pi.equity_pct}%` : '—'}</TableCell>
              <TableCell className="text-right">{profitNeto ? formatCurrency(estReturn) : '—'}</TableCell>
              <TableCell>
                <Badge className={STATUS_COLOR[pi.status] ?? 'bg-gray-100 text-gray-700'}>
                  {pi.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">{pi.notes ?? ''}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
