import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Loader2, Link2 } from 'lucide-react';
import { formatCurrency } from '@/lib/projectsApi';
import { nexartClient } from '@/api/nexartClient';

// Expense types that map to "materials" in the flip analysis
const MATERIAL_TYPES = new Set(['materials']);

function expenseCategory(expenseType) {
  return MATERIAL_TYPES.has(expenseType) ? 'materials' : 'services';
}

export default function ProjectWOCosts({ projectId, onSync, syncLoading }) {
  // Step 1: fetch WOs linked to this project
  const { data: workOrders = [], isLoading: loadingWOs } = useQuery({
    queryKey: ['project-work-orders', projectId],
    queryFn: () =>
      nexartClient.entities.WorkOrder.filter(
        { project_id: projectId },
        '-created_date',
        100,
        'id, title, status, total_cost, work_order_number'
      ),
    staleTime: 1000 * 60 * 2,
    enabled: Boolean(projectId),
  });

  const woIds = workOrders.map((wo) => wo.id);

  // Step 2: fetch all expenses for those WOs in one query
  const { data: allExpenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['project-wo-expenses', projectId, woIds.join(',')],
    queryFn: () =>
      woIds.length === 0
        ? []
        : nexartClient.entities.WorkOrderExpense.filter(
            { work_order_id: { $in: woIds } },
            '-created_date',
            5000,
            'id, work_order_id, expense_type, amount, description'
          ),
    staleTime: 1000 * 60 * 2,
    enabled: woIds.length > 0,
  });

  const isLoading = loadingWOs || (woIds.length > 0 && loadingExpenses);

  // Aggregate expenses into materials / services buckets
  const totals = allExpenses.reduce(
    (acc, exp) => {
      const cat = expenseCategory(exp.expense_type);
      acc[cat] += parseFloat(exp.amount) || 0;
      return acc;
    },
    { materials: 0, services: 0 }
  );

  // Per-WO breakdown
  const woBreakdown = workOrders.map((wo) => {
    const woExp = allExpenses.filter((e) => e.work_order_id === wo.id);
    const materials = woExp.filter((e) => expenseCategory(e.expense_type) === 'materials')
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const services = woExp.filter((e) => expenseCategory(e.expense_type) === 'services')
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    return { ...wo, materials, services, total: materials + services };
  });

  const grandTotal = totals.materials + totals.services;

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Actuals from Work Orders</CardTitle></CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (workOrders.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Actuals from Work Orders</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Link2 className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No work orders linked yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Open a Work Order and select this project in the <strong>Job Details</strong> card.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Actuals from Work Orders</CardTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={syncLoading || grandTotal === 0}
            onClick={() => onSync?.({ actual_materials: totals.materials, actual_services: totals.services })}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
            Sync to Analysis
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Pulls <strong>Materials</strong> and <strong>Services</strong> from linked WO expenses.
          Labor from time entries is tracked separately.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary totals */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Materials</p>
            <p className="text-base font-bold text-foreground">{formatCurrency(totals.materials)}</p>
          </div>
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Services</p>
            <p className="text-base font-bold text-foreground">{formatCurrency(totals.services)}</p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total</p>
            <p className="text-base font-bold text-primary">{formatCurrency(grandTotal)}</p>
          </div>
        </div>

        {/* Per-WO breakdown */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Work Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Materials</TableHead>
              <TableHead className="text-right">Services</TableHead>
              <TableHead className="text-right">WO Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {woBreakdown.map((wo) => (
              <TableRow key={wo.id}>
                <TableCell className="font-medium text-sm">
                  <span className="font-mono text-xs text-muted-foreground mr-1">{wo.work_order_number}</span>
                  {wo.title}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] capitalize">{wo.status}</Badge>
                </TableCell>
                <TableCell className="text-right text-sm">{formatCurrency(wo.materials)}</TableCell>
                <TableCell className="text-right text-sm">{formatCurrency(wo.services)}</TableCell>
                <TableCell className="text-right text-sm font-semibold">{formatCurrency(wo.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
