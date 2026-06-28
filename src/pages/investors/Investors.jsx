import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Loader2, Handshake, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { nexartClient } from '@/api/nexartClient';

const TYPE_LABELS = {
  individual:  'Individual',
  llc:         'LLC',
  corporation: 'Corp',
  trust:       'Trust',
  fund:        'Fund',
  person:      'Individual',
  company:     'LLC / Company',
};

const STATUS_COLOR = {
  lead:     'bg-yellow-100 text-yellow-800',
  active:   'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-500',
};

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function Investors() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: investors = [], isLoading, isError } = useQuery({
    queryKey: ['investors'],
    queryFn: () => nexartClient.entities.Investor.list('-created_at', 200),
    staleTime: 1000 * 60 * 2,
  });

  const filtered = investors.filter((inv) => {
    const q = search.toLowerCase();
    return (
      !q ||
      inv.name?.toLowerCase().includes(q) ||
      inv.email?.toLowerCase().includes(q) ||
      inv.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-display">Investors</h1>
          <p className="text-sm text-muted-foreground">
            Capital partners and equity investors for your flip projects.
          </p>
        </div>
        <Button onClick={() => navigate('/investors/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Investor
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive py-8 text-center">
          Failed to load investors.
        </p>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Handshake className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground max-w-xs">
            {search
              ? 'No investors match your search.'
              : 'No investors yet. Add your first capital partner.'}
          </p>
          {!search && (
            <Button className="mt-4" onClick={() => navigate('/investors/new')}>
              <Plus className="w-4 h-4 mr-2" />
              New Investor
            </Button>
          )}
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((inv) => (
            <InvestorCard key={inv.id} investor={inv} />
          ))}
        </div>
      )}
    </div>
  );
}

function InvestorCard({ investor }) {
  const navigate = useNavigate();
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/investors/${investor.id}`)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold truncate">{investor.name}</p>
            <p className="text-xs text-muted-foreground">
              {TYPE_LABELS[investor.investor_type ?? investor.type] ?? investor.investor_type ?? investor.type}
              {investor.investment_company && ` · ${investor.investment_company}`}
            </p>
          </div>
          <Badge className={STATUS_COLOR[investor.status] ?? ''}>
            {investor.status}
          </Badge>
        </div>

        {investor.estimated_capital > 0 && (
          <p className="text-sm font-medium text-foreground">
            {fmt.format(investor.estimated_capital)}
            <span className="text-xs font-normal text-muted-foreground ml-1">available</span>
          </p>
        )}

        <div className="text-sm space-y-1">
          {investor.phone && (
            <p className="text-muted-foreground truncate">{investor.phone}</p>
          )}
          {investor.email && (
            <p className="text-muted-foreground truncate">{investor.email}</p>
          )}
          {!investor.phone && !investor.email && (
            <p className="text-muted-foreground italic text-xs">No contact info</p>
          )}
        </div>

        {(investor.return_preference || investor.time_horizon) && (
          <div className="flex flex-wrap gap-1 pt-1">
            {investor.return_preference && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                {investor.return_preference === 'equity' ? 'Equity' : 'Fixed Rate'}
              </span>
            )}
            {investor.time_horizon && (
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                {investor.time_horizon === 'short_term' ? '6-12m' : investor.time_horizon === 'mid_term' ? '12-24m' : '24m+'}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
