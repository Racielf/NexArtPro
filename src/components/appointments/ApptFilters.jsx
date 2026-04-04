import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'on_the_way', label: 'On The Way' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
  { value: 'follow_up_needed', label: 'Follow-up Needed' },
];

const DATE_OPTIONS = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

export default function ApptFilters({ filters, onChange, onClear }) {
  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.dateRange !== 'all' || filters.assignedTo;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <Input
          placeholder="Search by customer, address, phone, service..."
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className="pl-8 h-8 text-sm"
        />
      </div>

      <Select value={filters.status} onValueChange={v => onChange({ ...filters, status: v })}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.dateRange} onValueChange={v => onChange({ ...filters, dateRange: v })}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder="Date" />
        </SelectTrigger>
        <SelectContent>
          {DATE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Input
        placeholder="Assigned to..."
        value={filters.assignedTo}
        onChange={e => onChange({ ...filters, assignedTo: e.target.value })}
        className="h-8 w-32 text-xs"
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800">
          <X className="w-3.5 h-3.5 mr-1" />Clear
        </Button>
      )}
    </div>
  );
}