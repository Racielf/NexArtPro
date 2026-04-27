import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, UserPlus, RefreshCw, Power, Users, Copy, KeyRound } from 'lucide-react';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsRow from '@/components/settings/SettingsRow';
import { Button } from '@/components/ui/button';
import {
  createRegistrationInvite,
  getPendingRegistrationCode,
  getUsers,
  isPendingRegistrationUser,
  toggleUserActive,
} from '@/lib/userStore';
import { isAdmin, normalizeLocalRole } from '@/lib/roleUtils';

const ROLE_OPTIONS = [
  {
    value: 'admin',
    label: 'Owner / Admin',
    description: 'Full access. Can manage company settings, users, security and all modules.',
  },
  {
    value: 'office_agent',
    label: 'Office Agent',
    description: 'Office operations access. Can manage customers, estimates, work orders, invoices and collections.',
  },
  {
    value: 'field_agent',
    label: 'Field Agent',
    description: 'Field access only. Can see assigned work orders and record job execution evidence.',
  },
];

function getRoleLabel(role) {
  const normalized = normalizeLocalRole(role);
  return ROLE_OPTIONS.find(r => r.value === normalized)?.label || role || 'Unknown';
}

function getRoleDescription(role) {
  const normalized = normalizeLocalRole(role);
  return ROLE_OPTIONS.find(r => r.value === normalized)?.description || '';
}

export default function TeamAccessPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastGeneratedCode, setLastGeneratedCode] = useState('');
  const [form, setForm] = useState({
    display_name: '',
    role: 'office_agent',
  });

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

  const copyCode = async (code) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Registration code copied');
    } catch {
      toast.error('Could not copy code');
    }
  };

  const handleGenerateInvite = async (e) => {
    e.preventDefault();

    if (!canManageUsers) {
      toast.error('Only Owner / Admin can manage access');
      return;
    }

    const display_name = form.display_name.trim();
    const role = normalizeLocalRole(form.role);

    if (!display_name || !role) {
      toast.error('Display name and role are required');
      return;
    }

    setSaving(true);
    const result = await createRegistrationInvite({ display_name, role });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error || 'Could not generate registration code');
      return;
    }

    setLastGeneratedCode(result.code);
    toast.success('Registration code generated');
    setForm({ display_name: '', role: 'office_agent' });
    await loadUsers();
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

  return (
    <SettingsSection
      title="Team & Access"
      description="Create and control who can enter the system: owner/admin, office staff and field workers."
    >
      <SettingsCard title="Access Model">
        <div className="grid gap-3 md:grid-cols-3">
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

      <SettingsCard title="Generate Registration Code">
        {!canManageUsers && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Only the Owner / Admin account can create, disable or manage team access.
          </div>
        )}

        <form onSubmit={handleGenerateInvite} className="space-y-4">
          <SettingsRow label="Team member name" description="Name shown internally before the person activates their account">
            <input
              className="h-9 border border-input rounded-md px-3 text-sm w-full max-w-sm bg-background disabled:bg-slate-50 disabled:text-slate-400"
              value={form.display_name}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              placeholder="e.g. Maria Office or Juan Field"
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

          {lastGeneratedCode && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">Registration Code</p>
                <p className="font-mono text-lg font-bold text-emerald-900 tracking-wider">{lastGeneratedCode}</p>
                <p className="text-xs text-emerald-700 mt-1">Give this code to the team member. They will activate their own username and password from Team Access.</p>
              </div>
              <Button type="button" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 gap-1.5" onClick={() => copyCode(lastGeneratedCode)}>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </Button>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={!canManageUsers || saving} className="gap-2">
              <KeyRound className="w-4 h-4" />
              {saving ? 'Generating…' : 'Generate Code'}
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

        {users.length === 0 && !loading ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
            No team access records found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
            {users.map(user => {
              const pending = isPendingRegistrationUser(user);
              const pendingCode = getPendingRegistrationCode(user);
              return (
                <div key={user.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-white">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {user.display_name || user.username}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pending ? 'bg-amber-50 text-amber-700 border-amber-200' : user.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {pending ? 'PENDING REGISTRATION' : user.active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{pending ? 'Waiting for user activation' : user.username}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {getRoleLabel(user.role)} — {getRoleDescription(user.role)}
                    </p>
                    {pendingCode && (
                      <button
                        type="button"
                        onClick={() => copyCode(pendingCode)}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-mono text-amber-700 hover:underline"
                      >
                        <Copy className="w-3 h-3" />
                        {pendingCode}
                      </button>
                    )}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canManageUsers || pending}
                    onClick={() => handleToggleActive(user)}
                    className={user.active ? 'border-red-200 text-red-600 hover:bg-red-50 gap-1.5' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {user.active ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </SettingsCard>
    </SettingsSection>
  );
}
