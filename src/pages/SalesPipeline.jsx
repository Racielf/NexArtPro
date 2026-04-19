import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search, Loader2, LayoutGrid, List } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import SalesPipelineColumn from '@/components/sales/SalesPipelineColumn';
import SalesEstimateCard from '@/components/sales/SalesEstimateCard';
import SalesFollowUpBar from '@/components/sales/SalesFollowUpBar';
import ProposalPipelineCard from '@/components/proposals/ProposalPipelineCard';
import ProposalReminderBar from '@/components/proposals/ProposalReminderBar';
import { computeProposalReminders } from '@/lib/proposalReminders';
import {
  PIPELINE_STAGES,
  PIPELINE_FILTERS,
  groupByStage,
  applyPipelineFilter,
  computeFollowUpSummary,
  deriveSalesStage,
} from '@/lib/salesPipeline';

// Map proposal status → pipeline stage
const PROPOSAL_STATUS_TO_STAGE = {
  draft:                   'lead',
  review_needed:           'lead',
  sent:                    'presented',
  approved:                'won',
  accepted:                'won',
  rejected:                'lost',
  converted_to_invoice:    'converted',
  converted_to_work_order: 'converted',
  pending_adjustment:      'negotiation',
};

function deriveProposalStage(proposal) {
  return PROPOSAL_STATUS_TO_STAGE[proposal.status] || 'lead';
}

export default function SalesPipeline() {
  const [estimates, setEstimates] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState('board'); // board | list

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [estData, propData] = await Promise.all([
      base44.entities.Estimate.list('-created_date', 200),
      base44.entities.Proposal.list('-created_date', 200),
    ]);
    setEstimates(estData);
    setProposals(propData);
    setLoading(false);
  };

  // Tag each item so downstream can render the right card
  const taggedEstimates = estimates.map(e => ({ ...e, _type: 'estimate' }));
  const taggedProposals = proposals.map(p => ({ ...p, _type: 'proposal' }));
  const allItems = [...taggedEstimates, ...taggedProposals];

  // Search filter (proposals use proposal_number, estimates use estimate_number)
  const searchFiltered = allItems.filter(e =>
    !search ||
    e.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(e.estimate_number || e.proposal_number || '').includes(search) ||
    e.title?.toLowerCase().includes(search.toLowerCase())
  );

  // For proposals, override stage derivation
  const getStage = (item) => item._type === 'proposal' ? deriveProposalStage(item) : deriveSalesStage(item);

  // Custom grouping that handles both types
  const grouped = (() => {
    const groups = {};
    PIPELINE_STAGES.forEach(s => { groups[s.key] = []; });
    searchFiltered.forEach(item => {
      // Apply activeFilter
      if (activeFilter === 'needs_follow_up') {
        const nfo = item.next_follow_up_at;
        const isOverdue = nfo && new Date(nfo) < new Date();
          // For both: overdue follow-up or no follow-up but stale sent
        const daysSinceSent = item.sent_at ? Math.floor((Date.now() - new Date(item.sent_at).getTime()) / 86400000) : null;
        const stale = daysSinceSent !== null && daysSinceSent >= 5 && ['sent'].includes(item.status);
        if (!isOverdue && !stale) return;
      } else if (activeFilter !== 'all') {
        const stage = getStage(item);
        if (stage !== activeFilter) return;
      }
      const stage = getStage(item);
      if (groups[stage]) groups[stage].push(item);
      else groups.lead.push(item);
    });
    return groups;
  })();

  // Flat filtered list for list view
  const filtered = searchFiltered.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'needs_follow_up') {
      const nfo = item.next_follow_up_at;
      const isOverdue = nfo && new Date(nfo) < new Date();
      const daysSinceSent = item.sent_at ? Math.floor((Date.now() - new Date(item.sent_at).getTime()) / 86400000) : null;
      const stale = daysSinceSent !== null && daysSinceSent >= 5 && item.status === 'sent';
      return isOverdue || stale;
    }
    return getStage(item) === activeFilter;
  });

  // Follow-up summary — include both estimates and proposals
  const followUpSummary = computeFollowUpSummary(allItems);

  // Proposal-specific reminders
  const proposalReminders = computeProposalReminders(proposals);

  // Pipeline totals (estimates use .total, proposals use .total_amount)
  const totalValue = allItems.reduce((s, e) => s + (e.total || e.total_amount || 0), 0);
  const wonValue = allItems
    .filter(e => getStage(e) === 'won' || getStage(e) === 'converted')
    .reduce((s, e) => s + (e.total || e.total_amount || 0), 0);

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
        subtitle={`${estimates.length} estimates · ${proposals.length} proposals · $${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} pipeline`}
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

          {/* Follow-up bar (estimates) */}
          <SalesFollowUpBar summary={followUpSummary} onFilterFollowUp={handleFilterFollowUp} />

          {/* Proposal reminder bar */}
          <ProposalReminderBar
            reminders={proposalReminders}
            onFilter={() => setActiveFilter('needs_follow_up')}
          />

          {/* Quick stats */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Showing <strong className="text-slate-700">{filtered.length}</strong> of {allItems.length}</span>
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
              <p className="font-medium">No items match this filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(item =>
                item._type === 'proposal'
                  ? <ProposalPipelineCard key={item.id} proposal={item} />
                  : <SalesEstimateCard key={item.id} estimate={item} />
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}