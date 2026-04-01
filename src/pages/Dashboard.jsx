import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import { 
  Calendar, FileText, ClipboardList, Receipt, 
  TrendingUp, Clock, CheckCircle, AlertCircle,
  ArrowRight, Plus
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState({ appointments: 0, estimates: 0, workOrders: 0, invoices: 0 });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [recentEstimates, setRecentEstimates] = useState([]);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const [appts, estimates, workOrders, invoices] = await Promise.all([
      base44.entities.Appointment.list('-created_date', 50),
      base44.entities.Estimate.list('-created_date', 10),
      base44.entities.WorkOrder.list('-created_date', 50),
      base44.entities.Invoice.list('-created_date', 50),
    ]);

    setTodayAppointments(appts.filter(a => a.scheduled_date === today));
    setRecentEstimates(estimates.slice(0, 5));
    setPendingInvoices(invoices.filter(i => i.status === 'sent' || i.status === 'overdue').slice(0, 5));
    setStats({
      appointments: appts.filter(a => a.status !== 'cancelled').length,
      estimates: estimates.length,
      workOrders: workOrders.length,
      revenue: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0),
    });
    setLoading(false);
  };

  const statCards = [
    { title: 'Total Appointments', value: stats.appointments, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', link: '/appointments' },
    { title: 'Estimates', value: stats.estimates, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', link: '/estimates' },
    { title: 'Work Orders', value: stats.workOrders, icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50', link: '/work-orders' },
    { title: 'Revenue Collected', value: `$${(stats.revenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', link: '/invoices' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/appointments"><Plus className="w-4 h-4 mr-1" />New Appointment</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/estimates"><Plus className="w-4 h-4 mr-1" />New Estimate</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.title} to={s.link}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{s.title}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today's Appointments</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/appointments" className="text-primary text-xs">View all <ArrowRight className="w-3 h-3 ml-1 inline" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
            ) : todayAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No appointments today</p>
                <Button asChild size="sm" className="mt-3">
                  <Link to="/appointments">Schedule one</Link>
                </Button>
              </div>
            ) : todayAppointments.map(appt => (
              <Link key={appt.id} to="/appointments">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{appt.client_name}</p>
                      <p className="text-xs text-muted-foreground">{appt.scheduled_time} · {appt.client_address}</p>
                    </div>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Estimates */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Estimates</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/estimates" className="text-primary text-xs">View all <ArrowRight className="w-3 h-3 ml-1 inline" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
            ) : recentEstimates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No estimates yet</p>
              </div>
            ) : recentEstimates.map(est => (
              <Link key={est.id} to="/estimates">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">#{est.estimate_number} · {est.client_name}</p>
                    <p className="text-xs text-muted-foreground">${(est.total || 0).toLocaleString()}</p>
                  </div>
                  <StatusBadge status={est.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pending Invoices */}
      {pendingInvoices.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <CardTitle className="text-base text-orange-700">Pending Invoices</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvoices.map(inv => (
              <Link key={inv.id} to="/invoices">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50">
                  <p className="text-sm font-medium">{inv.client_name} · ${(inv.total || 0).toLocaleString()}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}