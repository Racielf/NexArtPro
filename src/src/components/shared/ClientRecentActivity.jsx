import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Receipt, Clock } from 'lucide-react';
import { format } from 'date-fns';

/**
 * ClientRecentActivity — shows recent proposals, invoices, work orders
 * Compact list designed for sidebar/panel use
 */
export default function ClientRecentActivity({ clientId, limit = 5 }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    loadRecentActivity();
  }, [clientId]);

  const loadRecentActivity = async () => {
    setLoading(true);
    try {
      const [proposals, invoices] = await Promise.all([
        base44.entities.Proposal.filter({ client_id: clientId }, '-created_date', 20),
        base44.entities.Invoice.filter({ client_id: clientId }, '-created_date', 20),
      ]);

      // Merge and sort by date
      const items = [
        ...proposals.map(p => ({
          id: p.id,
          type: 'proposal',
          label: `Proposal #${p.proposal_number}`,
          date: p.created_date,
          status: p.status,
          amount: p.total_amount,
        })),
        ...invoices.map(i => ({
          id: i.id,
          type: 'invoice',
          label: `Invoice #${i.invoice_number}`,
          date: i.created_date,
          status: i.status,
          amount: i.total,
        })),
      ];

      items.sort((a, b) => new Date(b.date) - new Date(a.date));
      setActivities(items.slice(0, limit));
    } catch (err) {
      console.error('[ClientRecentActivity] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!activities.length) {
    return (
      <p className="text-xs text-slate-400">
        {loading ? 'Loading activity...' : 'No recent activity'}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {activities.map(item => {
        const Icon = item.type === 'proposal' ? FileText : Receipt;
        const statusColor = item.status === 'approved' || item.status === 'paid' 
          ? 'text-green-600' 
          : item.status === 'rejected' || item.status === 'cancelled'
          ? 'text-red-600'
          : 'text-slate-500';

        return (
          <div key={`${item.type}-${item.id}`} className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-slate-50 transition-colors">
            <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-slate-700 truncate">{item.label}</p>
              <p className="text-[10px] text-slate-400">
                {item.date ? format(new Date(item.date), 'MMM d') : '—'}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              {item.amount && (
                <p className="text-slate-700 font-medium">${item.amount.toLocaleString()}</p>
              )}
              <p className={`text-[10px] ${statusColor}`}>{item.status}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}