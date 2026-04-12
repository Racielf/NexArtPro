import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search, Loader2, LayoutGrid, List } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import SalesPipelineColumn from '@/components/sales/SalesPipelineColumn';
import SalesEstimateCard from '@/components/sales/SalesEstimateCard';
import SalesFollowUpBar from '@/components/sales/SalesFollowUpBar';
import {
  PIPELINE_STAGES,
  PIPELINE_FILTERS,
  groupByStage,
  applyPipelineFilter,
  computeFollowUpSummary,
  deriveSalesStage,
} from '@/lib/salesPipeline';

export default function SalesPipeline() {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState('board'); // board | list

  useEffect(() => {
    loadEstimates();
  }, []);

  const loadEstimates = async () => {
    setLoading(true);
    const data = await base44.entities.Estimate.list('-created_date', 200);
    setEstimates(data);
    setLoading(false);
  };

  // Search filter
  const searchFiltered = estimates.filter(e =>
    !search ||
    e.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(e.estimate_number).includes(search) ||
    e.title?.toLowerCase().includes(search.toLowerCase())
  );

  // Pipeline filter
  const filtered = applyPipelineFilter(searchFiltered, activeFilter);

  // Group for board view
  const grouped = groupByStage(filtered);

  // Follow-up summary (computed from ALL estimates, not filtered)
  const followUpSummary = computeFollowUpSummary(estimates);

  // Pipeline totals for header
  const totalValue = estimates.reduce((s, e) => s + (e.total || 0), 0);
  const wonValue = estimates
    .filter(e => deriveSalesStage(e) === 'won' || deriveSalesStage(e) === 'converted')
    .reduce((s, e) => s + (e.total || 0), 0);

  const handleFilterFollowUp = (category) => {
    setActiveFilter('needs_follow_up');
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Sales Pipeline" subtitle="Loading..." />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Sales Pipeline"
        subtitle={`${estimates.length} estimates · $${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} pipeline`}
      />

      <div className="px-6 pt-4 space-y-4 flex-1 flex flex-col min-h-0">

        {/* Top bar: search + filters + view toggle */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search client, number, title..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 flex-wrap">
              {PIPELINE_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                    activeFilter === f.key
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden ml-auto">
              <button
                onClick={() => setViewMode('board')}
                className={`p-1.5 transition-colors ${viewMode === 'board' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                title="Board view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Follow-up bar */}
          <SalesFollowUpBar summary={followUpSummary} onFilterFollowUp={handleFilterFollowUp} />

          {/* Quick stats */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Showing <strong className="text-slate-700">{filtered.length}</strong> of {estimates.length}</span>
            <span className="text-slate-300">|</span>
            <span>Won: <strong className="text-green-600">${wonValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
          </div>
        </div>

        {/* Board view */}
        {viewMode === 'board' ? (
          <div className="flex-1 overflow-x-auto min-h-0 pb-4">
            <div className="flex gap-3 h-full">
              {PIPELINE_STAGES.map(stage => (
                <SalesPipelineColumn
                  key={stage.key}
                  stage={stage}
                  estimates={grouped[stage.key] || []}
                />
              ))}
            </div>
          </div>
        ) : (
          /* List view */
          <div className="flex-1 overflow-y-auto min-h-0 pb-4">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="font-medium">No estimates match this filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(est => (
                  <SalesEstimateCard key={est.id} estimate={est} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}