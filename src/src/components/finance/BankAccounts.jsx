import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Landmark, Plus, Pencil, Trash2, CreditCard,
  CheckCircle2, Search, Filter, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['materials', 'payroll', 'fuel', 'subcontractors', 'office_admin', 'miscellaneous', 'service_income', 'deposit', 'other'];
const ACCOUNT_TYPES = ['checking', 'savings', 'credit_card', 'line_of_credit'];

const CATEGORY_COLORS = {
  materials: 'bg-blue-100 text-blue-700',
  payroll: 'bg-purple-100 text-purple-700',
  fuel: 'bg-orange-100 text-orange-700',
  subcontractors: 'bg-amber-100 text-amber-700',
  office_admin: 'bg-slate-100 text-slate-700',
  miscellaneous: 'bg-gray-100 text-gray-600',
  service_income: 'bg-green-100 text-green-700',
  deposit: 'bg-emerald-100 text-emerald-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function BankAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAccount, setActiveAccount] = useState(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const [accountForm, setAccountForm] = useState({ bank_name: '', account_name: '', account_type: 'checking', account_number_last4: '', current_balance: '', notes: '' });
  const [txForm, setTxForm] = useState({ date: '', description: '', amount: '', type: 'expense', category: 'miscellaneous', notes: '', related_work_order_id: '', related_customer_id: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [accs, txs, wos, custs] = await Promise.all([
      base44.entities.BankAccount.list('-created_date'),
      base44.entities.BankTransaction.list('-date', 200),
      base44.entities.WorkOrder.list('-created_date', 100),
      base44.entities.Customer.list('-created_date', 100),
    ]);
    setAccounts(accs);
    setTransactions(txs);
    setWorkOrders(wos);
    setCustomers(custs);
    if (accs.length > 0 && !activeAccount) setActiveAccount(accs[0].id);
    setLoading(false);
  };

  const saveAccount = async () => {
    const data = { ...accountForm, current_balance: parseFloat(accountForm.current_balance) || 0 };
    await base44.entities.BankAccount.create(data);
    toast.success('Account connected');
    setShowAccountForm(false);
    setAccountForm({ bank_name: '', account_name: '', account_type: 'checking', account_number_last4: '', current_balance: '', notes: '' });
    loadData();
  };

  const deleteAccount = async (id) => {
    if (!confirm('Delete this account?')) return;
    await base44.entities.BankAccount.delete(id);
    toast.success('Account removed');
    setActiveAccount(null);
    loadData();
  };

  const saveTx = async () => {
    const data = {
      ...txForm,
      bank_account_id: activeAccount,
      bank_account_name: accounts.find(a => a.id === activeAccount)?.bank_name || '',
      amount: parseFloat(txForm.amount) || 0,
    };
    if (txForm.related_work_order_id) {
      const wo = workOrders.find(w => w.id === txForm.related_work_order_id);
      if (wo) { data.related_work_order_number = wo.work_order_number; }
    }
    if (txForm.related_customer_id) {
      const cu = customers.find(c => c.id === txForm.related_customer_id);
      if (cu) { data.related_customer_name = cu.display_name || `${cu.first_name} ${cu.last_name}`; }
    }
    if (editingTx) {
      await base44.entities.BankTransaction.update(editingTx.id, data);
      toast.success('Transaction updated');
    } else {
      await base44.entities.BankTransaction.create(data);
      toast.success('Transaction added');
    }
    setShowTxForm(false);
    setEditingTx(null);
    setTxForm({ date: '', description: '', amount: '', type: 'expense', category: 'miscellaneous', notes: '', related_work_order_id: '', related_customer_id: '' });
    loadData();
  };

  const openEditTx = (tx) => {
    setEditingTx(tx);
    setTxForm({ ...tx, amount: String(tx.amount) });
    setShowTxForm(true);
  };

  const deleteTx = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    await base44.entities.BankTransaction.delete(id);
    toast.success('Transaction deleted');
    loadData();
  };

  const toggleReviewed = async (tx) => {
    await base44.entities.BankTransaction.update(tx.id, { is_reviewed: !tx.is_reviewed });
    loadData();
  };

  const accountTxs = transactions.filter(t => t.bank_account_id === activeAccount);
  const filtered = accountTxs.filter(t => {
    const matchSearch = t.description?.toLowerCase().includes(search.toLowerCase()) || t.notes?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || t.type === filterType;
    const matchCat = filterCategory === 'all' || t.category === filterCategory;
    return matchSearch && matchType && matchCat;
  });

  const totalIncome = accountTxs.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = accountTxs.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const currentAccount = accounts.find(a => a.id === activeAccount);

  return (
    <div className="space-y-5">

      {/* Accounts Strip */}
      <div className="flex items-center gap-3 flex-wrap">
        {accounts.map(acc => (
          <button
            key={acc.id}
            onClick={() => setActiveAccount(acc.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
              activeAccount === acc.id
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white border-slate-200 text-slate-700 hover:border-primary/40 hover:shadow-sm'
            }`}
          >
            <Landmark className="w-4 h-4 flex-shrink-0" />
            <div className="text-left">
              <p className="text-xs font-semibold leading-tight">{acc.bank_name}</p>
              <p className={`text-xs leading-tight ${activeAccount === acc.id ? 'text-white/70' : 'text-slate-400'}`}>
                {acc.account_type} {acc.account_number_last4 ? `••${acc.account_number_last4}` : ''}
              </p>
            </div>
            <p className={`text-sm font-bold ml-2 ${activeAccount === acc.id ? 'text-white' : 'text-slate-900'}`}>
              ${(acc.current_balance || 0).toLocaleString()}
            </p>
          </button>
        ))}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAccountForm(true)}>
          <Plus className="w-4 h-4" /> Connect Bank
        </Button>
      </div>

      {accounts.length === 0 && !loading && (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl py-16 flex flex-col items-center text-slate-400">
          <Landmark className="w-10 h-10 mb-3" />
          <p className="font-medium text-slate-600 mb-1">No bank accounts connected</p>
          <p className="text-sm mb-4">Add your accounts to track transactions</p>
          <Button onClick={() => setShowAccountForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Connect Bank Account
          </Button>
        </div>
      )}

      {activeAccount && currentAccount && (
        <>
          {/* Account header + stats */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Landmark className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">{currentAccount.bank_name} — {currentAccount.account_name || currentAccount.account_type}</p>
                <p className="text-sm text-slate-400 capitalize">{currentAccount.account_type} account {currentAccount.account_number_last4 && `• ••${currentAccount.account_number_last4}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-center">
                <p className="text-xs text-slate-400">Balance</p>
                <p className="text-xl font-bold text-slate-900">${(currentAccount.current_balance || 0).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">In</p>
                <p className="text-lg font-bold text-green-600">+${totalIncome.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Out</p>
                <p className="text-lg font-bold text-red-500">-${totalExpense.toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => { setEditingTx(null); setTxForm({ date: '', description: '', amount: '', type: 'expense', category: 'miscellaneous', notes: '', related_work_order_id: '', related_customer_id: '' }); setShowTxForm(true); }}>
                  <Plus className="w-3.5 h-3.5" /> Transaction
                </Button>
                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => deleteAccount(activeAccount)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search transactions..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>

          {/* Transactions Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Date', 'Description', 'Category', 'Related', 'Amount', 'Reviewed', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <CreditCard className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400">No transactions found</p>
                    </td>
                  </tr>
                ) : filtered.map(tx => (
                  <tr key={tx.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${tx.is_reviewed ? '' : 'bg-amber-50/30'}`}>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{tx.date}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 truncate max-w-[200px]">{tx.description}</p>
                      {tx.notes && <p className="text-xs text-slate-400 truncate max-w-[200px]">{tx.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${CATEGORY_COLORS[tx.category] || 'bg-gray-100 text-gray-600'}`}>
                        {(tx.category || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {tx.related_work_order_number && <span className="block">WO#{tx.related_work_order_number}</span>}
                      {tx.related_customer_name && <span className="block">{tx.related_customer_name}</span>}
                      {!tx.related_work_order_number && !tx.related_customer_name && '—'}
                    </td>
                    <td className="px-4 py-3 font-bold whitespace-nowrap">
                      <span className={tx.type === 'income' ? 'text-green-600' : 'text-red-500'}>
                        {tx.type === 'income' ? '+' : '-'}${(tx.amount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleReviewed(tx)} className="flex items-center gap-1">
                        <CheckCircle2 className={`w-4 h-4 ${tx.is_reviewed ? 'text-green-500' : 'text-slate-200'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditTx(tx)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteTx(tx.id)} className="p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Connect Account Modal */}
      <Dialog open={showAccountForm} onOpenChange={setShowAccountForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Connect Bank Account</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Bank Name</Label>
              <Input placeholder="e.g. Chase, Bank of America" value={accountForm.bank_name} onChange={e => setAccountForm({ ...accountForm, bank_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Account Name</Label>
              <Input placeholder="e.g. Business Checking" value={accountForm.account_name} onChange={e => setAccountForm({ ...accountForm, account_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Account Type</Label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                  value={accountForm.account_type} onChange={e => setAccountForm({ ...accountForm, account_type: e.target.value })}>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Last 4 Digits</Label>
                <Input placeholder="e.g. 4821" maxLength={4} value={accountForm.account_number_last4} onChange={e => setAccountForm({ ...accountForm, account_number_last4: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Current Balance ($)</Label>
              <Input type="number" placeholder="0.00" value={accountForm.current_balance} onChange={e => setAccountForm({ ...accountForm, current_balance: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAccountForm(false)}>Cancel</Button>
              <Button onClick={saveAccount} disabled={!accountForm.bank_name}>Connect Account</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Modal */}
      <Dialog open={showTxForm} onOpenChange={setShowTxForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingTx ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                  value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Transaction description" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount ($)</Label>
                <Input type="number" placeholder="0.00" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                  value={txForm.category} onChange={e => setTxForm({ ...txForm, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Link to Work Order</Label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                  value={txForm.related_work_order_id} onChange={e => setTxForm({ ...txForm, related_work_order_id: e.target.value })}>
                  <option value="">None</option>
                  {workOrders.map(wo => <option key={wo.id} value={wo.id}>WO#{wo.work_order_number} — {wo.client_name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Link to Customer</Label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                  value={txForm.related_customer_id} onChange={e => setTxForm({ ...txForm, related_customer_id: e.target.value })}>
                  <option value="">None</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.display_name || `${c.first_name} ${c.last_name}`}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes" value={txForm.notes} onChange={e => setTxForm({ ...txForm, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowTxForm(false)}>Cancel</Button>
              <Button onClick={saveTx} disabled={!txForm.description || !txForm.amount || !txForm.date}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}