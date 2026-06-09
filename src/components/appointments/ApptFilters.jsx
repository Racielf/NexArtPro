import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Filter } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'on_the_way', label: 'On The Way' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'visit_completed', label: 'Completed' },
  { value: 'follow_up_needed', label: 'Follow-up Needed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

const DATE_OPTIONS = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

export default function ApptFilters({ filters, onChange, onClear }) {
  const set = (k, v) => onChange({ ...filters, [k]: v });

  const hasActive = filters.search || filters.status !== 'all' || filters.dateRange !== 'all' || filters.assignedTo;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 min-w-44">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          placeholder="Search appointments..."
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      <Select value={filters.status} onValueChange={v => set('status', v)}>
        <SelectTrigger className="h-8 w-40 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.dateRange} onValueChange={v => set('dateRange', v)}>
        <SelectTrigger className="h-8 w-36 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Input
        placeholder="Assigned to..."
        value={filters.assignedTo}
        onChange={e => set('assignedTo', e.target.value)}
        className="h-8 w-36 text-sm"
      />

      {hasActive && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 px-2 py-1.5 rounded hover:bg-red-50 transition-colors"
        >
          <X className="w-3 h-3" />Clear
        </button>
      )}
    </div>
  );
}