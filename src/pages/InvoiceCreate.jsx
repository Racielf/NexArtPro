import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/layout/PageShell';
import { getNextDocumentNumber } from '@/lib/documentNumbering';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, FilePlus2, Plus, Receipt, Search, Trash2, UserPlus, XCircle, AlertCircle } from 'lucide-react';
import { filterActiveRecords } from '@/lib/softDelete';

function money(value) {
  return Number(value || 0);
}

function newItem() {
  return {
    id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
  };
}

const emptyClientForm = {
  full_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: 'OR',
  zip: '',
};

const formatClientAddress = (client) => {
  if (!client) return '';
  const line1 = client.address || '';
  const cityStateZip = [client.city, client.state, client.zip].filter(Boolean).join(', ').replace(', OR,', ', OR');
  return [line1, cityStateZip].filter(Boolean).join(', ');
};

const getClientDisplayName = (client) =>
  client.full_name || client.name || client.display_name || client.company_name || 'Unnamed Client';

const getClientSearchText = (client) =>
  [
    client.full_name,
    client.name,
    client.display_name,
    client.company_name,
    client.phone,
    client.email,
    client.address,
    client.city,
    client.state,
    client.zip,
  ].filter(Boolean).join(' ').toLowerCase();

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientMode, setClientMode] = useState('existing');
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [createAttempted, setCreateAttempted] = useState(false);
  const [form, setForm] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    title: '',
    due_date: '',
    tax_rate: 0,
    notes: '',
    payment_terms: 'Payment is due upon receipt unless otherwise agreed. Credit card payments may include processing fees when applicable.',
  });
  const [items, setItems] = useState([newItem()]);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const data = await base44.entities.Client.list('-created_date');
      setClients(filterActiveRecords(data || []));
    } catch (err) {
      console.warn('[InvoiceCreate] Client load failed:', err?.message);
      toast.error('Could not load clients');
    } finally {
      setLoadingClients(false);
    }
  };

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients.slice(0, 8);
    return clients.filter(client => getClientSearchText(client).includes(query)).slice(0, 10);
  }, [clients, clientSearch]);

  const selectedClient = clients.find(client => client.id === selectedClientId);

  const clearSelectedClient = () => {
    setSelectedClientId('');
    setClientSearch('');
    setForm(prev => ({
      ...prev,
      client_name: '',
      client_email: '',
      client_phone: '',
      client_address: '',
    }));
  };

  const applyClientToInvoice = (client) => {
    const address = formatClientAddress(client);
    setSelectedClientId(client.id);
    setClientMode('existing');
    setForm(prev => ({
      ...prev,
      client_name: getClientDisplayName(client),
      client_email: client.email || '',
      client_phone: client.phone || '',
      client_address: address,
    }));
  };

  const handleCreateInlineClient = async () => {
    if (!clientForm.full_name.trim()) {
      toast.error('Client name is required');
      return null;
    }
    if (!clientForm.phone.trim() && !clientForm.email.trim()) {
      toast.error('Add at least a phone or email for the client');
      return null;
    }

    const created = await base44.entities.Client.create({
      full_name: clientForm.full_name.trim(),
      email: clientForm.email.trim(),
      phone: clientForm.phone.trim(),
      address: clientForm.address.trim(),
      city: clientForm.city.trim(),
      state: clientForm.state.trim(),
      zip: clientForm.zip.trim(),
    });

    const nextClients = [created, ...clients];
    setClients(nextClients);
    setClientForm(emptyClientForm);
    applyClientToInvoice(created);
    toast.success('Client created and selected');
    return created;
  };

  const totals = useMemo(() => {
    const normalizedItems = items.map(item => {
      const quantity = money(item.quantity);
      const unit_price = money(item.unit_price);
      const line_total = quantity * unit_price;
      return {
        ...item,
        service_name: item.name,
        quantity,
        unit_price,
        line_total,
        total_price: line_total,
      };
    });
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.line_total, 0);
    const tax_rate = money(form.tax_rate);
    const tax_amount = subtotal * (tax_rate / 100);
    const total = subtotal + tax_amount;
    return { normalizedItems, subtotal, tax_rate, tax_amount, total };
  }, [items, form.tax_rate]);

  const validItems = useMemo(
    () => totals.normalizedItems.filter(item => item.service_name?.trim() && item.line_total > 0),
    [totals.normalizedItems]
  );

  const hasClient = Boolean(form.client_name.trim());
  const hasItems = validItems.length > 0;
  const hasTotal = totals.total > 0;
  const canCreate = hasClient && hasItems && !saving;

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const updateClientForm = (key, value) => setClientForm(prev => ({ ...prev, [key]: value }));
  const updateItem = (id, key, value) => setItems(prev => prev.map(item => item.id === id ? { ...item, [key]: value } : item));
  const removeItem = (id) => setItems(prev => prev.length === 1 ? prev : prev.filter(item => item.id !== id));

  const handleCreate = async () => {
    setCreateAttempted(true);

    if (clientMode === 'new' && !selectedClientId) {
      const createdClient = await handleCreateInlineClient();
      if (!createdClient) return;
    }

    if (!hasClient) {
      toast.error('Please select or create a client first');
      return;
    }

    if (!hasItems) {
      toast.error('Add at least one billable item with a service name and price');
      return;
    }

    setSaving(true);
    try {
      const invoice_number = await getNextDocumentNumber('invoice');
      const invoice = await base44.entities.Invoice.create({
        invoice_number,
        client_id: selectedClientId || '',
        client_name: form.client_name.trim(),
        client_email: form.client_email.trim(),
        client_phone: form.client_phone.trim(),
        client_address: form.client_address.trim(),
        title: form.title.trim() || `Invoice #${invoice_number}`,
        status: 'draft',
        due_date: form.due_date || '',
        line_items: validItems,
        groups: [{
          id: `group-${Date.now()}`,
          name: 'Services',
          items: validItems,
        }],
        subtotal: totals.subtotal,
        tax_rate: totals.tax_rate,
        tax_amount: totals.tax_amount,
        discount_type: 'fixed',
        discount_value: 0,
        discount_amount: 0,
        total: totals.total,
        amount_paid: 0,
        balance_due: totals.total,
        payment_status: 'unpaid',
        payments: [],
        notes: form.notes,
        payment_terms: form.payment_terms,
        company_id: 'rc-art',
      });

      toast.success(`Invoice #${invoice_number} created`);
      navigate(`/invoice-detail?id=${invoice.id}`);
    } catch (err) {
      toast.error(err?.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5]">
      <PageHeader
        title="Create Invoice"
        subtitle="Select an existing client or create one before billing."
        actionLabel="Back to Invoices"
        onAction={() => navigate('/invoices')}
      />
      <PageShell>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-5">

            {/* CLIENT SECTION */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  <div>
                    <h2 className="font-black text-slate-900">Billing Information</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Invoices should always be tied to a client record.</p>
                  </div>
                </div>
                {!selectedClientId && (
                  <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setClientMode('existing')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${clientMode === 'existing' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                      Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientMode('new')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${clientMode === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                      New Client
                    </button>
                  </div>
                )}
              </div>

              {/* Selected client card */}
              {selectedClient && (
                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-black text-sm">
                      {getClientDisplayName(selectedClient).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-blue-900 truncate">{getClientDisplayName(selectedClient)}</p>
                      <p className="text-xs text-blue-700 truncate">{selectedClient.phone || ''}{selectedClient.phone && selectedClient.email ? ' · ' : ''}{selectedClient.email || ''}</p>
                      {formatClientAddress(selectedClient) && (
                        <p className="text-xs text-blue-600 mt-0.5 truncate">{formatClientAddress(selectedClient)}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedClient}
                    className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-red-600 transition-colors flex-shrink-0 mt-0.5"
                  >
                    <XCircle className="w-4 h-4" />
                    Change Client
                  </button>
                </div>
              )}

              {!selectedClient && clientMode === 'existing' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      placeholder="Search by name, phone, email, address, city, ZIP..."
                      className="pl-9"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-slate-50">
                    {loadingClients ? (
                      <div className="px-4 py-6 text-sm text-slate-400 text-center">Loading clients...</div>
                    ) : filteredClients.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm font-semibold text-slate-700">No matching client found</p>
                        <button
                          type="button"
                          onClick={() => {
                            setClientMode('new');
                            setClientForm(prev => ({ ...prev, full_name: clientSearch }));
                          }}
                          className="mt-2 text-sm font-bold text-blue-600 hover:underline"
                        >
                          Create "{clientSearch || 'New Client'}"
                        </button>
                      </div>
                    ) : (
                      filteredClients.map(client => {
                        const active = selectedClientId === client.id;
                        return (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => applyClientToInvoice(client)}
                            className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${active ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'}`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              {active ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-black">{getClientDisplayName(client).charAt(0).toUpperCase()}</span>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-900 truncate">{getClientDisplayName(client)}</p>
                              <p className="text-xs text-slate-500 truncate">{client.phone || 'No phone'} · {client.email || 'No email'}</p>
                              {formatClientAddress(client) && <p className="text-xs text-slate-400 truncate mt-0.5">{formatClientAddress(client)}</p>}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {clientMode === 'new' && !selectedClient && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-700">
                      <UserPlus className="w-4 h-4" />
                      <p className="text-sm font-black">Create new client</p>
                    </div>
                    <button type="button" onClick={() => setClientMode('existing')} className="text-xs text-slate-500 hover:text-slate-700 underline">Back to search</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Full Name *"><Input value={clientForm.full_name} onChange={e => updateClientForm('full_name', e.target.value)} placeholder="Customer / company name" /></Field>
                    <Field label="Phone"><Input value={clientForm.phone} onChange={e => updateClientForm('phone', e.target.value)} placeholder="(503) 000-0000" /></Field>
                    <Field label="Email"><Input value={clientForm.email} onChange={e => updateClientForm('email', e.target.value)} placeholder="client@email.com" /></Field>
                    <Field label="Street Address"><Input value={clientForm.address} onChange={e => updateClientForm('address', e.target.value)} placeholder="Project / billing address" /></Field>
                    <Field label="City"><Input value={clientForm.city} onChange={e => updateClientForm('city', e.target.value)} placeholder="Portland" /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="State"><Input value={clientForm.state} onChange={e => updateClientForm('state', e.target.value)} placeholder="OR" /></Field>
                      <Field label="ZIP"><Input value={clientForm.zip} onChange={e => updateClientForm('zip', e.target.value)} placeholder="97201" /></Field>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={handleCreateInlineClient}>
                      <UserPlus className="w-4 h-4 mr-1" /> Save & Select Client
                    </Button>
                  </div>
                </div>
              )}

              {createAttempted && !hasClient && (
                <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> A client is required to create an invoice.</p>
              )}
            </div>

            {/* INVOICE DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h2 className="font-black text-slate-900">Invoice Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Client">
                  <Input value={form.client_name} onChange={e => updateForm('client_name', e.target.value)} placeholder="Select or create a client above" disabled={!!selectedClient} />
                </Field>
                <Field label="Invoice Title"><Input value={form.title} onChange={e => updateForm('title', e.target.value)} placeholder="e.g. Final painting invoice" /></Field>
                <Field label="Email"><Input value={form.client_email} onChange={e => updateForm('client_email', e.target.value)} placeholder="client@email.com" /></Field>
                <Field label="Phone"><Input value={form.client_phone} onChange={e => updateForm('client_phone', e.target.value)} placeholder="(503) 000-0000" /></Field>
                <Field label="Billing Address"><Input value={form.client_address} onChange={e => updateForm('client_address', e.target.value)} placeholder="Project / billing address" /></Field>
                <Field label="Due Date"><Input type="date" value={form.due_date} onChange={e => updateForm('due_date', e.target.value)} /></Field>
              </div>
            </div>

            {/* BILLABLE ITEMS */}
            <div className={`bg-white rounded-2xl border shadow-sm p-5 ${createAttempted && !hasItems ? 'border-red-300' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-black text-slate-900">Billable Items</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Simple invoice lines. Use estimates/work orders for detailed scope.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setItems(prev => [...prev, newItem()])}>
                  <Plus className="w-4 h-4 mr-1" /> Add Line
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => {
                  const lineTotal = money(item.quantity) * money(item.unit_price);
                  return (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_90px_120px_38px] gap-3 items-end">
                        <Field label={`Service ${idx + 1} *`}>
                          <Input value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} placeholder="Service name" />
                        </Field>
                        <Field label="Qty"><Input type="number" min="0" step="0.01" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} /></Field>
                        <Field label="Unit Price ($)"><Input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', e.target.value)} /></Field>
                        <button onClick={() => removeItem(item.id)} className="h-10 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <Input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Optional description" className="flex-1" />
                        <span className="text-sm font-bold text-slate-700 tabular-nums whitespace-nowrap">
                          Line total: <span className="text-blue-600">${lineTotal.toFixed(2)}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {createAttempted && !hasItems && (
                <p className="mt-3 text-xs font-semibold text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Add at least one billable item with a service name and price.</p>
              )}
            </div>

            {/* TAX / TERMS / NOTES */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tax Rate %"><Input type="number" min="0" step="0.01" value={form.tax_rate} onChange={e => updateForm('tax_rate', e.target.value)} /></Field>
              <Field label="Payment Terms"><Input value={form.payment_terms} onChange={e => updateForm('payment_terms', e.target.value)} /></Field>
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} placeholder="Optional customer-facing notes" className="w-full min-h-[90px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
          </div>

          {/* PREVIEW PANEL */}
          <div className="lg:sticky lg:top-6 h-fit bg-slate-950 text-white rounded-3xl shadow-2xl p-6 space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Invoice Preview</p>
              <h3 className="text-xl font-black mt-1 truncate">{form.client_name || 'Select Client'}</h3>
              <p className="text-sm text-slate-400 mt-0.5">{form.title || 'Manual invoice'}</p>
              {form.client_address && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{form.client_address}</p>}
              {form.due_date && <p className="text-xs text-slate-400 mt-1">Due: {form.due_date}</p>}
            </div>

            {/* Line items preview */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Billable Items</p>
              {validItems.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No billable items yet.</p>
              ) : (
                validItems.map(item => (
                  <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
                    <span className="text-slate-300 flex-1 truncate">{item.service_name} — {item.quantity} × ${money(item.unit_price).toFixed(2)}</span>
                    <span className="font-bold text-white tabular-nums flex-shrink-0">${item.line_total.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 rounded-2xl bg-white/5 border border-white/10 p-4">
              <Row label="Subtotal" value={money(totals.subtotal).toFixed(2)} />
              <Row label={`Tax (${money(totals.tax_rate).toFixed(2)}%)`} value={money(totals.tax_amount).toFixed(2)} />
              <div className="h-px bg-white/10" />
              <Row label="Total" value={money(totals.total).toFixed(2)} strong />
            </div>

            {form.payment_terms && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Payment Terms</p>
                <p className="text-xs text-slate-400 line-clamp-3">{form.payment_terms}</p>
              </div>
            )}

            {/* Readiness checklist */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Invoice Readiness</p>
              <ReadinessItem ok={hasClient} label="Client selected" />
              <ReadinessItem ok={hasItems} label="At least one billable item" />
              <ReadinessItem ok={hasTotal} label="Total greater than $0" />
              <ReadinessItem ok={Boolean(form.due_date)} label="Due date (optional)" optional />
            </div>

            <div className="space-y-2">
              <Button onClick={handleCreate} disabled={saving} className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black">
                <FilePlus2 className="w-4 h-4 mr-2" />
                {saving ? 'Creating...' : 'Create Invoice'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/invoices')} className="w-full h-11 rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Invoices
              </Button>
            </div>
          </div>
        </div>
      </PageShell>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">{label}</label>{children}</div>;
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={strong ? 'text-2xl font-black' : 'font-bold'}>${value}</span>
    </div>
  );
}

function ReadinessItem({ ok, label, optional }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
      ) : optional ? (
        <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
      )}
      <span className={`text-xs ${ok ? 'text-slate-300' : optional ? 'text-slate-500' : 'text-amber-300'}`}>{label}</span>
    </div>
  );
}