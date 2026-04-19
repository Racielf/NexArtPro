import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, AlertCircle, Check, Clock, DollarSign } from 'lucide-react';

/**
 * ClientCRMSummary — lightweight CRM context for proposal/estimate workflow
 * 
 * Displays:
 * - Total proposals / won / lost counts
 * - Invoices summary (collected vs pending)
 * - Commercial hints (repeat customer, price-sensitive, etc.)
 * - Recent activity timestamp
 */
export default function ClientCRMSummary({ clientId, clientName }) {
  const [stats, setStats] = useState(null);
  const [hints, setHints] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    loadCRMContext();
  }, [clientId]);

  const loadCRMContext = async () => {
    setLoading(true);
    try {
      // Fetch proposals + invoices in parallel
      const [proposals, invoices] = await Promise.all([
        base44.entities.Proposal.filter({ client_id: clientId }, '-created_date', 100),
        base44.entities.Invoice.filter({ client_id: clientId }, '-created_date', 100),
      ]);

      // Calculate stats
      const totalProposals = proposals.length;
      const wonProposals = proposals.filter(p => p.close_outcome === 'won').length;
      const lostProposals = proposals.filter(p => p.close_outcome === 'lost').length;
      const paidInvoices = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
      const pendingInvoices = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total || 0), 0);

      const recentProposal = proposals[0];
      const recentActivity = recentProposal?.created_date || null;

      setStats({
        totalProposals,
        wonProposals,
        lostProposals,
        paidInvoices,
        pendingInvoices,
        recentActivity,
      });

      // Derive commercial hints
      const derivedHints = [];

      // Repeat customer
      if (totalProposals > 1) {
        derivedHints.push({
          id: 'repeat',
          label: 'Repeat customer',
          type: 'positive',
          icon: TrendingUp,
        });
      }

      // High win rate
      if (wonProposals > 0 && totalProposals >= 2 && wonProposals / totalProposals > 0.5) {
        derivedHints.push({
          id: 'high_win',
          label: `${Math.round((wonProposals / totalProposals) * 100)}% win rate`,
          type: 'positive',
          icon: Check,
        });
      }

      // Multiple lost proposals
      if (lostProposals >= 2) {
        derivedHints.push({
          id: 'multiple_lost',
          label: `${lostProposals} lost proposals`,
          type: 'warning',
          icon: TrendingDown,
        });
      }

      // Active projects (pending invoices)
      if (pendingInvoices > 0) {
        derivedHints.push({
          id: 'active_project',
          label: 'Active project in progress',
          type: 'neutral',
          icon: Clock,
        });
      }

      // Price-sensitive (lost multiple due to price)
      const lostToPriceCount = proposals.filter(p => p.lost_reason === 'price_too_high').length;
      if (lostToPriceCount >= 2) {
        derivedHints.push({
          id: 'price_sensitive',
          label: 'Price-sensitive pattern',
          type: 'warning',
          icon: DollarSign,
        });
      }

      setHints(derivedHints);
    } catch (err) {
      console.error('[ClientCRMSummary] Error loading context:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!stats) {
    return (
      <div className="text-xs text-slate-400">
        {loading ? 'Loading CRM context...' : 'No CRM data'}
      </div>
    );
  }

  const winRate = stats.totalProposals > 0 
    ? Math.round((stats.wonProposals / stats.totalProposals) * 100)
    : 0;

  return (
    <div className="space-y-3 text-xs">
      {/* PROPOSAL STATS */}
      {stats.totalProposals > 0 && (
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
          <p className="font-semibold text-slate-700 mb-2 text-[10px] uppercase tracking-wide">Proposal History</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-slate-500">{stats.totalProposals}</p>
              <p className="text-[10px] text-slate-400">Total</p>
            </div>
            <div>
              <p className="text-green-600 font-semibold">{stats.wonProposals}</p>
              <p className="text-[10px] text-slate-400">Won</p>
            </div>
            <div>
              <p className="text-red-600 font-semibold">{stats.lostProposals}</p>
              <p className="text-[10px] text-slate-400">Lost</p>
            </div>
          </div>
          {winRate > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200">
              <p className="text-slate-600">
                <span className="font-semibold">{winRate}%</span> win rate
              </p>
            </div>
          )}
        </div>
      )}

      {/* INVOICE SUMMARY */}
      {(stats.paidInvoices > 0 || stats.pendingInvoices > 0) && (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <p className="font-semibold text-blue-900 mb-2 text-[10px] uppercase tracking-wide">Financials</p>
          <div className="space-y-1.5">
            {stats.paidInvoices > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Collected</span>
                <span className="font-semibold text-green-600">${stats.paidInvoices.toLocaleString()}</span>
              </div>
            )}
            {stats.pendingInvoices > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Pending</span>
                <span className="font-semibold text-orange-600">${stats.pendingInvoices.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMMERCIAL HINTS */}
      {hints.length > 0 && (
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 space-y-1.5">
          <p className="font-semibold text-amber-900 text-[10px] uppercase tracking-wide">Commercial Signals</p>
          {hints.map(hint => {
            const Icon = hint.icon;
            const iconColor = hint.type === 'positive' ? 'text-green-600' : hint.type === 'warning' ? 'text-amber-600' : 'text-slate-500';
            return (
              <div key={hint.id} className="flex items-center gap-2">
                <Icon className={`w-3 h-3 flex-shrink-0 ${iconColor}`} />
                <span className="text-slate-700">{hint.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}