import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Hammer, Receipt, Inbox, DollarSign } from 'lucide-react';
import ClientPortalLogin from '@/components/client-portal/ClientPortalLogin';
import ClientPortalHeader from '@/components/client-portal/ClientPortalHeader';
import DocumentCard from '@/components/client-portal/DocumentCard';
import InvoiceViewModal from '@/components/client-portal/InvoiceViewModal';
import PaymentHistoryPanel from '@/components/client-portal/PaymentHistoryPanel';
import { toast } from 'sonner';

function normalizePhone(raw) {
  return (raw || '').replace(/\D/g, '').slice(-10);
}

export default function ClientPortal() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [client, setClient] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [estimates, setEstimates] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tab, setTab] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('client_portal_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      setClient(parsed);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (authed && client) loadDocuments();
  }, [authed, client]);

  const handleLogin = async ({ email, phone }) => {
    setLoginLoading(true);
    setLoginError(null);

    const customers = await base44.entities.Customer.filter({ email });
    const normalizedInput = normalizePhone(phone);
    const match = customers.find(c => normalizePhone(c.phone) === normalizedInput);

    if (!match) {
      const clients = await base44.entities.Client.filter({ email });
      const clientMatch = clients.find(c => normalizePhone(c.phone) === normalizedInput);
      if (!clientMatch) {
        setLoginError('No account found with that email and phone combination.');
        setLoginLoading(false);
        return;
      }
      const session = { id: clientMatch.id, name: clientMatch.full_name, email: clientMatch.email, phone: clientMatch.phone, entity: 'Client' };
      sessionStorage.setItem('client_portal_session', JSON.stringify(session));
      setClient(session);
      setAuthed(true);
      setLoginLoading(false);
      return;
    }

    const session = {
      id: match.id,
      name: match.display_name || `${match.first_name} ${match.last_name}`,
      email: match.email,
      phone: match.phone,
      entity: 'Customer',
    };
    sessionStorage.setItem('client_portal_session', JSON.stringify(session));
    setClient(session);
    setAuthed(true);
    setLoginLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('client_portal_session');
    setAuthed(false);
    setClient(null);
    setEstimates([]);
    setWorkOrders([]);
    setInvoices([]);
  };

  const loadDocuments = async () => {
    setLoading(true);
    const clientName = client.name;
    const [est, wo, inv] = await Promise.all([
      base44.entities.Estimate.filter({ client_name: clientName }, '-created_date', 50).catch(() => []),
      base44.entities.WorkOrder.filter({ client_name: clientName }, '-created_date', 50).catch(() => []),
      base44.entities.Invoice.filter({ client_name: clientName }, '-created_date', 50).catch(() => []),
    ]);
    setEstimates(est.filter(e => e.status !== 'draft'));
    setWorkOrders(wo.filter(w => w.status !== 'draft'));
    setInvoices(inv.filter(i => i.status !== 'draft'));
    setLoading(false);
  };

  const handleDocClick = (type, doc) => {
    if (type === 'estimate') {
      if (!doc.public_share_token) {
        toast.error('This estimate does not have an active public link yet.');
        return;
      }
      navigate(`/client-estimate?token=${doc.public_share_token}`);
    } else if (type === 'invoice') {
      setSelectedInvoice(doc);
    }
  };

  if (!authed) {
    return <ClientPortalLogin onLogin={handleLogin} loading={loginLoading} error={loginError} />;
  }

  const allDocs = [
    ...estimates.map(d => ({ ...d, _type: 'estimate' })),
    ...workOrders.map(d => ({ ...d, _type: 'work_order' })),
    ...invoices.map(d => ({ ...d, _type: 'invoice' })),
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const filtered = tab === 'all' ? allDocs
    : tab === 'estimates' ? allDocs.filter(d => d._type === 'estimate')
    : tab === 'work_orders' ? allDocs.filter(d => d._type === 'work_order')
    : tab === 'invoices' ? allDocs.filter(d => d._type === 'invoice')
    : [];

  const TABS = [
    { key: 'all', label: 'All', count: allDocs.length },
    { key: 'estimates', label: 'Estimates', icon: FileText, count: estimates.length },
    { key: 'work_orders', label: 'Work Orders', icon: Hammer, count: workOrders.length },
    { key: 'invoices', label: 'Invoices', icon: Receipt, count: invoices.length },
    { key: 'payments', label: 'Payments', icon: DollarSign, count: invoices.reduce((acc, i) => acc + (i.payments?.length || 0), 0) },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {selectedInvoice && (
        <InvoiceViewModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
      <ClientPortalHeader clientName={client.name} onLogout={handleLogout} />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <SummaryCard label="Estimates" count={estimates.length} icon={FileText} color="bg-blue-50 text-blue-600" />
          <SummaryCard label="Work Orders" count={workOrders.length} icon={Hammer} color="bg-purple-50 text-purple-600" />
          <SummaryCard label="Invoices" count={invoices.length} icon={Receipt} color="bg-emerald-50 text-emerald-600" />
        </div>

        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-6">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-colors ${tab === t.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-slate-100'}`}>{t.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : tab === 'payments' ? (
          <PaymentHistoryPanel invoices={invoices} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-500">No documents found</p>
            <p className="text-xs text-slate-400 mt-1">Documents will appear here once they're sent to you.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(doc => (
              <DocumentCard key={`${doc._type}-${doc.id}`} doc={doc} type={doc._type} onClick={() => handleDocClick(doc._type, doc)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, count, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{count}</p>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}
