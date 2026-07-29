import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, UserPlus, RefreshCw, Power, Users, KeyRound } from 'lucide-react';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsRow from '@/components/settings/SettingsRow';
import { Button } from '@/components/ui/button';
import { getUsers, toggleUserActive } from '@/lib/userStore';
import { isAdmin, normalizeLocalRole } from '@/lib/roleUtils';
import { nexartClient } from '@/api/nexartClient';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Owner / Admin', description: 'Full access. Can manage company settings, users, security and all modules.' },
  { value: 'agent', label: 'Team Agent', description: 'Full operational access (Dashboard, Work Orders, Invoices, etc.) except Settings. Can be given a Quick PIN for fast sign-in.' },
];

function getRoleLabel(role) {
  return ROLE_OPTIONS.find(r => r.value === role)?.label
    || (normalizeLocalRole(role) === 'admin' ? 'Owner / Admin' : role || 'Unknown');
}

function getRoleDescription(role) {
  return ROLE_OPTIONS.find(r => r.value === role)?.description || '';
}

function functionErrorMessage(err, fallback) {
  return err?.data?.error || err?.message || fallback;
}

export default function TeamAccessPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ display_name: '', email: '', role: 'agent' });
  const [settingPinFor, setSettingPinFor] = useState(null);
  const [revealedPins, setRevealedPins] = useState({});

  const canManageUsers = isAdmin();

  const loadUsers = async () => {
    setLoading(true);
    const data = await getUsers();
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();

    if (!canManageUsers) {
      toast.error('Only Owner / Admin can manage access');
      return;
    }

    const display_name = form.display_name.trim();
    const email = form.email.trim().toLowerCase();
    const role = form.role;

    if (!display_name || !email) {
      toast.error('Display name and email are required');
      return;
    }

    setSaving(true);
    try {
      await nexartClient.functions.invoke('create-team-account', { email, display_name, role });
      toast.success(`${display_name} added. Set their PIN below to authorize them.`);
      setForm({ display_name: '', email: '', role: 'agent' });
      await loadUsers();
    } catch (err) {
      toast.error(functionErrorMessage(err, 'Could not create account'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    if (!canManageUsers) {
      toast.error('Only Owner / Admin can manage access');
      return;
    }
    const ok = await toggleUserActive(user.id);
    if (!ok) {
      toast.error('Could not update access');
      return;
    }
    toast.success(user.active ? 'Access disabled' : 'Access enabled');
    await loadUsers();
  };

  const handleGeneratePin = async (user) => {
    setSettingPinFor(user.id);
    try {
      const { data } = await nexartClient.functions.invoke('set-pin', { username: user.username });
      setRevealedPins(prev => ({ ...prev, [user.id]: data.pin }));
      toast.success(`New PIN generated for ${user.display_name || user.username}`);
    } catch (err) {
      toast.error(functionErrorMessage(err, 'Could not generate PIN'));
    } finally {
      setSettingPinFor(null);
    }
  };

  return (
    <SettingsSection
      title="Team & Access"
      description="Invite team members and control who can enter the system."
    >
      <SettingsCard title="Access Model">
        <div className="grid gap-3 md:grid-cols-2">
          {ROLE_OPTIONS.map(role => (
            <div key={role.value} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-bold text-slate-800">{role.label}</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">{role.description}</p>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Add Team Member">
        {!canManageUsers && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Only the Owner / Admin account can add or manage team access.
          </div>
        )}

        <form onSubmit={handleInvite} className="space-y-4">
          <SettingsRow label="Team member name" description="Shown internally">
            <input
              className="h-9 border border-input rounded-md px-3 text-sm w-full max-w-sm bg-background disabled:bg-slate-50 disabled:text-slate-400"
              value={form.display_name}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              placeholder="e.g. Maria Office or Juan Field"
              disabled={!canManageUsers || saving}
            />
          </SettingsRow>

          <SettingsRow label="Email" description="Their real email, used only to create the account -- no email is sent to them">
            <input
              type="email"
              className="h-9 border border-input rounded-md px-3 text-sm w-full max-w-sm bg-background disabled:bg-slate-50 disabled:text-slate-400"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="name@example.com"
              disabled={!canManageUsers || saving}
            />
          </SettingsRow>

          <SettingsRow label="Access role" description="Controls where this person can go after activation">
            <select
              className="h-9 border border-input rounded-md px-3 text-sm bg-background w-full max-w-sm disabled:bg-slate-50 disabled:text-slate-400"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              disabled={!canManageUsers || saving}
            >
              {ROLE_OPTIONS.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </SettingsRow>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={!canManageUsers || saving} className="gap-2">
              <UserPlus className="w-4 h-4" />
              {saving ? 'Adding…' : 'Add & Authorize'}
            </Button>
          </div>
        </form>
      </SettingsCard>

      <SettingsCard title="Team Access Status">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="w-4 h-4" />
            {loading ? 'Loading users…' : `${users.length} record${users.length === 1 ? '' : 's'}`}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={loadUsers} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          A generated PIN is shown once, right here — write it down or share it before leaving this page.
        </p>

        {users.length === 0 && !loading ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
            No team access records found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-white flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {user.display_name || user.username}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${user.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {user.active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{user.username}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {getRoleLabel(user.role)} — {getRoleDescription(user.role)}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {user.role === 'agent' && (
                    <div className="flex items-center gap-1.5">
                      {revealedPins[user.id] && (
                        <span className="font-mono text-sm font-bold tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md px-2 py-1.5">
                          {revealedPins[user.id]}
                        </span>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!canManageUsers || settingPinFor === user.id}
                        onClick={() => handleGeneratePin(user)}
                        className="gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        {settingPinFor === user.id ? 'Generating…' : revealedPins[user.id] ? 'Regenerate PIN' : 'Generate PIN'}
                      </Button>
                    </div>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canManageUsers}
                    onClick={() => handleToggleActive(user)}
                    className={user.active ? 'border-red-200 text-red-600 hover:bg-red-50 gap-1.5' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {user.active ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>
    </SettingsSection>
  );
}
