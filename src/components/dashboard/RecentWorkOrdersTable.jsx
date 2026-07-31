import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '@/components/shared/StatusBadge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card, Empty } from './DashboardPrimitives';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
}
const AV_COLORS = ['#d97706', '#2563eb', '#059669', '#7c3aed', '#db2777', '#0891b2'];
function avColor(name = '') { return AV_COLORS[name.charCodeAt(0) % AV_COLORS.length]; }

export default function RecentWorkOrdersTable({ workOrders = [], loading }) {
  const rows = workOrders.slice(0, 8);
  return (
    <Card title="Recent Work Orders" icon={ClipboardList} link="/work-orders" linkLabel="Ver todas →" className="h-full">
      {loading
        ? <Empty text="Cargando…" />
        : rows.length === 0
          ? <Empty text="No hay work orders" sub="Crea el primero desde Work Orders" />
          : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">#</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Job</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Worker</TableHead>
                  <TableHead className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(wo => (
                  <TableRow key={wo.id} className="hover:bg-amber-50/30">
                    <TableCell className="py-3">
                      <Link to={`/work-orders/${wo.id}`} className="flex items-center gap-1.5 font-bold text-amber-600 hover:underline">
                        {wo.priority && <span className={`priority-dot priority-${wo.priority}`} />}
                        #{wo.work_order_number}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="font-semibold text-slate-700 truncate max-w-[140px]">{wo.client_name || '—'}</p>
                    </TableCell>
                    <TableCell className="py-3 hidden md:table-cell">
                      <p className="text-slate-500 truncate max-w-[180px]">{wo.title || '—'}</p>
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusBadge status={wo.status} />
                    </TableCell>
                    <TableCell className="py-3 hidden lg:table-cell">
                      {wo.assigned_worker_name ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                            style={{ background: avColor(wo.assigned_worker_name) }}
                          >
                            {initials(wo.assigned_worker_name)}
                          </span>
                          <p className="text-slate-500 truncate max-w-[90px]">{wo.assigned_worker_name}</p>
                        </div>
                      ) : (
                        <span className="text-amber-500 italic text-[10px]">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-3 hidden sm:table-cell">
                      <p className="text-slate-400 tabular-nums">{wo.scheduled_date ? format(new Date(wo.scheduled_date), 'MMM d') : '—'}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
      }
    </Card>
  );
}
