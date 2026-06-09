import React, { useState, useEffect } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, Users, FileText, DollarSign } from 'lucide-react';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function ProfitabilityDashboard() {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');

  useEffect(() => {
    loadEstimates();
  }, [dateRange]);

  const loadEstimates = async () => {
    setLoading(true);
    try {
      // Fetch all estimates (filter in-memory)
      const allEstimates = await nexartClient.entities.Estimate.list('', 1000);
      
      // Filter by date range
      const days = parseInt(dateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const filtered = allEstimates.filter(est => {
        const createdDate = est.created_date ? new Date(est.created_date) : new Date(0);
        return createdDate >= cutoffDate;
      });

      setEstimates(filtered);
    } catch (err) {
      console.error('Failed to load estimates:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Calculate metrics ──
  const totalRevenue = estimates.reduce((sum, e) => sum + (parseFloat(e.total) || 0), 0);
  const totalEstimates = estimates.length;
  const avgMargin = estimates.length > 0
    ? estimates.reduce((sum, e) => sum + (parseFloat(e.gross_margin_pct) || 0), 0) / estimates.length
    : 0;

  // ── Employee ranking (assigned_to) ──
  const employeeMap = {};
  estimates.forEach(est => {
    const emp = est.assigned_to || 'Unassigned';
    if (!employeeMap[emp]) {
      employeeMap[emp] = { name: emp, count: 0, totalMargin: 0, estimates: [] };
    }
    employeeMap[emp].count += 1;
    employeeMap[emp].totalMargin += parseFloat(est.gross_margin_pct) || 0;
    employeeMap[emp].estimates.push(est);
  });

  const employeeRanking = Object.values(employeeMap)
    .map(emp => ({
      ...emp,
      avgMargin: emp.count > 0 ? emp.totalMargin / emp.count : 0,
    }))
    .sort((a, b) => (b.count + b.avgMargin / 100) - (a.count + a.avgMargin / 100));

  // ── Low margin estimates (< 25%) ──
  const lowMarginEstimates = estimates
    .filter(e => parseFloat(e.gross_margin_pct || 100) < 25)
    .sort((a, b) => parseFloat(a.gross_margin_pct) - parseFloat(b.gross_margin_pct));

  // ── Margin distribution chart ──
  const marginBuckets = {
    '0-10%': 0,
    '10-20%': 0,
    '20-30%': 0,
    '30-40%': 0,
    '40%+': 0,
  };
  estimates.forEach(est => {
    const m = parseFloat(est.gross_margin_pct || 0);
    if (m < 10) marginBuckets['0-10%'] += 1;
    else if (m < 20) marginBuckets['10-20%'] += 1;
    else if (m < 30) marginBuckets['20-30%'] += 1;
    else if (m < 40) marginBuckets['30-40%'] += 1;
    else marginBuckets['40%+'] += 1;
  });

  const marginChartData = Object.entries(marginBuckets).map(([range, count]) => ({
    range,
    count,
  }));

  // ── Status breakdown ──
  const statusMap = {};
  estimates.forEach(est => {
    const status = est.status || 'draft';
    statusMap[status] = (statusMap[status] || 0) + 1;
  });

  const statusChartData = Object.entries(statusMap).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  // ── Summary card ──
  const SummaryCard = ({ icon: Icon, label, value, accent }) => (
    <div className={`rounded-lg border p-4 ${accent}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium opacity-70">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-6 bg-slate-50 min-h-screen">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profitability Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Visual analysis of estimate data (last {dateRange} days)</p>
        </div>
        <select
          value={dateRange}
          onChange={e => setDateRange(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white hover:border-slate-400"
        >
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* ── KEY METRICS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={DollarSign}
          label="Total Revenue"
          value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
          accent="bg-white border-blue-200"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Avg Gross Margin"
          value={`${avgMargin.toFixed(1)}%`}
          accent={avgMargin >= 30 ? 'bg-white border-emerald-200' : avgMargin >= 25 ? 'bg-white border-amber-200' : 'bg-white border-red-200'}
        />
        <SummaryCard
          icon={FileText}
          label="Total Estimates"
          value={totalEstimates}
          accent="bg-white border-indigo-200"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Below 25% Margin"
          value={lowMarginEstimates.length}
          accent={lowMarginEstimates.length > 0 ? 'bg-white border-red-200' : 'bg-white border-slate-200'}
        />
      </div>

      {/* ── TWO-COLUMN CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Margin Distribution */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Margin Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={marginChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name} (${value})`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusChartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── EMPLOYEE RANKING ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900">Employee Ranking</h2>
        </div>
        <div className="space-y-2">
          {employeeRanking.length === 0 ? (
            <p className="text-xs text-slate-400">No data available</p>
          ) : (
            employeeRanking.map((emp, idx) => (
              <div key={emp.name} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{emp.name}</p>
                  <p className="text-xs text-slate-500">
                    {emp.count} estimate{emp.count !== 1 ? 's' : ''} · {emp.avgMargin.toFixed(1)}% avg margin
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs font-bold text-slate-900">${emp.estimates.reduce((s, e) => s + (parseFloat(e.total) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
                  <div className="text-[10px] text-slate-400">total sold</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── LOW MARGIN ALERTS ── */}
      {lowMarginEstimates.length > 0 && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-bold text-red-900">Critical: Estimates Below 25% Margin</h2>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {lowMarginEstimates.map(est => (
              <div key={est.id} className="flex items-center justify-between p-3 rounded bg-white border border-red-100">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Est. #{est.estimate_number} · {est.client_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {est.assigned_to || 'Unassigned'} · ${(parseFloat(est.total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                    parseFloat(est.gross_margin_pct) < 15 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {(parseFloat(est.gross_margin_pct) || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}